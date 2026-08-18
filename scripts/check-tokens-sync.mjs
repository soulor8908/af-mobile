// af-mobile UI —— tokens.json 与 tokens.css 同步检查（CI）
// 双向 diff：tokens.css（权威源）解析出的 DTCG 树 == 已提交的 src/tokens.json
// 用法：node scripts/check-tokens-sync.mjs
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTokensFromSources } from './gen-tokens.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_PATH = join(ROOT, 'src/tokens.json');

function main() {
  const generated = JSON.stringify(buildTokensFromSources(), null, 2) + '\n';
  const committed = readFileSync(TOKENS_PATH, 'utf8');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  tokens.json ↔ tokens.css 同步检查               ║');
  console.log('╚══════════════════════════════════════════════════╝');
  if (generated === committed) {
    console.log('✓ tokens.json 与 tokens.css 同步');
    process.exit(0);
  }
  console.error('✗ tokens.json 与 tokens.css 不同步');
  console.error('  修复：运行 `npm run tokens` 重新生成 src/tokens.json');
  process.exit(1);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
