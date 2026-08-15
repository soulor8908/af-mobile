// AIFlow UI —— 数据飞轮：综合改进建议生成器
// 消费 eval/results/raw-*.json + report-*.json，把失败分类为：
//   1. 管道问题（LLM 网络错误 / 评审解析失败 / 弹层默认关闭误判）→ 修复评审器
//   2. 真实缺陷（DOM 缺元素 / LLM 判定缺需求元素）→ 改进 Prompt / 组件
// 输出：PR 草稿 markdown + findings JSON
//
// 用法：
//   node eval/report.mjs <raw.json> <report.json> [-o docs/design/flywheel-report.md]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 管道性失败判定：LLM 网络/解析错误、或 false 但 DOM 全过的样本（多为弹层默认关闭）
function isPipelineFailure(v) {
  const reason = (v.llmReason || '').toLowerCase();
  if (v.llmPass === false && v.domPass === true) return true;             // DOM 全过但 LLM 判 fail → 评审误判/弹层
  if (reason.includes('fetch failed')) return true;                        // 网络
  if (reason.includes('无法解析') || reason.includes('评审失败')) return true; // 解析
  return false;
}

// 资源阻塞判定：LLM 上游余额不足（Insufficient Balance），非生成缺陷也非评审器问题
function isBalanceBlocker(v) {
  return (v.llmReason || '').toLowerCase().includes('insufficient balance');
}

export function generateReport(rawResults, report, opts = {}) {
  const visualFailures = report.visualFailures || [];
  const balance = visualFailures.filter(isBalanceBlocker);
  const rest = visualFailures.filter(v => !isBalanceBlocker(v));
  const pipe = rest.filter(isPipelineFailure);
  const real = rest.filter(v => !isPipelineFailure(v));
  const lintFails = report.lintFailures || [];

  const lines = [];
  lines.push('# [数据飞轮] Eval 基线报告 & 改进建议');
  lines.push('');
  lines.push(`> 生成时间：${new Date().toISOString()}`);
  lines.push(`> pass@${report.passK}：**lint ${report.lintPassRate}（${report.lintPassed}/${report.total}）** / **视觉 ${report.visualPassRate}（${report.visualPassed}/${report.total}）**`);
  lines.push(`> 平均修正轮数：${report.avgRounds}`);
  lines.push('');

  // 按类别
  lines.push('## 分类别 pass 率');
  lines.push('');
  lines.push('| 类别 | lint | 视觉 | 样本数 |');
  lines.push('|---|---|---|---|');
  for (const [cat, s] of Object.entries(report.byCategory || {}).sort()) {
    lines.push(`| ${cat} | ${s.lintPassed}/${s.total} | ${s.visualPassed}/${s.total} | ${s.total} |`);
  }
  lines.push('');

  lines.push('## 失败分类');
  lines.push('');
  lines.push(`- **管道问题**（评审器/网络，非生成缺陷）：${pipe.length} 条`);
  lines.push(`- **真实视觉缺陷**：${real.length} 条`);
  lines.push(`- **lint 失败**（多为瞬时网络错误）：${lintFails.length} 条`);
  if (balance.length) lines.push(`- **LLM 余额不足阻塞**（非代码问题，需充值后重跑）：${balance.length} 条`);
  lines.push('');

  if (pipe.length) {
    lines.push('### 管道问题（需修复评审器，非页面缺陷）');
    lines.push('');
    for (const v of pipe) {
      lines.push(`- **[${v.id}] ${v.category}** ${v.llmReason || ''}`);
    }
    lines.push('');
  }

  if (real.length) {
    lines.push('### 真实视觉缺陷（需改进 Prompt/组件）');
    lines.push('');
    for (const v of real) {
      lines.push(`- **[${v.id}] ${v.category}** ${v.llmReason || ('DOM 缺 ' + (v.missing || []).join(','))}`);
    }
    lines.push('');
  }

  if (balance.length) {
    lines.push('### LLM 余额不足（需充值 AIFLOW_AI_API_KEY 账户后重跑）');
    lines.push('');
    for (const v of balance) {
      lines.push(`- **[${v.id}] ${v.category}** ${v.llmReason || ''}`);
    }
    lines.push('');
  }

  if (lintFails.length) {
    lines.push('### lint 失败（exitCode 分析）');
    lines.push('');
    for (const f of lintFails) {
      lines.push(`- **[${f.id}] ${f.category}** exitCode=${f.exitCode}${f.errors?.length ? ' 规则=' + f.errors.map(e => e.rule).join(',') : ''}`);
    }
    lines.push('');
  }

  // 改进建议
  lines.push('## 建议的修改清单');
  lines.push('');
  if (balance.length) {
    lines.push('- [ ] 为 AIFLOW_AI_API_KEY 账户充值（Insufficient Balance），重跑完整视觉评审拿干净基线');
  }
  if (pipe.length) {
    lines.push('- [ ] 修复视觉评审器：弹层类组件（af-dialog/af-action-sheet）默认关闭，评审时应先触发打开或豁免');
    lines.push('- [ ] 增强评审容错：LLM 返回非 JSON 时重试一次；网络错误自动重试');
  }
  const realIds = new Set(real.map(v => v.id));
  if (realIds.has('029')) lines.push('- [ ] Prompt 补强"帮助中心"模式：搜索框 + 手风琴问题列表 + 联系客服按钮的完整结构');
  if (realIds.has('055')) lines.push('- [ ] Prompt 补强"筛选排序面板"：af-action-sheet 承载排序选项 + 筛选入口');
  if (realIds.has('050')) lines.push('- [ ] 评审器对 af-swiper 等动态组件：验证元素存在即可，不要求动态行为可视化');
  if (realIds.size === 0) lines.push('- [ ] 无真实缺陷，可考虑进入 Block 复活评估');
  lines.push('');

  return {
    hasFindings: pipe.length + real.length + lintFails.length + balance.length > 0,
    pipeline: pipe, real, lintFails, balance,
    prDraft: lines.join('\n'),
  };
}

// CLI
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const rawPath = args[0];
  const reportPath = args[1];
  let out = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-o') out = args[++i];
  }
  if (!rawPath || !reportPath) {
    console.error('Usage: report.mjs <raw.json> <report.json> [-o out.md]');
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(rawPath, 'utf8'));
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const res = generateReport(raw, report);
  if (out) {
    writeFileSync(out, res.prDraft);
    console.error('✓ 报告 → ' + out);
  } else {
    console.log(res.prDraft);
  }
}