// af-mobile UI —— 数据飞轮 v2：通用 lint 采集 CLI（任意路径，零 LLM）
// 对任意文件/目录跑本仓 ESLint 配置，违规自动写入遥测（.af-mobile/telemetry.jsonl），
// 并打印按规则聚合的报告（含修正提示）。谁生成的代码无所谓——lint 即喂数据。
// 用法：
//   node scripts/lint-flywheel.mjs src/ test/ scripts/     # 采集 + 闸门（有 error/warn 则退出码 1）
//   node scripts/lint-flywheel.mjs page.html --source cli   # 指定来源（默认按 env.CI 判断）
//   node scripts/lint-flywheel.mjs src/ --record-clean      # 干净文件也记录（默认只记违规）
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCode, RULE_HINTS } from './ai-fix.mjs';
import { recordRun } from '../eval/telemetry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TMP_DIR = join(ROOT, '.cache/lint-flywheel');
const LINT_EXT = new Set(['.js', '.mjs', '.html']);

// 递归展开路径 → 待 lint 文件列表
function expandPaths(inputs) {
  const files = [];
  const walk = p => {
    const abs = resolve(p);
    if (!existsSync(abs)) { console.error(`⚠ 跳过不存在的路径：${p}`); return; }
    if (statSync(abs).isFile()) {
      if (LINT_EXT.has(extname(abs).toLowerCase())) files.push(abs);
      return;
    }
    for (const name of readdirSync(abs)) {
      if (name === 'node_modules' || name === 'dist' || name === '.cache') continue;
      walk(join(abs, name));
    }
  };
  for (const p of inputs) walk(p);
  return files;
}

// 采集入口（导出供测试）：lint 一批文件，记录遥测，返回 { byFile, exitCode }
export async function lintAndHarvest(inputs, opts = {}) {
  const files = expandPaths(inputs);
  if (files.length === 0) return { byFile: [], exitCode: 0, linted: 0 };

  // HTML 抽 script + 整体嵌入（与 ai-fix 同策略）；JS/MJS 直接读
  rmSync(TMP_DIR, { recursive: true, force: true });
  mkdirSync(TMP_DIR, { recursive: true });
  const snippets = files.map((f, i) => {
    const ext = extname(f).toLowerCase();
    const js = ext === '.html' ? extractCode(f).js : readFileSync(f, 'utf8');
    const snippetPath = join(TMP_DIR, `${i}.js`);
    writeFileSync(snippetPath, js || ' ');
    return { file: f, snippetPath };
  });

  const { ESLint } = await import('eslint');
  const engine = new ESLint({ cwd: ROOT });
  let results;
  try {
    results = await engine.lintFiles(snippets.map(s => s.snippetPath));
  } finally {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
  const bySnippet = new Map(results.map(r => [r.filePath, r]));

  const byFile = [];
  for (const s of snippets) {
    const r = bySnippet.get(s.snippetPath);
    const messages = (r?.messages || []).map(m => ({
      line: m.line,
      rule: m.ruleId || '(no-rule)',
      severity: m.severity === 2 ? 'error' : 'warn',
      message: m.message,
    }));
    byFile.push({ file: relative(ROOT, s.file), messages });
  }

  // 遥测：默认只记违规文件（防本地/CI 重复膨胀）；--record-clean 记全部
  const source = opts.source || (process.env.CI ? 'ci' : 'cli');
  for (const f of byFile) {
    if (f.messages.length === 0 && !opts.recordClean) continue;
    recordRun({ source, file: f.file, passed: f.messages.length === 0, violations: f.messages });
  }

  // 闸门语义与 `eslint --max-warnings 0` 一致：任何 error 或 warn 都失败
  const hasError = byFile.some(f => f.messages.some(m => m.severity === 'error'));
  const hasWarn = byFile.some(f => f.messages.some(m => m.severity === 'warn'));
  return { byFile, linted: files.length, exitCode: hasError || hasWarn ? 1 : 0 };
}

// 打印按规则聚合的报告（含修正提示）
export function printReport({ byFile, linted }) {
  const byRule = {};
  let errorCount = 0;
  let warnCount = 0;
  for (const f of byFile) {
    for (const m of f.messages) {
      byRule[m.rule] = byRule[m.rule] || { error: 0, warn: 0, files: new Set() };
      byRule[m.rule][m.severity]++;
      byRule[m.rule].files.add(f.file);
      if (m.severity === 'error') errorCount++; else warnCount++;
    }
  }
  console.error(`✓ lint ${linted} 个文件：${errorCount} error / ${warnCount} warn`);
  if (errorCount + warnCount > 0) {
    console.error('\n按规则聚合（含修正提示，已写入飞轮遥测）：');
    for (const [rule, s] of Object.entries(byRule).sort((a, b) => (b[1].error + b[1].warn) - (a[1].error + a[1].warn))) {
      console.error(`  ${rule}: ${s.error} error / ${s.warn} warn（${s.files.size} 文件）`);
      if (RULE_HINTS[rule]) console.error(`    → ${RULE_HINTS[rule]}`);
    }
  }
}

// CLI
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const inputs = [];
  let source = '';
  let recordClean = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source') source = args[++i];
    else if (args[i] === '--record-clean') recordClean = true;
    else inputs.push(args[i]);
  }
  if (inputs.length === 0) {
    console.error('Usage: lint-flywheel.mjs <file|dir>... [--source cli|ci|mcp] [--record-clean]');
    console.error('  lint 任意路径（谁生成的代码都行），违规自动写入 .af-mobile/telemetry.jsonl');
    process.exit(2);
  }
  const result = await lintAndHarvest(inputs, { source, recordClean });
  printReport(result);
  process.exit(result.exitCode);
}
