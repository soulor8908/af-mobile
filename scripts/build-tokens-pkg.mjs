// af-mobile —— @af-mobile/tokens 打包
// 产物：tokens/dist/{tokens.json, tokens.css}，均从 src/ 真相源现生成（无提交态快照）
// tokens.json 由 gen-tokens.mjs 解析 tokens.css 产出；tokens.css 原样分发（含 reset/base/主题层）
// 用法：node scripts/build-tokens-pkg.mjs
import { writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTokensFromSources } from './gen-tokens.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'tokens/dist');

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokens.json'), JSON.stringify(buildTokensFromSources(), null, 2) + '\n');
copyFileSync(join(ROOT, 'src/tokens.css'), join(OUT, 'tokens.css'));
console.log('✓ tokens/dist/tokens.json (DTCG)');
console.log('✓ tokens/dist/tokens.css (L1 全量：reset + base + tokens + 主题切换)');
