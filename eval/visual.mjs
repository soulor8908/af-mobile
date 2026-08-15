// AIFlow UI —— 视觉评审服务器 + Playwright 截图渲染
// 提供静态服务：把 /aiflow-ui.css → dist/index.css、/aiflow-ui.js → dist/index.js
// 用 Playwright 渲染 eval 生成的 HTML，截图 + LLM 视觉评审
//
// ESLint 约束：本文件是脚本（scripts/eval 目录），受 AI_RULES 约束，仅用白名单 class 无关，无内联 style
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

// 资源路径 → dist 文件映射（生成的 HTML 引用 /aiflow-ui.css 与 /aiflow-ui.js）
const ROUTES = {
  '/aiflow-ui.css': 'index.css',
  '/aiflow-ui.js': 'index.js',
  '/aiflow-ui.umd.js': 'aiflow-ui.umd.js',
  '/aiflow-ui': 'index.js',
  '/index.js': 'index.js',
};

// /aiflow-ui.js 的包装模块：同步注册所有组件后 re-export。
// 生成页面只 import 原语（signal/effect），不负责注册组件；这里模拟真实接入，
// 使 af-* 元素在页面脚本执行前 upgrade，属性 setter 才能生效。
const WRAP_MOD = (name) => `import * as m from '${name}';try{(m.registerAll||m.default?.registerAll)?.()}catch(e){console.error('aiflow registerAll',e)}export * from '${name}';`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// 启动静态服务器，映射 /aiflow-ui.{css,js} 到 dist，其余按 eval/results 下文件服务
export function startServer(port = 0) {
  return new Promise((resolve2) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      let path = url.pathname.split('?')[0].replace(/^\/+/, '');
      const mapped = ROUTES[url.pathname.split('?')[0]];
      let file;
      if (mapped) {
        file = join(DIST, mapped);
      } else if (/(\.html|\.png|\.jpg|\.svg)$/.test(path)) {
        // eval 生成的页面/截图：从 eval/results 下服务
        file = join(ROOT, 'eval/results', path);
      } else {
        file = join(DIST, path);
      }
      // 防目录穿越：仅允许 dist 和 eval/results 下的真实文件
      const inDist = file.startsWith(DIST + sep);
      const inResults = file.startsWith(join(ROOT, 'eval/results') + sep);
      if ((!inDist && !inResults) || !existsSync(file)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
        return;
      }
      const ext = extname(file);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      // /aiflow-ui.js：返回同步注册组件的包装模块（见 WRAP_MOD）
      if (url.pathname.split('?')[0] === '/aiflow-ui.js') {
        res.end(WRAP_MOD('/index.js'));
        return;
      }
      res.end(readFileSync(file));
    });
    server.listen(port, () => resolve2({ server, port: server.address().port }));
  });
}

// 用 Playwright 渲染 HTML 文件，截图并提取真实渲染后的 DOM 是否含 expects selectors
// 返回 { ok, screenshotPath, missing, error }
export async function renderCapture(htmlPath, expects, { port, outDir }) {
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
    // 页面加载前注入：af-list 等虚拟滚动容器无高度时 clientHeight=0 渲染不出内容
    await page.addInitScript(() => {
      const addStyles = () => {
        const st = document.createElement('style');
        st.textContent = 'af-list{height:720px}af-swiper{height:320px}.page{min-height:100vh}body{margin:0}';
        (document.head || document.documentElement).appendChild(st);
      };
      if (document.head) addStyles();
      else document.addEventListener('DOMContentLoaded', addStyles);
    });
    const url = `http://127.0.0.1:${port}/${htmlPath.split(/[\\/]/).pop()}`;
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch((e) => {
      errors.push('goto: ' + e.message);
    });
    // 等待渲染（af-list 虚拟滚动等）
    await page.waitForTimeout(1500);
    // 强制打开弹层类组件（af-dialog/af-action-sheet 默认关闭，评审前触发打开）
    await page.evaluate(() => {
      document.querySelectorAll('af-dialog').forEach((el) => { try { el.open && el.open(); } catch {} });
      document.querySelectorAll('af-action-sheet').forEach((el) => { try { el.showPopover && el.showPopover(); } catch {} });
    }).catch(() => {});
    await page.waitForTimeout(300);
    // 真实 DOM 断言：expects 是否都存在于渲染后 DOM
    const missing = [];
    for (const sel of expects) {
      const found = await page.locator(sel).count().catch(() => 0);
      if (found === 0) missing.push(sel);
    }
    const base = htmlPath.split(/[\\/]/).pop().replace(/\.html$/, '');
    const screenshotPath = join(outDir, `${base}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    return { ok: missing.length === 0, missing, screenshotPath, errors };
  } finally {
    await browser.close();
  }
}