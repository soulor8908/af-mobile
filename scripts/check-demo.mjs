// demo 目录合规门禁：demo 是 AI 学习组件库的第一手素材，本身必须合规（防教坏 AI）。
// 扫描范围与规则：
//   全 demo/（.html/.js）：
//     R1 禁内联 style="..." 属性
//     R2 禁 emoji 图标（U+1F300-1FAFF 等扩展区）
//     R3 禁 registerAll() 全量注册
//   demo/components/*.html（组件示范核心区）：
//     R4 必须含主题防闪脚本（localStorage 'theme'）
//     R5 class 必须在白名单内（whitelist-v1.json：recipe + atomic）
//   含 <style> 的文件（核心区）：
//     R6 <style> 必须带豁免注释（开标签前后含「豁免」字样）
//   demo/scenarios/*.js：
//     R7 tag 必须是完整标签名 'af-xxx'
//   demo/**/*.css：
//     R8 禁硬编码色值（#hex / rgb / rgba），须走 var(--*) token；就地 /* 豁免：原因 */ 可放行
// 白名单校验豁免宿主页面（index/kitchen-sink/perf/playground/props-panel——非组件示范）。
// 用法：npm run demo:check ；违规非零退出。
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEMO = join(ROOT, 'demo');
const whitelist = JSON.parse(readFileSync(join(ROOT, 'eslint-plugin-af-mobile/utils/whitelist-v1.json'), 'utf8'));
const ALLOWED = new Set([...(whitelist.classes.recipe || []), ...(whitelist.classes.atomic || [])]);
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2705}\u{270A}\u{270B}\u{274C}\u{274E}\u{2757}\u{2B50}\u{2B55}]/gu;

const errors = [];
const check = (rel, src, { whitelist: doWhitelist, antiflash } = {}) => {
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') lineStarts.push(i + 1);
  const lineOf = (idx) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
  // R1 内联 style
  for (const m of src.matchAll(/\sstyle\s*=\s*"/g)) errors.push(`${rel}:${lineOf(m.index)} 内联 style 属性（改白名单 class 或 data-role 局部样式）`);
  // R2 emoji
  for (const m of src.matchAll(EMOJI_RE)) errors.push(`${rel}:${lineOf(m.index)} emoji 字符 "${m[0]}"（禁 emoji 图标）`);
  // R3 registerAll
  if (/\bregisterAll\s*\(/.test(src)) errors.push(`${rel} 使用 registerAll()（必须按需注册）`);
  // R4 防闪
  if (antiflash && !src.includes("localStorage.getItem('theme')")) errors.push(`${rel} 缺主题防闪脚本（见 demo/README.md 约定）`);
  // R5 白名单 class（跳过模板插值）
  if (doWhitelist) {
    for (const m of src.matchAll(/class\s*=\s*"([^"]*)"/g)) {
      if (m[1].includes('${')) continue;
      for (const cls of m[1].trim().split(/\s+/)) {
        if (cls && !ALLOWED.has(cls)) errors.push(`${rel}:${lineOf(m.index)} 白名单外 class "${cls}"`);
      }
    }
  }
  // R6 <style> 豁免注释
  for (const m of src.matchAll(/<style>/g)) {
    const ctx = src.slice(Math.max(0, m.index - 220), m.index + 320);
    if (!ctx.includes('豁免')) errors.push(`${rel}:${lineOf(m.index)} <style> 缺豁免注释（注释需含「豁免」+ 原因，见 demo/README.md 样式豁免口径）`);
  }
  // R7 scenario tag
  for (const m of src.matchAll(/\btag:\s*'([^']+)'/g)) {
    if (!m[1].startsWith('af-')) errors.push(`${rel}:${lineOf(m.index)} scenario tag "${m[1]}" 必须是完整标签名 'af-xxx'`);
  }
};

// R8 CSS 硬编码色值：独立 .css 文件此前从未被扫描（playground.css 76 行全硬编码长期逃逸）。
// 豁免口径：就地行尾 /* 豁免：原因 */ —— 与 demo/README.md 的样式豁免口径一致（豁免必须就地定位）。
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(/g;
const checkCss = (rel, src) => {
  src.split('\n').forEach((raw, i) => {
    if (raw.includes('豁免')) return;
    const code = raw.replace(/\/\*.*?\*\//g, ''); // 剥离行内注释，避免注释里的色值误判
    for (const m of code.matchAll(COLOR_RE)) {
      errors.push(`${rel}:${i + 1} 硬编码色值 "${m[0]}"（改用 var(--*) token，或就地加 /* 豁免：原因 */ 注释）`);
    }
  });
};

const walkDir = (dir, rel, opts) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      // 子目录递归（demo/apps/ai-todo 等嵌套结构）；平铺目录（components/scenarios）行为不变
      walkDir(p, `${rel}/${f}`, opts);
      continue;
    }
    if (f.endsWith('.html')) check(`${rel}/${f}`, readFileSync(p, 'utf8'), opts);
    else if (f.endsWith('.js')) check(`${rel}/${f}`, readFileSync(p, 'utf8'), { ...opts, antiflash: false });
    else if (f.endsWith('.css')) checkCss(`${rel}/${f}`, readFileSync(p, 'utf8'));
  }
};

walkDir(join(DEMO, 'components'), 'demo/components', { whitelist: true, antiflash: true });
walkDir(join(DEMO, 'scenarios'), 'demo/scenarios', { whitelist: true });
walkDir(join(DEMO, 'apps'), 'demo/apps', { whitelist: true, antiflash: true });
walkDir(join(DEMO, 'playground'), 'demo/playground', {});
for (const f of ['index.html', 'kitchen-sink.html', 'perf.html', 'props-panel.js']) {
  check(`demo/${f}`, readFileSync(join(DEMO, f), 'utf8'), {});
}

if (errors.length) {
  console.error(`demo:check FAIL（${errors.length} 处）\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log('demo:check passed — demo 目录合规');
