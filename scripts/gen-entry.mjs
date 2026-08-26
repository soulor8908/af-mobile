// af-mobile UI —— 入口清单 codegen（第三步：元数据自动生成）
// 扫描 src/components/af-*.js 与 src/charts/components/af-chart-*.js，
// 生成 src/index.js（import/export/REGISTRY/LAZY）与 src/charts/index.js（import/export/CHART_TAGS）
// 的 marker 标记区域，消除同一份组件清单的多处手工重复。
// 手写部分（register / registerChart / lib 导出 / 头注释）在 marker 区域之外，不受影响。
// 用法：
//   node scripts/gen-entry.mjs          生成并写入
//   node scripts/gen-entry.mjs --check  幂等校验（漂移时 exit 1）
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 文件名 → 类名：af-number-keyboard.js → AfNumberKeyboard
export const fileToClass = (f) => {
  const base = f.replace(/\.js$/, '');
  const parts = base.split('-').slice(1);
  return 'Af' + parts.map((p) => p[0].toUpperCase() + p.slice(1)).join('');
};

const scanComponents = (dir, exclude) =>
  readdirSync(join(ROOT, dir))
    .filter((f) => /^af-.*\.js$/.test(f) && !exclude.includes(f))
    .sort()
    .map((f) => ({ file: f, tag: f.replace(/\.js$/, ''), cls: fileToClass(f) }));

// —— 区域渲染器（每个返回该 marker 区域的完整内容）——

// import 块 + 命名导出行（main 与 charts 同构）
const renderEntry = (comps, base) => {
  const imports = comps.map((c) => `import { ${c.cls} } from '${base}/${c.file}';`).join('\n');
  return `${imports}\n\nexport { ${comps.map((c) => c.cls).join(', ')} };`;
};

// 主库 REGISTRY：显式 tag→Ctor 字面量表（minify 安全；仅供内省，Tree Shaking 友好）
const renderRegistry = (comps) => `// 显式 tag→Ctor 注册表：不依赖 Function.name（minify 下类名会被压缩为 a/b/c，
// 基于 name 的推导会失效）。改用字面量 tag 字符串，任何打包器压缩下都稳定。
// 仅用于内省/工具链（eval、minify 安全测试）；register 走下方 LAZY 懒加载，不引用本表
// （未被引用时连同 ${comps.length} 个 ctor import 一并被 Tree Shaking 摇掉）。
export const REGISTRY = [
${comps.map((c) => `  ['${c.tag}', ${c.cls}],`).join('\n')}
];`;

// 主库 LAZY：懒注册表（路径/导出名为字面量 → 打包器可静态分析按需分包）
const renderLazy = (comps, base) => `// 懒注册表：tag → 动态 import()。路径/导出名为字面量 → 打包器可静态分析，
// register 页面只携带用到的组件（Tree Shaking + 按需分包）。
// dist 单文件构建（bundle 无 splitting）时 esbuild 会内联这些 import()，脚本直引行为不变。
const L = (path, key) => () => import(path).then((m) => m[key]);
const LAZY = {
${comps.map((c) => `  '${c.tag}': L('${base}/${c.file}', '${c.cls}'),`).join('\n')}
};`;

// charts CHART_TAGS：标签 → 类映射（registerChart 用）
const renderTags = (comps) => `// 标签 → 类映射（registerChart 用）
export const CHART_TAGS = {
${comps.map((c) => `  '${c.tag}': ${c.cls},`).join('\n')}
};`;

// 目标入口配置：dir 扫描目录 / base 相对导入前缀 / regions 区域名 → 渲染函数
export const TARGETS = [
  {
    label: 'main',
    file: 'src/index.js',
    dir: 'src/components',
    base: './components',
    // af-data.js 为 L3.5 Block 层数据源元素，不进组件导出（见 l3.5-block-detailed-design.md）
    exclude: ['af-data.js'],
    regions: {
      entry: (c, t) => renderEntry(c, t.base),
      registry: renderRegistry,
      lazy: (c, t) => renderLazy(c, t.base),
    },
  },
  {
    label: 'charts',
    file: 'src/charts/index.js',
    dir: 'src/charts/components',
    base: './components',
    exclude: [],
    regions: {
      entry: (c, t) => renderEntry(c, t.base),
      tags: renderTags,
    },
  },
];

const startMark = (name) => `// ===== gen:${name}:start`;
const endMark = (name) => `// ===== gen:${name}:end`;

// 对单文件应用全部区域替换；缺 marker 视为集成错误抛出
export function applyGenRegions(code, target, comps) {
  let out = code;
  for (const [name, render] of Object.entries(target.regions)) {
    const re = new RegExp(`^${startMark(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` + String.raw`[^\n]*\n[\s\S]*?^` + endMark(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + String.raw`[^\n]*$`, 'm');
    if (!re.test(out)) throw new Error(`[gen-entry] ${target.file} 缺少区域标记 gen:${name}`);
    out = out.replace(re, [
      `${startMark(name)}（由 scripts/gen-entry.mjs 自动生成，勿手改；新增组件后跑 npm run entry）`,
      render(comps, target),
      endMark(name),
    ].join('\n'));
  }
  return out;
}

// 生成全部目标：返回 [{ label, file, before, after }]
export function generateAll() {
  return TARGETS.map((target) => {
    const comps = scanComponents(target.dir, target.exclude);
    const before = readFileSync(join(ROOT, target.file), 'utf8');
    const after = applyGenRegions(before, target, comps);
    return { label: target.label, file: target.file, before, after };
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const results = generateAll();
  const check = process.argv.includes('--check');
  let drift = false;
  for (const r of results) {
    if (r.before !== r.after) {
      drift = true;
      if (check) {
        console.error(`✗ [${r.label}] ${r.file} 与生成结果不一致，请跑 npm run entry`);
      } else {
        writeFileSync(join(ROOT, r.file), r.after);
        console.log(`✓ [${r.label}] ${r.file} 已重新生成`);
      }
    } else {
      console.log(`✓ [${r.label}] ${r.file} 已是最新`);
    }
  }
  if (check && drift) process.exit(1);
}
