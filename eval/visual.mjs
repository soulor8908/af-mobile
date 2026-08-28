// af-mobile UI —— 视觉评审服务器 + Playwright 截图渲染
// 提供静态服务：把 /af-mobile.css → dist/index.css、/af-mobile.js → dist/index.js
// 用 Playwright 渲染 eval 生成的 HTML，截图 + LLM 视觉评审
//
// ESLint 约束：本文件是脚本（scripts/eval 目录），受 AI_RULES 约束，仅用白名单 class 无关，无内联 style
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { validateSteps, formatStepError } from './steps.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

// 资源路径 → dist 文件映射（生成的 HTML 引用 /af-mobile.css 与 /af-mobile.js）
const ROUTES = {
  '/af-mobile.css': 'index.css',
  '/af-mobile.js': 'index.js',
  '/af-mobile': 'index.js',
  '/index.js': 'index.js',
};

// 子库路径映射：/af-mobile/{charts,chat,k,blocks,lib} → src/*（npm exports 子入口 + 跨库公共 lib 的开发态直引）
const SUBPATH_RE = /^af-mobile\/(charts|chat|k|blocks|lib)(\/.*)?$/;

// /af-mobile.js 的包装模块：按需注册所有组件后 re-export（registerAll/UMD 已移除，铁律：只按需引入）。
// 生成页面只 import 原语（signal/effect），不负责注册组件；这里模拟真实接入，
// 使 af-* 元素在页面脚本执行前 upgrade，属性 setter 才能生效。
const WRAP_MOD = (name) => `import * as m from '${name}';try{await Promise.all((m.COMPONENT_TAGS||[]).map((t)=>m.register(t)))}catch(e){console.error('af-mobile register',e)}export * from '${name}';`;

// /af-mobile-blocks.js 的包装模块：注册全部 L3.5 Block 后 re-export（Block 版生成页用）
const BLOCK_WRAP_MOD = (name) => `import * as m from '${name}';try{m.registerBlocks()}catch(e){console.error('af-mobile registerBlocks',e)}export * from '${name}';`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// 启动静态服务器，映射 /af-mobile.{css,js} 到 dist，其余按 eval/results 下文件服务
export function startServer(port = 0) {
  return new Promise((resolve2) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      let path = url.pathname.split('?')[0].replace(/^\/+/, '');
      const mapped = ROUTES[url.pathname.split('?')[0]];
      const sub = path.match(SUBPATH_RE);
      let file;
      if (mapped) {
        file = join(DIST, mapped);
      } else if (sub) {
        // 子库直引：/af-mobile/charts/index.js → src/charts/index.js
        file = join(ROOT, 'src', sub[1] + (sub[2] || '/index.js'));
      } else if (/(\.html|\.png|\.jpg|\.svg)$/.test(path)) {
        // eval 生成的页面/截图：从 eval/results 下服务
        file = join(ROOT, 'eval/results', path);
      } else if (path === 'src' || path.startsWith('src/')) {
        // src/* 源码直引：支持开发态页面（../../src/index.js 相对根解析为 /src/*），与 demo serveSrcOutsideRoot 同思路
        file = join(ROOT, path);
      } else {
        file = join(DIST, path);
      }
      // 防目录穿越：仅允许 dist、eval/results 和 src 下的真实文件
      const inDist = file.startsWith(DIST + sep);
      const inResults = file.startsWith(join(ROOT, 'eval/results') + sep);
      const inSrc = file.startsWith(join(ROOT, 'src') + sep);
      if ((!inDist && !inResults && !inSrc) || !existsSync(file)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
        return;
      }
      const ext = extname(file);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      // /af-mobile.js：返回同步注册组件的包装模块（见 WRAP_MOD）
      // dist/index.js 未构建时 fallback 到 /src/index.js（src 映射必有，快速 eval 免 npm run build）
      if (url.pathname.split('?')[0] === '/af-mobile.js') {
        const target = existsSync(join(DIST, 'index.js')) ? '/index.js' : '/src/index.js';
        res.end(WRAP_MOD(target));
        return;
      }
      // /af-mobile-blocks.js：返回注册全部 Block 的包装模块（见 BLOCK_WRAP_MOD）
      if (url.pathname.split('?')[0] === '/af-mobile-blocks.js') {
        res.end(BLOCK_WRAP_MOD('/blocks.js'));
        return;
      }
      res.end(readFileSync(file));
    });
    server.listen(port, () => resolve2({ server, port: server.address().port }));
  });
}

// 执行一条 assert 的 steps 序列；全部成功返回 null，失败返回错误描述
// click 用 locator.click()（真实坐标点击，穿透 shadow 命中内部元素），禁 evaluate(el.click())——宿主合成点击不触发 shadow 内监听
async function runSteps(page, steps) {
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    try {
      if (s.action === 'click') {
        await page.locator(s.sel).first().click({ timeout: 2000 });
      } else if (s.action === 'fill') {
        // 优先穿透 light/shadow 找内部 input/textarea（走组件内部监听路径，如 af-stepper 的 _onChange→setValue）；
        // 仅当内部无输入元素时才退回宿主（直接赋 value property 不经 setter，可能不触发组件联动）
        await page.locator(s.sel).first().evaluate((el, v) => {
          const t = el.querySelector('input,textarea') || (el.shadowRoot && el.shadowRoot.querySelector('input,textarea')) || el;
          t.value = v;
          t.dispatchEvent(new Event('input', { bubbles: true }));
          t.dispatchEvent(new Event('change', { bubbles: true }));
        }, s.value);
        // 组件常有 debounce（如 af-search-bar 300ms）/异步联动，留出窗口再断言
        await page.waitForTimeout(450);
      } else if (s.action === 'pressKey') {
        await page.locator(s.sel).first().evaluate((el, k) => {
          for (const type of ['keydown', 'keypress', 'keyup']) {
            el.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true }));
          }
        }, s.key);
      } else if (s.action === 'scroll') {
        // sel 缺省滚 window；给 sel 时滚该元素（无滚动高度则尝试 shadow 内首个可滚动容器）
        await page.evaluate(({ sel, top }) => {
          if (!sel) { window.scrollTo(0, top); return; }
          const el = document.querySelector(sel);
          if (!el) throw new Error(sel + ' not found');
          const scrollers = [el, ...el.querySelectorAll('*'), ...(el.shadowRoot ? [...el.shadowRoot.querySelectorAll('*')] : [])]
            .filter((n) => n.scrollHeight > n.clientHeight + 1);
          if (!scrollers.length) throw new Error(sel + ' 无可滚动容器');
          scrollers[0].scrollTop = top;
        }, { sel: s.sel, top: s.top ?? 9999 });
      } else if (s.action === 'waitFor') {
        await page.waitForSelector(s.sel, { state: 'visible', timeout: s.timeout || 3000 });
      }
    } catch (e) {
      return formatStepError(i, s, e);
    }
  }
  return null;
}

// 用 Playwright 渲染 HTML 文件，截图并提取真实渲染后的 DOM 是否含 expects selectors
// 返回 { ok, screenshotPath, missing, error }
export async function renderCapture(htmlPath, expects, { port, outDir, noAutoOpen = false }) {
  const browser = await chromium.launch({
    // executablePath 可经 PLAYWRIGHT_CHROMIUM_PATH 覆盖（容器环境）；缺省由 Playwright 自行解析本机浏览器
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
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
        // importmap：模型常按发布包名 import 子库（模板子库章节写法），eval 源码直引环境映射到 src/
        const im = document.createElement('script');
        im.type = 'importmap';
        im.textContent = JSON.stringify({
          imports: {
            '@af-mobile/ui': '/src/index.js',
            '@af-mobile/ui/': '/src/',
            '@af-mobile/ui/chat': '/src/chat/index.js',
            '@af-mobile/ui/charts': '/src/charts/index.js',
            '@af-mobile/ui/blocks': '/src/blocks/index.js',
          },
        });
        (document.head || document.documentElement).appendChild(im);
      };
      if (document.head) addStyles();
      else document.addEventListener('DOMContentLoaded', addStyles);
    });
    const url = `http://127.0.0.1:${port}/${htmlPath.split(/[\\/]/).pop()}`;
    // importmap 静态注入：模型常按发布包名 import 子库（模板子库章节写法），bare specifier 浏览器无法解析，
    // 拦截 HTML 在 </head> 前插入 importmap（动态插入无效——Chrome 要求 importmap 先于任何模块解析）
    const IMPORTMAP = JSON.stringify({
      imports: {
        '@af-mobile/ui': '/src/index.js',
        '@af-mobile/ui/': '/src/',
        '@af-mobile/ui/chat': '/src/chat/index.js',
        '@af-mobile/ui/charts': '/src/charts/index.js',
        '@af-mobile/ui/blocks': '/src/blocks/index.js',
      },
    });
    await page.route('**/*.html', async (route) => {
      const res = await route.fetch();
      const html = (await res.text()).replace(/<\/head>/i,
        '<script type="importmap">' + IMPORTMAP + '</script></head>');
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
    }).catch(() => {});
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch((e) => {
      errors.push('goto: ' + e.message);
    });
    // 等待渲染（af-list 虚拟滚动等）
    await page.waitForTimeout(1500);
    // 等待弹层类组件完成升级（源码直引时 register 为异步链，未 upgrade 时 open() 调用无效）
    // noAutoOpen：交互断言题跳过强开——基建代开会掩盖「弹层未开/未接线」考点
    if (!noAutoOpen) {
      await page
        .waitForFunction(
          () => !document.querySelector('af-dialog:not(:defined), af-action-sheet:not(:defined), af-picker:not(:defined), af-cascade-picker:not(:defined)'),
          { timeout: 3000 },
        )
        .catch(() => {});
      // 强制打开弹层类组件（af-dialog/af-action-sheet/picker 系默认关闭，评审前触发打开）
      await page.evaluate(() => {
        document.querySelectorAll('af-dialog').forEach((el) => { try { el.open && el.open(); } catch {} });
        document.querySelectorAll('af-action-sheet').forEach((el) => { try { el.showPopover && el.showPopover(); } catch {} });
        document.querySelectorAll('af-picker, af-cascade-picker').forEach((el) => { try { el.open && el.open(); } catch {} });
      }).catch(() => {});
      await page.waitForTimeout(300);
    }
    // 真实 DOM 断言：expects 是否都存在于渲染后 DOM
    // L1-L2 DOM 断言：expects 支持 string（仅存在性）或 { sel, count?, visible?, text?, style? }
    const asserts = (Array.isArray(expects) ? expects : []).map((a) => (typeof a === 'string' ? { sel: a } : a));
    const missing = [];
    const fails = [];
    for (const a of asserts) {
      if (a.steps) {
        try { validateSteps(a.steps); } catch (e) { fails.push(`${a.sel} steps 非法: ${e.message}`); continue; }
        const stepErr = await runSteps(page, a.steps);
        if (stepErr) { fails.push(`${a.sel} ${stepErr}`); continue; }
      }
      const n = await page.locator(a.sel).count().catch(() => 0);
      if (n === 0) {
        missing.push(a.sel);
        fails.push(`缺少 ${a.sel}`);
        continue;
      }
      // count 精确匹配；min:true 时放宽为下限（题集不限定确切数量时用，如"每项包裹"类需求）
      if (a.count && (a.min ? n < a.count : n !== a.count)) fails.push(`${a.sel} 数量 ${n} ${a.min ? '<' : '!='} ${a.count}`);
      if (a.visible) {
        const visibleN = await page
          .locator(a.sel)
          .evaluateAll((es) => es.filter((e) => {
            const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
            // 宿主 display:contents（picker 等弹层语义）自身尺寸恒 0：Light DOM 子树 + shadowRoot 任一元素可见即视为可见
            if (vis(e)) return true;
            const lights = [...e.querySelectorAll('*')];
            const shadows = e.shadowRoot ? [...e.shadowRoot.querySelectorAll('*')] : [];
            return [...lights, ...shadows].some(vis);
          }).length)
          .catch(() => 0);
        if (visibleN === 0) fails.push(`${a.sel} 不可见`);
      }
      if (a.text) {
        const txt = (await page.locator(a.sel).first().textContent().catch(() => '')) || '';
        const ok = a.text instanceof RegExp ? a.text.test(txt) : txt.includes(a.text);
        if (!ok) fails.push(`${a.sel} 文本不含 ${a.text}`);
      }
      if (a.style) {
        for (const { prop, eq, regex } of a.style) {
          const val = await page.locator(a.sel).first().evaluate((e, p) => getComputedStyle(e)[p], prop).catch(() => null);
          if (eq != null && val !== eq) fails.push(`${a.sel} ${prop}=${val} 期望 ${eq}`);
          if (regex && !(regex instanceof RegExp ? regex.test(val) : String(val).match(regex))) fails.push(`${a.sel} ${prop} 不匹配 ${regex}`);
        }
      }
    }
    const base = htmlPath.split(/[\\/]/).pop().replace(/\.html$/, '');
    const screenshotPath = join(outDir, `${base}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    return { ok: fails.length === 0, missing, fails, screenshotPath, errors };
  } finally {
    await browser.close();
  }
}