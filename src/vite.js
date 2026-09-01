// @af-mobile/ui/vite —— 构建期插件（OPT-4）
// afMobileTrimLazy()：扫描消费端源码中 register('af-x', 'af-y') 字面量调用，构建期把
// index.js 的 LAZY 懒注册表裁剪为实际用到的组件 → 打包器不再为未用组件出 chunk
// （消费端只 register 10 个组件时，dist/assets 可少 ~20 个未用 chunk；运行时不下载但
// 产物体积、上传耗时、CDN 缓存条目 ×3）。
// 保底：未检测到任何 register() 字面量、或存在动态注册（非字符串字面量参数）时，
// 不裁剪（LAZY 全量保留）——宁可产物大，不可运行时报 unknown component。
// 约束：register(...) 参数必须是字符串字面量（no-register-all 规则本就要求显式列名）。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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
