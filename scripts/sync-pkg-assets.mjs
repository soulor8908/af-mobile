// af-mobile —— 包资产快照同步（pkg-publish 设计 §3.7）
// 从仓库真相源生成 @af-mobile/mcp 与 @af-mobile/prompt 的 assets/（两包独立自足）
// 快照为发布态构建产物（gitignore，不入库）；由 build-mcp / build-prompt-pkg 构建时自动生成
// 快照平铺规则与 resolve-asset 的 basename 策略一致；同步逻辑由 test/pkg-assets.test.js 闸门把关
// 用法：node scripts/sync-pkg-assets.mjs
import { cpSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// [源（仓库根相对）, 快照名（平铺）]
export const ASSETS = [
  ['eslint-plugin-af-mobile/utils/whitelist-v1.json', 'whitelist-v1.json'],
  ['src/recipes.css', 'recipes.css'],
  ['src/atomic.css', 'atomic.css'],
  ['prompt/system-prompt.md', 'system-prompt.md'],
  ['prompt/system-prompt.template.md', 'system-prompt.template.md'],
  ['prompt/component-fewshots.md', 'component-fewshots.md'],
  ['prompt/models', 'models'],
];

export function syncAssetsTo(targetDir) {
  mkdirSync(targetDir, { recursive: true });
  for (const [src, flat] of ASSETS) {
    const from = join(ROOT, src);
    const to = join(targetDir, flat);
    if (flat.includes('.')) copyFileSync(from, to);  // 文件
    else cpSync(from, to, { recursive: true });      // 目录（models）
  }
  return ASSETS.length;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  for (const rel of ['mcp/assets', 'prompt/assets']) {
    const n = syncAssetsTo(join(ROOT, rel));
    console.log(`✓ ${rel}/ 已同步（${n} 项）`);
  }
}
