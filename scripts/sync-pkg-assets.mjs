// AIFlow —— 包资产快照同步（pkg-publish 设计 §3.7）
// 从仓库真相源同步到 @af-mobile/mcp 与 @af-mobile/prompt 的 assets/（两包独立自足）
// 快照平铺规则与 resolve-asset 的 basename 策略一致；漂移由 test/pkg-assets.test.js 闸门把关
// 用法：node scripts/sync-pkg-assets.mjs
import { cpSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// [源（仓库根相对）, 快照名（平铺）]
const ASSETS = [
  ['eslint-plugin-aiflow/utils/whitelist-v1.json', 'whitelist-v1.json'],
  ['src/recipes.css', 'recipes.css'],
  ['src/atomic.css', 'atomic.css'],
  ['prompt/system-prompt.md', 'system-prompt.md'],
  ['prompt/system-prompt.template.md', 'system-prompt.template.md'],
  ['prompt/models', 'models'],
];

const TARGETS = ['mcp/assets', 'prompt/assets'];

for (const target of TARGETS) {
  mkdirSync(join(ROOT, target), { recursive: true });
  for (const [src, flat] of ASSETS) {
    const from = join(ROOT, src);
    const to = join(ROOT, target, flat);
    if (flat.includes('.')) copyFileSync(from, to);  // 文件
    else cpSync(from, to, { recursive: true });      // 目录（models）
  }
  console.log(`✓ ${target}/ 已同步（${ASSETS.length} 项）`);
}
