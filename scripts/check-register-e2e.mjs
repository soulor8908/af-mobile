// af-mobile UI —— register 生产分包死锁回归（incidents #12，P0 级静默空白）
//
// 为什么需要本脚本：jsdom 测不到 bundler 行为。入口顶层 `await register(...)`（TLA）+
// Vite/Rollup 生产分包 → 入口与组件 chunk 共用模块（escapeHtml/t）被划入入口 chunk →
// 组件 chunk 反向静态 import 入口 → entry ↔ chunk 互等：组件永不注册、页面空白且零报错。
// dev 原生 ESM 不复现，只有真实生产构建 + 真实浏览器才能抓到。
//
// 做两件事（fixture 由脚本内联生成，落在 ROOT/.cache/register-e2e，gitignored）：
//   1) 推荐写法（register 不 await）：断言全组件注册 + outlet 渲染完成 —— 防死锁回归
//   2) TLA 旧写法：断言死锁复现 + 看门狗输出诊断 —— 防「静默空白零报错」回归
//
// 用法：npm run register:e2e（node scripts/check-register-e2e.mjs）
// 依赖：仓库 devDependencies 的 vite + playwright-core + 本机 Chrome/Edge；浏览器缺席时跳过（exit 0）
// 清理约定：产物留在 .cache（gitignored，可整体删），不做递归 rm —— 规避安全删除 shim 的
// 批量阈值误伤（见 incidents「环境假失败」与 .ts-smoke-tmp 案例）
import { mkdirSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const ROOT = join(fileURLToPath(import.meta.url), '../..');
const WORK = join(ROOT, '.cache', 'register-e2e');
const TAGS = ['af-tabbar', 'af-dialog', 'af-toast', 'af-switch'];
const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };

function findBrowser() {
  for (const p of CHROME_CANDIDATES) if (existsSync(p)) return p;
  return null;
}

// 入口静态导入 escapeHtml（入口 chunk 携带 lib/html.js —— 死锁的必要条件）+ register
function writeFixtureMain(entry) {
  const tla = entry.includes('tla');
  writeFileSync(join(WORK, 'src', `main-${entry}.js`),
    `import { route, start, escapeHtml, register } from '@af-mobile/ui';

route('/', (params, ctx) => { ctx.outlet.innerHTML = '<div>' + escapeHtml('home') + ' <af-switch></af-switch></div>'; });
${tla ? `await register(${TAGS.map((t) => `'${t}'`).join(', ')});` : `register(${TAGS.map((t) => `'${t}'`).join(', ')});`}
start('#app', { hash: true });
`);
  writeFileSync(join(WORK, `index-${entry}.html`),
    `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${entry}</title></head><body><div id="app"></div><script type="module" src="/src/main-${entry}.js"></script></body></html>`);
}

async function buildFixture(entry, outDir) {
  await build({
    root: WORK,
    build: { target: 'es2022', minify: false, outDir, rollupOptions: { input: join(WORK, `index-${entry}.html`) } },
    logLevel: 'silent',
  });
}

async function serveAndVerify(dir, entry, mode, browser) {
  const { chromium } = await import('playwright-core');
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(m.text()));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  const server = createServer(async (req, res) => {
    let p = req.url.split('?')[0];
    if (p === '/') p = `/${entry}`;
    try {
      const buf = await readFile(join(dir, normalize(p)));
      res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
      res.end(buf);
    } catch {
      res.writeHead(404).end();
    }
  });
  const port = 51990 + Math.floor(Math.random() * 100);
  await new Promise((r) => server.listen(port, r));
  try {
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load', timeout: 15000 });
    if (mode === 'recommended') {
      await page.waitForFunction(
        (tags) => tags.every((t) => !!customElements.get(t)),
        TAGS,
        { timeout: 6000 },
      );
      const html = await page.evaluate(() => document.querySelector('#app')?.innerHTML || '');
      if (!html.includes('home')) throw new Error('outlet 未渲染（首渲染未等待注册完成）');
      return;
    }
    // TLA 模式：无共用依赖的 af-switch 仍会注册；其余死锁。等看门狗（默认 2s）输出后再断言
    await new Promise((r) => setTimeout(r, 4500));
    const allDefined = await page.evaluate(
      (tags) => tags.every((t) => !!customElements.get(t)),
      TAGS,
    ).catch(() => false);
    if (allDefined) throw new Error('TLA fixture 意外未死锁（复现条件失效，请检查 fixture 是否静态导入了组件类）');
    if (!logs.some((l) => l.includes('[@af-mobile/ui]') && l.includes('register'))) {
      throw new Error('看门狗未输出诊断（失败可见性回归）');
    }
  } finally {
    server.close();
  }
}

const BROWSER = findBrowser();
if (!BROWSER) {
  console.log('⏭ 未找到本机 Chrome/Edge，跳过 register 生产分包死锁回归（建议在有浏览器的环境跑 npm run register:e2e）');
  process.exit(0);
}

// fixture 工程：node_modules/@af-mobile/ui junction 指向仓库根（真实包解析 + package.json sideEffects 口径）
mkdirSync(join(WORK, 'src'), { recursive: true });
mkdirSync(join(WORK, 'node_modules', '@af-mobile'), { recursive: true });
const link = join(WORK, 'node_modules', '@af-mobile', 'ui');
if (!existsSync(link)) symlinkSync(ROOT, link, 'junction');
writeFileSync(join(WORK, 'package.json'), JSON.stringify({ name: 'register-e2e', private: true, type: 'module' }, null, 2));
writeFixtureMain('recommended');
writeFixtureMain('tla');

const { chromium } = await import('playwright-core');
const browser = await chromium.launch({ executablePath: BROWSER, headless: true, args: ['--no-sandbox'] });

let failed = 0;
for (const entry of ['recommended', 'tla']) {
  const outDir = join(WORK, `dist-${entry}`);
  try {
    await buildFixture(entry, outDir);
    await serveAndVerify(outDir, `index-${entry}.html`, entry, browser);
    console.log(`✓ [${entry}] ${entry === 'recommended' ? '推荐写法：全组件注册 + 首渲染等待注册' : 'TLA 旧写法：死锁复现 + 看门狗诊断输出'}`);
  } catch (e) {
    failed += 1;
    console.error(`✗ [${entry}] ${e.message}`);
  }
}
await browser.close();
if (failed) {
  console.error(`✗ register 生产分包死锁回归失败（${failed} 项）；根因与修法见 docs/incidents.md #12`);
  process.exit(1);
}
console.log('✓ register 生产分包死锁回归通过（incidents #12）');
