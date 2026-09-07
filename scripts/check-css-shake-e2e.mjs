// af-mobile UI —— afMobileShakeCss 真实构建回归（OPT-9）
//
// 为什么需要本脚本：单测（test/vite-css-shake.test.js）直接驱动 postcss 插件对象，
// 能验证裁剪语义，但证明不了「Vite 会不会真的把插件接进 CSS 管道」。CSS 裁剪一旦
// 接线失效，表现为体积不降——静默、无报错、极易长期不被发现，故必须有真实构建回归。
//
// 做法：同一个最小消费端工程构建两次（不开插件 / 开插件），比对产物 CSS。
//   fixture 内联生成，落在 ROOT/.cache/css-shake-e2e（gitignored，可整体删）
// 用法：npm run css:e2e（node scripts/check-css-shake-e2e.mjs）
// 依赖：仓库 devDependencies 的 vite（无浏览器依赖，秒级完成）
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { afMobileShakeCss } from '../src/vite.js';

const ROOT = join(fileURLToPath(import.meta.url), '../..');
const WORK = join(ROOT, '.cache', 'css-shake-e2e');

// fixture 里静态用到的 class（必须在裁剪后保留）
const USED = ['btn', 'card'];
// fixture 里没用到的 L2 配方 class（必须在裁剪后消失）
const UNUSED = 'rate';

mkdirSync(join(WORK, 'src'), { recursive: true });
writeFileSync(
  join(WORK, 'index.html'),
  '<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module" src="/main.js"></script></body></html>'
);
writeFileSync(join(WORK, 'main.js'), "import './src/page.js';\nimport '../../src/index.css';\n");
writeFileSync(
  join(WORK, 'src', 'page.js'),
  `export const html = '<div class="${USED.join(' ')}">hi</div>';\n`
);

async function buildOnce(withShake, outDir) {
  await build({
    root: WORK,
    logLevel: 'silent',
    plugins: withShake ? [afMobileShakeCss()] : [],
    build: { outDir, emptyOutDir: true, cssCodeSplit: false, minify: false },
  });
  const assets = join(outDir, 'assets');
  const file = readdirSync(assets).find((f) => f.endsWith('.css'));
  return readFileSync(join(assets, file), 'utf8');
}

let failed = 0;
const fail = (msg) => {
  failed += 1;
  console.error(`✗ ${msg}`);
};

try {
  const full = await buildOnce(false, join(WORK, 'dist-full'));
  const shaken = await buildOnce(true, join(WORK, 'dist-shaken'));

  if (!(shaken.length < full.length)) {
    fail(`裁剪未生效：全量 ${full.length} 字节，裁剪后 ${shaken.length} 字节（未减少）`);
  }
  for (const c of USED) {
    if (!shaken.includes(`.${c}`)) fail(`用到的 class .${c} 被误删`);
  }
  if (!full.includes(`.${UNUSED}`)) {
    fail(`基准 CSS 中不含 .${UNUSED}，用例前提失效（需换一个未使用的配方 class）`);
  } else if (shaken.includes(`.${UNUSED}`)) {
    fail(`未使用的 class .${UNUSED} 未被裁剪`);
  }
  if (!shaken.includes(':root')) fail(':root 变量被误删');
  if (!/\baf-[a-z]/.test(shaken)) fail('af-* 组件宿主样式被误删');

  const pct = (1 - shaken.length / full.length) * 100;
  console.log(`  全量 ${(full.length / 1024).toFixed(1)}KB → 裁剪后 ${(shaken.length / 1024).toFixed(1)}KB（-${pct.toFixed(1)}%）`);
} catch (e) {
  fail(`构建异常：${e.message}`);
}

if (failed) {
  console.error(`✗ afMobileShakeCss 真实构建回归失败（${failed} 项）`);
  process.exit(1);
}
console.log('✓ afMobileShakeCss 真实构建回归通过（OPT-9 CSS 按需）');
