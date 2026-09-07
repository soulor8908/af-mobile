// @af-mobile/ui/vite —— 构建期插件（OPT-4 / OPT-9）
// afMobileTrimLazy()：扫描消费端源码中 register('af-x', 'af-y') 字面量调用，构建期把
// index.js 的 LAZY 懒注册表裁剪为实际用到的组件 → 打包器不再为未用组件出 chunk
// （消费端只 register 10 个组件时，dist/assets 可少 ~20 个未用 chunk；运行时不下载但
// 产物体积、上传耗时、CDN 缓存条目 ×3）。
// 保底：未检测到任何 register() 字面量、或存在动态注册（非字符串字面量参数）时，
// 不裁剪（LAZY 全量保留）——宁可产物大，不可运行时报 unknown component。
// 约束：register(...) 参数必须是字符串字面量（no-register-all 规则本就要求显式列名）。
//
// afMobileShakeCss()：扫描消费端源码里实际用到的 class，构建期裁剪 L1 tokens + L2
// recipes + atomic 中未用到的规则（实测 gzip 8.32KB → 4.36KB，省约 47%）。
// 与 trimLazy 互补：一个裁 JS 未用组件，一个裁 CSS 未用配方。
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectCssClasses, collectUsedClasses, shakeRoot } from './css-shake.js';

// 本包 src/ 目录（用于识别「这是 af-mobile 自己的 CSS」，避免裁剪消费端自有样式）
const PKG_SRC = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, '/');

const EXT_RE = /\.(js|mjs|cjs|ts|tsx|jsx|vue|svelte)$/;
const CALL_RE = /\bregister\s*\(([^()]*)\)/g;
const TAG_RE = /^(?:['"])(af-[a-z0-9-]+)(?:['"])$/;
const START = '// ===== gen:lazy:start';
const END = '// ===== gen:lazy:end';

// 递归扫描目录，收集 register() 字面量 tag；返回 { tags:Set, dynamic:boolean }
export function collectRegisterTags(dir, depth = 0) {
  const tags = new Set();
  let dynamic = false;
  if (depth > 24) return { tags, dynamic: true };
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return { tags, dynamic: true };
  }
  for (const e of entries) {
    if (dynamic) break;
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const r = collectRegisterTags(p, depth + 1);
      r.tags.forEach((t) => tags.add(t));
      dynamic = dynamic || r.dynamic;
    } else if (EXT_RE.test(e.name)) {
      const calls = readFileSync(p, 'utf8').match(CALL_RE) || [];
      for (const call of calls) {
        for (const arg of call.slice(call.indexOf('(') + 1, -1).split(',')) {
          const a = arg.trim();
          if (!a) continue;
          const m = TAG_RE.exec(a);
          if (m) tags.add(m[1]);
          else { dynamic = true; break; }   // 非字面量参数 → 放弃裁剪
        }
      }
    }
  }
  return { tags, dynamic };
}

// kebab tag → 类名：'af-action-sheet' → 'AfActionSheet'（'af-' 剥离后 Pascal 化并补回 Af 前缀）
const toClassName = (tag) => 'Af' + tag.slice(3).split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');

/**
 * 纯函数：按 tags 裁剪 index.js 源码的 LAZY 表体（gen:lazy 标记之间）
 * @returns {string|null} 无标记/无需裁剪时返回 null
 */
export function trimLazyCode(code, tags) {
  const start = code.indexOf(START);
  const end = code.indexOf(END);
  if (start === -1 || end === -1 || !tags || !tags.size) return null;
  const tagRe = /'([a-z0-9-]+)':\s*\(\)\s*=>/g;
  const allTags = [];
  let m;
  while ((m = tagRe.exec(code.slice(start, end)))) allTags.push(m[1]);
  const kept = allTags.filter((t) => tags.has(t));
  if (kept.length === allTags.length) return null;   // 全量使用，无需裁剪
  const body = kept.map((t) => `  '${t}': () => import('./components/${t}.js').then((mod) => mod.${toClassName(t)}),`).join('\n');
  return `${code.slice(0, start)}// ===== gen:lazy:start（构建期由 @af-mobile/ui/vite 的 afMobileTrimLazy 按实际 register() 裁剪）\nconst LAZY = {\n${body}\n};\n${code.slice(end)}`;
}

/**
 * Vite/Rollup 插件：构建期按实际 register() 调用裁剪 LAZY 懒注册表
 * @param {{ scanDir?: string }} opts 扫描目录（默认 vite root 下的 src）
 */
export default function afMobileTrimLazy(opts = {}) {
  let root = '';
  let result = null;
  let done = false;
  return {
    name: 'af-mobile-trim-lazy',
    enforce: 'pre',
    configResolved(config) { root = config.root; },
    transform(code, id) {
      // 仅命中 @af-mobile/ui 的 index.js（以 gen:lazy 标记为指纹，避免误伤消费端同名文件）
      if (!code.includes(START) || !code.includes(END)) return null;
      if (!/src[\\/]index\.js$/.test(id)) return null;
      if (!done) {
        done = true;
        const dir = opts.scanDir || join(root, 'src');
        result = collectRegisterTags(dir);
        if (result.dynamic) {
          console.warn('[af-mobile-trim-lazy] register() 存在动态参数，放弃 LAZY 裁剪（LAZY 全量保留）');
        } else if (!result.tags.size) {
          console.warn('[af-mobile-trim-lazy] 未扫描到 register() 调用，LAZY 全量保留');
        }
      }
      if (!result || result.dynamic || !result.tags.size) return null;
      const next = trimLazyCode(code, result.tags);
      return next ? { code: next, map: null } : null;
    },
  };
}

// 归一化路径并判断是否为 af-mobile 包内的 CSS 文件
// 两种路径形态都要认：① PKG_SRC（本仓开发 / Vite 默认解析 symlink 到真实路径）
// ② 含 /@af-mobile/ui/src/（preserveSymlinks 下保留 node_modules 软链路径）
// 两者覆盖后仍有混合解析的极端场景 → 用 opts.include 显式指定，verbose 下未命中会告警
function isAfMobileCss(id, include) {
  if (!id) return false;
  const p = String(id).split('?')[0].replace(/\\/g, '/');
  if (!p.endsWith('.css')) return false;
  if (include) return include instanceof RegExp ? include.test(p) : p.includes(include);
  return p.includes(PKG_SRC) || p.includes('/@af-mobile/ui/src/');
}

/**
 * Vite 插件：构建期按实际用到的 class 裁剪 af-mobile 的 L1+L2 CSS
 *
 * 实现要点：
 *   - postcss 由 Vite 自身的 CSS 管道提供（本包不引入 postcss 运行时依赖）；
 *     本插件只往 `css.postcss.plugins` 里塞一个标准 postcss 插件对象。
 *   - 仅 `apply: 'build'`：dev 下 CSS 的 postcss 只在首次加载时跑，裁剪后新增 class
 *     不会重新触发 → 会表现为「样式莫名消失」，故 dev 一律不裁。
 *   - 只处理本包 src/ 下的 CSS（isAfMobileCss），绝不碰消费端自己的 CSS。
 *   - 保底：扫描不到任何 class 时不裁剪（否则等于把样式全删光）。
 *   - safelist：先用静态 class="..." 扫描，再用「引号字符串字面量 ∩ CSS 里出现过的
 *     class」兜底，救回 class="a ${x ? 'b' : ''}" 这类动态拼接（漏报会静默失效）。
 *
 * @param {object} [opts]
 * @param {string} [opts.scanDir]  扫描目录（默认 vite root 下的 src）
 * @param {string[]} [opts.safelist] 额外强制保留的 class（逃生舱）
 * @param {string|RegExp} [opts.include] 自定义「这是 af-mobile CSS」的路径特征（默认自动识别）
 * @param {boolean} [opts.enabled] 传 false 整体关闭
 * @param {boolean} [opts.verbose] 打印裁剪统计；未命中任何 CSS 时告警
 */
export function afMobileShakeCss(opts = {}) {
  if (opts.enabled === false) return { name: 'af-mobile-shake-css' };
  let root = '';
  let used = null;
  let warnedEmpty = false;
  let hit = false;

  const plugin = {
    postcssPlugin: 'af-mobile-shake-css',
    OnceExit(cssRoot, helper) {
      const from =
        (helper && helper.result && helper.result.opts && helper.result.opts.from) ||
        (cssRoot.source && cssRoot.source.input && cssRoot.source.input.from) ||
        '';
      if (!isAfMobileCss(from, opts.include)) return;
      hit = true;
      const before = opts.verbose ? cssRoot.toString().length : 0;
      if (!used) {
        used = collectUsedClasses(opts.scanDir || join(root, 'src'), collectCssClasses(cssRoot.toString()));
        for (const c of opts.safelist || []) used.add(c);
      }
      if (!used.size) {
        if (!warnedEmpty) {
          warnedEmpty = true;
          console.warn('[af-mobile-shake-css] 未扫描到任何 class，放弃 CSS 裁剪（全量保留）');
        }
        return;
      }
      shakeRoot(cssRoot, used);
      if (opts.verbose) {
        const after = cssRoot.toString().length;
        console.log(
          `[af-mobile-shake-css] ${from.split('/').pop()}：${before} → ${after} 字节（-${((1 - after / before) * 100).toFixed(1)}%），保留 ${used.size} 个 class`
        );
      }
    },
  };

  return {
    name: 'af-mobile-shake-css',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    // 整轮构建一次都没命中 af-mobile CSS 时（路径解析形态未覆盖）→ 显式告警，
    // 否则「裁剪静默不生效」与「裁剪生效」在产物上只有体积差异，极难发现
    buildEnd() {
      if (opts.verbose && !hit) {
        console.warn('[af-mobile-shake-css] 本次构建未命中任何 af-mobile CSS，裁剪未生效；可用 opts.include 显式指定路径特征');
      }
    },
    config(config) {
      // 用户若用 postcss 配置文件（css.postcss 为字符串路径），注入 plugins 会覆盖其配置
      // → 不注入并明确告知，避免静默破坏用户既有 postcss 链路
      if (config && config.css && typeof config.css.postcss === 'string') {
        console.warn('[af-mobile-shake-css] 检测到 css.postcss 为配置文件路径，改为内联 plugins 数组后本插件才生效');
        return {};
      }
      return { css: { postcss: { plugins: [plugin] } } };
    },
  };
}
