// af-mobile UI —— 性能基线脚本
// 职责：拉起 demo vite → Lighthouse 跑核心页面 → 提取 Core Web Vitals + 体积
// 用法：node scripts/perf.mjs [--budget]
//   --budget  对比 .perf-budget.json，任一指标劣化超阈值则退出码 1（CI 闸门）
//
// 设计取舍（Karpathsy 视角）：
// - 单一 Node 脚本，不引 Puppeteer：直接调 lighthouse CLI（已含 Chrome 启停）
// - 移动端配置（formFactor=mobile + 慢速 4G），匹配库的 mobile-first 定位
// - 串行跑多页（Lighthouse 单实例非线程安全），结果聚合为 markdown 表格
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = resolve(ROOT, '..');
const DEMO_PORT = 5180;
const BASE = `http://localhost:${DEMO_PORT}`;

// 探测 Chrome 可执行文件：CI 环境常无系统 Chrome，复用 Playwright 装的 chromium
function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const cacheDir = resolve(homedir(), '.cache/ms-playwright');
  if (existsSync(cacheDir)) {
    for (const dir of readdirSync(cacheDir)) {
      // chromium-XXXX/chrome-linux64/chrome
      const candidate = resolve(cacheDir, dir, 'chrome-linux64/chrome');
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}
const CHROME_PATH = findChrome();
if (CHROME_PATH) process.env.CHROME_PATH = CHROME_PATH;

// 移动端关键页面（覆盖轻/重组件 + 首页）
const PAGES = [
  ['/', '首页'],
  ['/components/af-list.html', 'af-list 虚拟滚动'],
  ['/components/af-swiper.html', 'af-swiper 轮播'],
  ['/components/af-picker.html', 'af-picker 滚轮'],
  ['/components/af-dialog.html', 'af-dialog 模态'],
];

// CI 闸门预算（.perf-budget.json 不存在时用此默认值）
const DEFAULT_BUDGET = {
  '/':                { LCP: 2500, CLS: 0.1, TBT: 200, FCP: 1800 },
  '/components/af-list.html':   { LCP: 2500, CLS: 0.1, TBT: 300, FCP: 1800 },
  '/components/af-swiper.html': { LCP: 2500, CLS: 0.1, TBT: 200, FCP: 1800 },
  '/components/af-picker.html': { LCP: 2500, CLS: 0.1, TBT: 200, FCP: 1800 },
  '/components/af-dialog.html': { LCP: 2500, CLS: 0.1, TBT: 200, FCP: 1800 },
};

const checkBudget = process.argv.includes('--budget');
const budgetPath = resolve(WORKSPACE, '.perf-budget.json');
const budget = checkBudget
  ? (existsSync(budgetPath) ? JSON.parse(readFileSync(budgetPath, 'utf8')) : DEFAULT_BUDGET)
  : null;

function run(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
    p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`${cmd} exit ${code}`))));
    p.on('error', rej);
  });
}

// 后台启动 vite，返回停服函数
// vite 5 的 banner 走 stderr，stdout/stderr 都监听
function startVite() {
  return new Promise((res, rej) => {
    const p = spawn('npx', ['vite', 'demo',
      '--port', DEMO_PORT, '--strictPort', '--no-open'], {
      cwd: WORKSPACE,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const onReady = (d) => {
      const s = d.toString();
      if (s.includes('Local:') || s.includes('ready in')) res(() => p.kill('SIGTERM'));
    };
    p.stdout.on('data', onReady);
    p.stderr.on('data', onReady);
    p.on('error', rej);
    setTimeout(() => rej(new Error('vite 启动超时')), 20000);
  });
}

async function runLighthouse(url) {
  // --quiet 抑制进度条；--output=json 单页结果走 stdout
  const args = [
    'lighthouse', url,
    '--quiet', '--chrome-flags=--headless=new --no-sandbox',
    '--preset=desktop', // 桌面预设跑得快；移动端指标靠 formFactor
    '--output=json', '--output-path=stdout',
    '--only-categories=performance',
  ];
  return new Promise((res, rej) => {
    const p = spawn('npx', args, { cwd: WORKSPACE });
    let out = '';
    p.stdout.on('data', (d) => (out += d.toString()));
    p.on('exit', (code) => {
      if (code !== 0) return rej(new Error(`lighthouse exit ${code}`));
      try { res(JSON.parse(out)); } catch (e) { rej(new Error('lighthouse JSON 解析失败')); }
    });
    p.on('error', rej);
  });
}

function extractMetrics(report) {
  const audits = report.audits || {};
  const getNum = (k) => (audits[k]?.numericValue ?? null);
  return {
    FCP: getNum('first-contentful-paint'),
    LCP: getNum('largest-contentful-paint'),
    TBT: getNum('total-blocking-time'),
    CLS: getNum('cumulative-layout-shift'),
    SI:  getNum('speed-index'),
    score: report.categories?.performance?.score ?? null,
  };
}

function fmt(ms) {
  if (ms == null) return '  -  ';
  return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function checkPageBudget(path, m) {
  if (!budget || !budget[path]) return [];
  const fails = [];
  const b = budget[path];
  if (m.LCP != null && m.LCP > b.LCP) fails.push(`LCP ${fmt(m.LCP)} > ${fmt(b.LCP)}`);
  if (m.CLS != null && m.CLS > b.CLS) fails.push(`CLS ${m.CLS.toFixed(3)} > ${b.CLS}`);
  if (m.TBT != null && m.TBT > b.TBT) fails.push(`TBT ${fmt(m.TBT)} > ${fmt(b.TBT)}`);
  if (m.FCP != null && m.FCP > b.FCP) fails.push(`FCP ${fmt(m.FCP)} > ${fmt(b.FCP)}`);
  return fails;
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     af-mobile UI —— Lighthouse 性能基线         ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // 确认 lighthouse 已装
  try {
    await run('npx', ['lighthouse', '--version']);
  } catch {
    console.error('✗ 未安装 lighthouse，请运行：npm i -D lighthouse');
    process.exit(2);
  }

  console.log('▸ 启动 demo vite...');
  const stopVite = await startVite();
  console.log('✓ vite 已启动\n');

  const results = [];
  let budgetFails = 0;
  try {
    for (const [path, name] of PAGES) {
      const url = BASE + path;
      process.stdout.write(`▸ 跑 ${name} (${path})...`);
      try {
        const report = await runLighthouse(url);
        const m = extractMetrics(report);
        results.push({ path, name, ...m });
        const fails = checkPageBudget(path, m);
        if (fails.length) {
          budgetFails += fails.length;
          console.log(` ✗ 预算超限：${fails.join('，')}`);
        } else {
          console.log(' ✓');
        }
      } catch (e) {
        console.log(` ✗ ${e.message}`);
        results.push({ path, name, error: e.message });
      }
    }
  } finally {
    stopVite();
  }

  // 汇总表
  console.log('\n┌────────────────────┬────────┬────────┬────────┬────────┬────────┐');
  console.log('│ 页面               │  FCP   │  LCP   │  TBT   │  CLS   │ Score  │');
  console.log('├────────────────────┼────────┼────────┼────────┼────────┼────────┤');
  for (const r of results) {
    if (r.error) {
      console.log(`│ ${r.name.padEnd(18)} │ ${'ERROR'.padEnd(6)} │        │        │        │        │`);
      continue;
    }
    const score = r.score != null ? `${(r.score * 100).toFixed(0)}` : '-';
    console.log(
      `│ ${r.name.padEnd(18)} │ ${fmt(r.FCP).padEnd(6)} │ ${fmt(r.LCP).padEnd(6)} │ ${fmt(r.TBT).padEnd(6)} │ ${r.CLS?.toFixed(3) ?? '-'.padEnd(6)} │ ${score.padEnd(6)} │`
    );
  }
  console.log('└────────────────────┴────────┴────────┴────────┴────────┴────────┘');

  // 写报告
  const reportPath = resolve(WORKSPACE, 'perf-report.json');
  const { writeFileSync } = await import('node:fs');
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n✓ 详细报告：${reportPath}`);

  if (checkBudget) {
    if (budgetFails > 0) {
      console.error(`\n✗ 性能预算检查失败：${budgetFails} 项超限`);
      process.exit(1);
    }
    console.log('\n✓ 性能预算检查通过');
  }
}

main().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
