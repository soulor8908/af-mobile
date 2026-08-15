// 临时：重跑 020/048/052 三条 pass@3，补瞬时网络失败
import { readFileSync } from 'node:fs';
import { generate } from '../scripts/generate.mjs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ids = ['020', '048', '052'];
const prompts = readFileSync(join(ROOT, 'eval/prompts.jsonl'), 'utf8')
  .split('\n').filter(Boolean).map(JSON.parse)
  .filter(p => ids.includes(p.id));

for (const p of prompts) {
  let ok = false;
  for (let k = 0; k < 3 && !ok; k++) {
    const out = join(ROOT, 'eval/results/retry', `${p.id}-k${k}.html`);
    const r = await generate(p.prompt, { outputPath: out });
    ok = r.ok;
    console.log(`[${p.id}] attempt k${k}:`, r.ok ? 'OK' : `FAIL exit=${r.exitCode} ${r.error||''}`);
  }
}