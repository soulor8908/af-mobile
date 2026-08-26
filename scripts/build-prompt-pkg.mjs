// af-mobile —— @af-mobile/prompt 打包（pkg-publish 设计 §3.6）
// 产物：prompt/dist/index.mjs（build-prompt 全量 bundle，零 external，纯 node 内建）
import { build } from 'esbuild';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncAssetsTo } from './sync-pkg-assets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

syncAssetsTo(join(ROOT, 'prompt/assets'));

await build({
  entryPoints: [join(ROOT, 'scripts/build-prompt.mjs')],
  outfile: join(ROOT, 'prompt/dist/index.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  logLevel: 'info',
});
console.log('✓ prompt/dist/index.mjs (bundled, assets via <pkg>/assets)');
