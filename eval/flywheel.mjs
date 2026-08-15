// AIFlow UI —— 数据飞轮 v2：从多源违规数据驱动 Prompt/白名单/禁令改进
// 数据源（全部零 LLM 依赖）：
//   .aiflow/telemetry.jsonl —— MCP / CLI / CI / 真实使用（eval/telemetry.mjs 统一 schema）
//   eval/results/raw-*.json —— 合成 eval（可选，需自有 LLM，权重最低）
// 用法：
//   node eval/flywheel.mjs                                  # 分析本地遥测 + 全部 raw-*.json
//   node eval/flywheel.mjs --since 30d                      # 只看近 30 天
//   node eval/flywheel.mjs --threshold 30 --out report.md   # 自定义阈值 + 落盘报告
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTelemetry, SOURCE_WEIGHTS } from './telemetry.mjs';
import { RULE_HINTS } from '../scripts/ai-fix.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS_DIR = join(ROOT, 'eval/results');

// 规则 → 改进建议映射（驱动 Prompt/白名单/禁令调整）
const RULE_SUGGESTIONS = {
  'aiflow/token-whitelist': {
    diagnosis: 'AI 频繁使用白名单外的 class',
    actions: [
      '检查是否高频合理的 class 缺失（考虑加入白名单或 recipes.project.css 扩展）',
      '在 Prompt 高频反例区追加该 class 的正确替代示例',
      '若该 class 是通用语义（如 .container/.wrapper），评估是否应升级为 L2 配方',
    ],
  },
  'aiflow/no-inline-style': {
    diagnosis: 'AI 仍习惯性写内联 style',
    actions: [
      '在 Prompt 高频反例区强化"禁止内联 style"示例',
      '检查是否缺少对应原子类的映射（如某个常用 padding 值无对应 p-* 档位）',
      '考虑在 ai-fix.mjs 的 RULE_HINTS 补充更具体的映射建议',
    ],
  },
  'aiflow/no-recipe-break': {
    diagnosis: 'AI 不理解配方组合约束',
    actions: [
      '在 Prompt 禁令 #4/#5/#6 区补充更详细的"为何不能叠加"原因',
      '考虑是否该配方组合约束过于严格（评估放宽可能性）',
    ],
  },
  'aiflow/wc-aria-required': {
    diagnosis: 'AI 生成的组件缺少 ARIA 属性',
    actions: [
      '在 Prompt 组件简表区补充每个组件的必需 ARIA 属性',
      '检查 aria-requirements.json 是否过于严格',
    ],
  },
  'aiflow/wc-event-naming': {
    diagnosis: 'AI 事件命名不规范',
    actions: [
      '在 Prompt 组件简表区强化"事件名必须 af-{组件}:{动作}"规则',
      '考虑该规则的自动修复能力是否覆盖了 AI 常犯的命名模式',
    ],
  },
  'aiflow/no-tailwind-syntax': {
    diagnosis: 'AI 习惯性使用 Tailwind 语法',
    actions: [
      '在 Prompt 高频反例区追加 Tailwind 语法的正确替代示例',
      '强化"本系统非 Tailwind"的角色定位说明',
    ],
  },
  'aiflow/no-arbitrary-value': {
    diagnosis: 'AI 使用任意值或越界档位',
    actions: [
      '在 Prompt 白名单区强化"p 仅允许 0/1/2/3/4/5/6/8/10"等档位说明',
      '检查档位是否覆盖了 AI 常用的值（考虑新增档位）',
    ],
  },
  'aiflow/no-variant-conflict': {
    diagnosis: 'AI 叠加互斥变体',
    actions: [
      '在 Prompt 高频反例区追加互斥变体示例',
      '该规则可自动修复，确认 ai-fix 的 --fix 是否生效',
    ],
  },
};

// 默认 fallback 建议
const DEFAULT_SUGGESTION = {
  diagnosis: '该规则触发率偏高',
  actions: [
    '在 Prompt 中强化该规则的说明与示例',
    '评估该规则是否过于严格（考虑放宽或加例外）',
    '检查 ai-fix.mjs 的 RULE_HINTS 是否有该规则的具体修正建议',
  ],
};

// ===== 数据摄取 =====

// 旧版合成 eval 结果（raw-*.json）→ 统一事件 schema（source=eval, tool=self-llm）
export function legacyRawToEvents(results) {
  const events = [];
  for (const r of results) {
    for (const a of r.attempts || []) {
      events.push({
        v: 1,
        ts: new Date().toISOString(),
        source: 'eval',
        tool: 'self-llm',
        file: `eval:${r.id}`,
        passed: a.ok,
        violations: (a.lastErrors || []).map(e => ({
          rule: e.rule, severity: 'error', line: e.line || 0, message: e.message || '',
        })),
      });
    }
  }
  return events;
}

// 解析 "30d" / "12h" / ISO 时间串 → 时间戳
export function parseSince(since) {
  if (!since) return 0;
  const m = since.match(/^(\d+)([dh])$/);
  if (m) {
    const ms = m[2] === 'd' ? 86400000 : 3600000;
    return Date.now() - Number(m[1]) * ms;
  }
  const t = Date.parse(since);
  return Number.isNaN(t) ? 0 : t;
}

// 加载全部事件：本地遥测 + 指定 raw 文件（缺省自动扫 eval/results/raw-*.json）
export function loadEvents(rawFiles) {
  const events = readTelemetry();
  let files = rawFiles;
  if (!files || files.length === 0) {
    files = existsSync(RESULTS_DIR)
      ? readdirSync(RESULTS_DIR).filter(f => f.startsWith('raw-') && f.endsWith('.json')).map(f => join(RESULTS_DIR, f))
      : [];
  }
  for (const f of files) {
    let data;
    try { data = JSON.parse(readFileSync(f, 'utf8')); } catch { console.error(`⚠ 跳过解析失败的 raw 文件：${f}`); continue; }
    events.push(...legacyRawToEvents(data));
  }
  return events;
}

// ===== 挖掘器：从违规消息提取结构化信号 =====

// token-whitelist: "Class 'x' not in whitelist..." / "Component 'x' not in whitelist..."
export function mineWhitelistCandidates(events) {
  const classes = {};
  const components = {};
  for (const ev of events) {
    for (const v of ev.violations || []) {
      let m = v.message.match(/^Class '([\w-]+)' not in whitelist/);
      if (m) { classes[m[1]] = (classes[m[1]] || 0) + 1; continue; }
      m = v.message.match(/^Component '([\w-]+)' not in whitelist/);
      if (m) components[m[1]] = (components[m[1]] || 0) + 1;
    }
  }
  const rank = obj => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  return { classes: rank(classes), components: rank(components) };
}

// no-arbitrary-value: "'p-[13px]' arbitrary value..." / "'p-7' out of range..."
export function mineArbitraryValues(events) {
  const vals = {};
  for (const ev of events) {
    for (const v of ev.violations || []) {
      if (v.rule !== 'aiflow/no-arbitrary-value') continue;
      const m = v.message.match(/^'([\w-]+(?:\[[^\]]*\])?)'/);
      if (m) vals[m[1]] = (vals[m[1]] || 0) + 1;
    }
  }
  return Object.entries(vals).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}

// ===== 分析主入口 =====
// 输出：{ total, perRule, whitelistCandidates, arbitraryValues, hintsGap, fixableCoverage, convergence }
export async function analyze(events, opts = {}) {
  const sinceTs = parseSince(opts.since);
  const filtered = sinceTs ? events.filter(e => Date.parse(e.ts) >= sinceTs) : events;

  // 按 规则 × 来源 × 工具 聚合（加权：真实使用 > 合成 eval）
  const perRule = {};
  for (const ev of filtered) {
    const weight = SOURCE_WEIGHTS[ev.source] || 1;
    for (const v of ev.violations || []) {
      const r = perRule[v.rule] = perRule[v.rule] || { rule: v.rule, count: 0, weighted: 0, bySource: {}, byTool: {}, recent: 0, before: 0 };
      r.count++;
      r.weighted += weight;
      r.bySource[ev.source] = (r.bySource[ev.source] || 0) + 1;
      r.byTool[ev.tool] = (r.byTool[ev.tool] || 0) + 1;
      if (sinceTs && Date.parse(ev.ts) >= sinceTs) r.recent++;
      else if (sinceTs) r.before++;
    }
  }
  const perRuleList = Object.values(perRule).sort((a, b) => b.weighted - a.weighted);

  // 收敛度：source=mcp 按 tool 分组的 passed 比率（hints 有效则上升）
  const convergence = {};
  for (const ev of filtered) {
    if (ev.source !== 'mcp') continue;
    const c = convergence[ev.tool] = convergence[ev.tool] || { runs: 0, passed: 0 };
    c.runs++;
    if (ev.passed) c.passed++;
  }

  // RULE_HINTS 缺口：高频触发（≥3 次）但无修正提示
  const hintsGap = perRuleList.filter(r => r.count >= 3 && !RULE_HINTS[r.rule]).map(r => r.rule);

  // 可自动修复覆盖率：高频规则是否有 fixable 实现（→ 是投资 autofix，否投资 prompt）
  let fixableCoverage = [];
  try {
    const { default: plugin } = await import('../eslint-plugin-aiflow/index.js');
    fixableCoverage = perRuleList.slice(0, 10).map(r => {
      const short = r.rule.replace(/^aiflow\//, '');
      const rule = plugin.rules[short];
      return { rule: r.rule, count: r.count, fixable: Boolean(rule?.meta?.fixable) };
    });
  } catch { /* 插件加载失败时跳过该维度 */ }

  return {
    total: filtered.length,
    perRule: perRuleList,
    whitelistCandidates: mineWhitelistCandidates(filtered),
    arbitraryValues: mineArbitraryValues(filtered),
    hintsGap,
    fixableCoverage,
    convergence,
  };
}

// ===== 报告渲染（markdown，保持 v1 PR 草稿风格并扩展）=====

export function renderReport(a, opts = {}) {
  const threshold = opts.threshold || 0.2;
  const lines = [];
  lines.push('# [数据飞轮 v2] 多源违规分析 & 改进建议');
  lines.push('');
  lines.push(`> 事件数：${a.total}${opts.since ? `（近 ${opts.since}）` : ''}；来源权重：mcp×3 / cli×2 / ci×2 / eval×1`);
  lines.push(`> 生成时间：${new Date().toISOString()}`);
  lines.push('');

  if (a.perRule.length === 0) {
    lines.push('✓ 无违规记录——飞轮暂无输入。跑 `npm run lint:flywheel <paths>` 或通过 MCP `check_compliance` 喂数据。');
    return lines.join('\n');
  }

  lines.push('## 规则榜（按加权分降序）');
  lines.push('');
  lines.push('| 规则 | 次数 | 加权 | 来源分布 | 工具分布 |');
  lines.push('|---|---|---|---|---|');
  for (const r of a.perRule.slice(0, 15)) {
    lines.push(`| ${r.rule} | ${r.count} | ${r.weighted} | ${JSON.stringify(r.bySource)} | ${JSON.stringify(r.byTool)} |`);
  }
  lines.push('');

  // 白名单候选
  const wc = a.whitelistCandidates;
  if (wc.classes.length || wc.components.length) {
    lines.push('## 白名单候选（token-whitelist 挖掘）');
    lines.push('');
    for (const c of wc.classes.slice(0, 10)) {
      lines.push(`- class \`.${c.name}\`：${c.count} 次 → 进白名单 / 升级 L2 配方 / 改 data-* 三选一`);
    }
    for (const c of wc.components.slice(0, 10)) {
      lines.push(`- 组件 \`<${c.name}>\`：${c.count} 次 → 确认是否漏登记或应成为新组件`);
    }
    lines.push('');
  }

  // 档位缺口
  if (a.arbitraryValues.length) {
    lines.push('## 原子档位缺口（no-arbitrary-value 挖掘）');
    lines.push('');
    for (const v of a.arbitraryValues.slice(0, 10)) {
      lines.push(`- \`${v.name}\`：${v.count} 次 → 评估新增档位或在 Prompt 强化最近档位映射`);
    }
    lines.push('');
  }

  // hints 缺口
  if (a.hintsGap.length) {
    lines.push('## RULE_HINTS 缺口（高频但无修正提示）');
    lines.push('');
    for (const r of a.hintsGap) lines.push(`- [ ] 为 \`${r}\` 补充 ai-fix.mjs RULE_HINTS`);
    lines.push('');
  }

  // 可修复覆盖
  if (a.fixableCoverage.length) {
    lines.push('## 自动修复覆盖（Top 规则）');
    lines.push('');
    for (const f of a.fixableCoverage) {
      lines.push(`- ${f.rule}（${f.count} 次）：${f.fixable ? '✅ 可 autofix → 确认 ai-fix --fix 生效' : '❌ 不可 autofix → 投资 Prompt 反例'}`);
    }
    lines.push('');
  }

  // 收敛度
  const convEntries = Object.entries(a.convergence);
  if (convEntries.length) {
    lines.push('## 收敛度（MCP 真实使用，passed 比率）');
    lines.push('');
    for (const [tool, c] of convEntries) {
      const pct = c.runs ? (c.passed / c.runs * 100).toFixed(1) : '0';
      lines.push(`- ${tool}：${c.passed}/${c.runs}（${pct}%）${pct === '100.0' ? '' : ' → 比率低说明提示未命中，检查 RULE_HINTS/Prompt'}`);
    }
    lines.push('');
  }

  // PR 草稿（v1 兼容输出：超阈值规则的诊断与行动清单）
  const total = Math.max(a.total, 1);
  const findings = a.perRule.filter(r => r.count / total > threshold);
  if (findings.length) {
    lines.push(`## 建议的修改清单（阈值 ${threshold * 100}%）`);
    lines.push('');
    for (const f of findings) {
      const sug = RULE_SUGGESTIONS[f.rule] || DEFAULT_SUGGESTION;
      lines.push(`### ${f.rule} — ${f.count}/${total}（加权 ${f.weighted}）`);
      lines.push('');
      lines.push(`**诊断**：${sug.diagnosis}`);
      lines.push('');
      for (const act of sug.actions) lines.push(`- [ ] ${act}`);
      lines.push('');
    }
  } else {
    lines.push(`✓ 所有规则触发率均低于阈值 ${threshold * 100}%`);
  }

  lines.push('---');
  lines.push('> 本草稿由 eval/flywheel.mjs 自动生成，请人工 review 后实施。');
  return lines.join('\n');
}

// v1 兼容：旧 API 保留（直接从合成 eval 结果生成 PR 草稿）
export function generatePrDraft(results, opts = {}) {
  const threshold = opts.threshold || 0.2;
  const total = results.length;
  if (total === 0) return { hasFindings: false, reason: '无 eval 结果' };

  const ruleFails = {};
  for (const r of results) {
    for (const a of r.attempts) {
      for (const e of (a.lastErrors || [])) {
        ruleFails[e.rule] = (ruleFails[e.rule] || 0) + 1;
      }
    }
  }

  const findings = [];
  for (const [rule, count] of Object.entries(ruleFails)) {
    const rate = count / total;
    if (rate > threshold) {
      const sug = RULE_SUGGESTIONS[rule] || DEFAULT_SUGGESTION;
      findings.push({
        rule,
        count,
        rate: (rate * 100).toFixed(1) + '%',
        threshold: (threshold * 100).toFixed(0) + '%',
        diagnosis: sug.diagnosis,
        actions: sug.actions,
      });
    }
  }
  findings.sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));

  if (findings.length === 0) {
    return { hasFindings: false, reason: `所有规则失败率均低于阈值 ${threshold * 100}%` };
  }

  const lines = [];
  lines.push('# [数据飞轮] 基于 eval 结果的 Prompt/规则改进建议');
  lines.push('');
  lines.push(`> 数据来源：${total} 条 eval 样本，阈值 ${threshold * 100}%`);
  lines.push(`> 生成时间：${new Date().toISOString()}`);
  lines.push('');
  lines.push('## 发现（按失败率降序）');
  lines.push('');
  for (const f of findings) {
    lines.push(`### ${f.rule} — 失败率 ${f.rate}（${f.count}/${total}，阈值 ${f.threshold}）`);
    lines.push('');
    lines.push(`**诊断**：${f.diagnosis}`);
    lines.push('');
    lines.push('**建议行动**：');
    for (const act of f.actions) lines.push(`- ${act}`);
    lines.push('');
  }
  lines.push('## 建议的修改清单');
  lines.push('');
  for (const f of findings) {
    lines.push(`- [ ] ${f.rule}：${f.actions[0]}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('> 本草稿由 eval/flywheel.mjs 自动生成，请人工 review 后实施。');

  return { hasFindings: true, findings, prDraft: lines.join('\n') };
}

// CLI
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  let threshold = 0.2;
  let since = '';
  let out = '';
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--threshold') threshold = parseFloat(args[++i]) / 100;
    else if (args[i] === '--since') since = args[++i];
    else if (args[i] === '--out') out = args[++i];
    else files.push(args[i]);
  }

  const events = loadEvents(files);
  if (events.length === 0) {
    console.log('✓ 飞轮暂无数据。喂数据方式：');
    console.log('  1. node scripts/lint-flywheel.mjs <任意路径>   # CLI/CI 采集');
    console.log('  2. MCP check_compliance / fix_code             # Agent 真实使用（TRAE/Claude/Cursor）');
    console.log('  3. AIFLOW_AI_API_URL=... npm run eval          # 合成 eval（可选）');
    process.exit(0);
  }

  const analysis = await analyze(events, { since });
  const report = renderReport(analysis, { threshold, since });
  if (out) {
    writeFileSync(out, report);
    console.error(`✓ 报告 → ${out}`);
  } else {
    console.log(report);
  }
  console.error(`\n✓ 分析 ${analysis.total} 个事件，Top 规则：${analysis.perRule[0]?.rule || '无'}`);
}
