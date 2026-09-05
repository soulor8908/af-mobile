// af-mobile UI —— L1 Token 对比度 CI（WCAG 2.x）
// 解析 tokens.css 的 light/dark 调色板，解析 var() 引用链，OKLCH→sRGB 转换后
// 断言关键前景/背景组合 ≥ 阈值。防止「照抄外部色板」导致的无障碍倒退。
// 用法：node scripts/check-contrast.mjs（exit 1 = 有 error 级组合不达标）
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCssRules } from './gen-tokens.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- OKLCH → sRGB（Björn Ottosson 矩阵） ---------- */
export function oklchToRgb(L, C, H) {
  const h = (H * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const lin = [l_, m_, s_].map((v) => v ** 3);
  const rgb = [
    4.0767416621 * lin[0] - 3.3077115913 * lin[1] + 0.2309699292 * lin[2],
    -1.2684380046 * lin[0] + 2.6097574011 * lin[1] - 0.3413193965 * lin[2],
    -0.0041960863 * lin[0] - 0.7034186147 * lin[1] + 1.707614701 * lin[2],
  ].map((v) => Math.round(Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)) * 255));
  return rgb;
}

export function relativeLuminance([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(rgb1, rgb2) {
  const [l1, l2] = [relativeLuminance(rgb1), relativeLuminance(rgb2)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

const OKLCH_RE = /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/;
const VAR_RE = /^var\((--[a-z0-9-]+)\)$/;

/* ---------- 构建主题映射：palette(light/dark) + 公共 --c-* ---------- */
export function buildThemeMaps(css) {
  const rules = parseCssRules(css);
  const light = rules.find((r) => r.selector.trim() === ':root' && r.decls.some((d) => d.name.startsWith('--palette-')));
  const dark = rules.find((r) => r.selector.includes('[data-theme="dark"]'));
  const pub = rules.find((r) => r.selector.trim() === ':root' && r.decls.some((d) => d.name.startsWith('--c-')));
  const toMap = (rule) => Object.fromEntries(rule.decls.map((d) => [d.name, d.value.trim()]));
  // dark 块在 CSS 中只覆写部分变量，其余继承 :root —— 映射需 light 垫底再叠 dark
  return {
    light: { ...toMap(light), ...toMap(pub) },
    dark: { ...toMap(light), ...toMap(dark), ...toMap(pub) },
  };
}

/* ---------- 解析单 token → RGB（沿 var() 链下钻，支持 oklch/rgb/hex） ---------- */
export function resolveRgb(name, themeMap) {
  const seen = new Set();
  let cur = name;
  while (true) {
    if (seen.has(cur)) throw new Error(`循环引用: ${cur}`);
    seen.add(cur);
    const val = themeMap[cur];
    if (val == null) return null; // token 不存在（如灰阶未引入时跳过）
    const v = val.match(VAR_RE)?.[1];
    if (v) { cur = v; continue; }
    const ok = val.match(OKLCH_RE);
    if (ok) return oklchToRgb(+ok[1] / 100, +ok[2], +ok[3]);
    const hex = val.match(/^#([0-9a-f]{6})$/i);
    if (hex) return [1, 3, 5].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
    const rgb = val.match(/^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
    return null; // shadow/cubic-bezier 等非颜色 token
  }
}

/* ---------- 断言清单：[说明, 前景, 背景, 阈值, 级别]
   error = 阻断（正文/按钮文字，WCAG AA 4.5）
   warn  = 报告不阻断（图标类装饰色，待 token 决策后升 error） ---------- */
const PAIRS = [
  ['正文 text/bg',        '--c-text',   '--c-bg',    4.5, 'error'],
  ['正文 text/card',      '--c-text',   '--c-card',  4.5, 'error'],
  ['次级 muted/bg',       '--c-muted',  '--c-bg',    4.5, 'error'],
  ['次级 muted/card',     '--c-muted',  '--c-card',  4.5, 'error'],
  ['按钮 onbrand/brand',  '--c-onbrand', '--c-brand', 4.5, 'error'],
  ['onbrand/success',     '--c-onbrand', '--c-success', 4.5, 'error'],
  ['onbrand/danger',      '--c-onbrand', '--c-danger', 4.5, 'error'],
  ['标签 onwarn/warn',    '--c-onwarn', '--c-warn',  4.5, 'error'],
  ['通知栏 notice-text/notice-bg（T0.5 Vant 对齐）', '--c-notice-text', '--c-notice-bg', 4.5, 'error'],
  ['plain按钮/链接 brand/card',      '--c-brand', '--c-card', 4.5, 'error'],
  ['plain按钮/链接 brand/bg',        '--c-brand', '--c-bg',   4.5, 'error'],
  ['ghost active brand/brand-soft',  '--c-brand', '--c-brand-soft', 4.5, 'error'],
  ['错误文字 danger/card', '--c-danger', '--c-card', 4.5, 'error'],
  ['成功文字 success/card', '--c-success', '--c-card', 4.5, 'error'],
  ['灰阶 gray-6/bg',      '--c-gray-6', '--c-gray-1', 4.5, 'error'],
  ['灰阶 gray-6/card',    '--c-gray-6', '--c-card',   4.5, 'error'],
  ['灰阶 gray-8/bg',      '--c-gray-8', '--c-gray-1', 4.5, 'error'],
  ['灰阶 gray-7/card',    '--c-gray-7', '--c-card',   4.5, 'error'],
  ['评分星 warn/card（图标，暂报告）', '--c-warn', '--c-card', 3.0, 'warn'],
];

export function runChecks(css = readFileSync(join(ROOT, 'src/tokens.css'), 'utf8')) {
  const themes = buildThemeMaps(css);
  const results = [];
  for (const theme of ['light', 'dark']) {
    const map = themes[theme];
    for (const [desc, fg, bg, min, level] of PAIRS) {
      const fgRgb = resolveRgb(fg, map), bgRgb = resolveRgb(bg, map);
      if (!fgRgb || !bgRgb) { results.push({ theme, desc, level, status: 'skip', note: 'token 未定义' }); continue; }
      const ratio = contrastRatio(fgRgb, bgRgb);
      results.push({
        theme, desc, level,
        ratio: +ratio.toFixed(2), min,
        status: ratio >= min ? 'pass' : (level === 'warn' ? 'warn' : 'fail'),
      });
    }
  }
  return results;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const results = runChecks();
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  L1 Token 对比度检查（WCAG AA）                  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  let failed = 0, warned = 0, skipped = 0;
  const lines = [];
  for (const r of results) {
    const tag = { pass: '✓', fail: '✗', warn: '⚠', skip: '-' }[r.status];
    lines.push(`${tag} [${r.theme}] ${r.desc}: ${r.status === 'skip' ? r.note : `${r.ratio} (需 ≥${r.min})`}`);
    if (r.status === 'fail') failed++;
    if (r.status === 'warn') warned++;
    if (r.status === 'skip') skipped++;
  }
  console.log(lines.join('\n'));
  const pass = results.filter((r) => r.status === 'pass').length;
  console.log(`\n通过 ${pass} / ${results.length}（warn ${warned} 报告不阻断，skip ${skipped} token 未定义）`);
  if (failed) { console.error(`✗ ${failed} 个 error 级组合不达标，禁止合入`); process.exit(1); }
  console.log('✓ 对比度全部达标');
}
