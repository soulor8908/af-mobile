// AIFlow UI —— 数据飞轮：从 eval 结果驱动 Prompt/白名单/禁令改进
// 解析 eval/results/raw-*.json 的 errorsByRule，当某规则失败率 > 阈值时产出"建议新增/放宽禁令"的 PR 草稿
// 用法：
//   node eval/flywheel.mjs eval/results/raw-*.json                  # 默认阈值 20%
//   node eval/flywheel.mjs eval/results/raw-*.json --threshold 30  # 自定义阈值
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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
  'aiflow/semantic-visual': {
    diagnosis: 'AI 生成的页面通过 lint 但未满足需求语义（DOM 断言失败）',
    actions: [
      '在 Prompt 中补充该需求类别的关键结构要求（如价格需含 ¥、弹层需可见）',
      '检查对应组件默认隐藏/默认状态是否导致断言误判',
      '评估断言是否过严（如积分场景不应套用金额语义断言）',
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

// 生成 PR 草稿
export function generatePrDraft(results, opts = {}) {
  const threshold = opts.threshold || 0.2; // 默认 20%
  const total = results.length;
  if (total === 0) return { hasFindings: false, reason: '无 eval 结果' };

  // 聚合每条规则的失败次数
  const ruleFails = {};
  for (const r of results) {
    for (const a of r.attempts) {
      for (const e of (a.lastErrors || [])) {
        ruleFails[e.rule] = (ruleFails[e.rule] || 0) + 1;
      }
    }
  }

  // 计算失败率，筛选超阈值的规则
  const findings = [];
  for (const [rule, count] of Object.entries(ruleFails)) {
    const rate = count / total;
    if (rate >= threshold) {
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

  // 按失败率降序
  findings.sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));

  if (findings.length === 0) {
    return { hasFindings: false, reason: `所有规则失败率均低于阈值 ${threshold * 100}%` };
  }

  // 生成 PR 草稿 markdown
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
    for (const a of f.actions) lines.push(`- ${a}`);
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

  return {
    hasFindings: true,
    findings,
    prDraft: lines.join('\n'),
  };
}

// CLI
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  let threshold = 0.2;
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--threshold') threshold = parseFloat(args[++i]) / 100;
    else files.push(args[i]);
  }
  if (files.length === 0) {
    console.error('Usage: flywheel.mjs <raw-results.json> [--threshold 30]');
    console.error('  解析 eval 结果，对失败率超阈值的规则产出改进 PR 草稿');
    process.exit(2);
  }

  // 合并多个 raw 文件的结果
  const allResults = [];
  for (const f of files) {
    const data = JSON.parse(readFileSync(f, 'utf8'));
    allResults.push(...data);
  }

  const report = generatePrDraft(allResults, { threshold });
  if (!report.hasFindings) {
    console.log('✓ ' + report.reason);
    process.exit(0);
  }

  console.log(report.prDraft);
  console.error(`\n✓ 发现 ${report.findings.length} 项超阈值规则`);
}
