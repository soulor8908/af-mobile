// 可选：标准化代码 token 统计（与 B3 同口径，gpt-tokenizer 计数）
// npm i -D gpt-tokenizer && node tokens.mjs results/<model>/solA results/<model>/solB
import { encode } from 'gpt-tokenizer';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const tok = (s) => encode(s).length;
const dirA = resolve(HERE, process.argv[2] || './solA');
const dirB = resolve(HERE, process.argv[3] || './solB');
const read = (d, t) => readFileSync(join(d, `${t}.mjs`), 'utf8');

let aT = 0, bT = 0, aL = 0, bL = 0;
console.log('任务\tA行数\tA tokens\tB行数\tB tokens');
for (const t of ['t1', 't2', 't3', 't4', 't5']) {
  try {
    const a = read(dirA, t), b = read(dirB, t);
    const al = a.split('\n').length, bl = b.split('\n').length;
    const at = tok(a), bt = tok(b);
    aT += at; bT += bt; aL += al; bL += bl;
    console.log(`${t}\t${al}\t${at}\t${bl}\t${bt}`);
  } catch { console.log(`${t}\t(缺文件)`); }
}
console.log(`合计\t${aL}\t${aT}\t${bL}\t${bT}`);
if (aT) {
  console.log(`\nB/A 代码 token 比 = ${(bT / aT * 100).toFixed(1)}%`);
}
const pa = readFileSync(join(HERE, 'prompts/promptA.md'), 'utf8');
const pb = readFileSync(join(HERE, 'prompts/promptB.md'), 'utf8');
console.log(`promptA(现状速查) ${tok(pa)} tokens | promptB(k词表卡) ${tok(pb)} tokens`);
