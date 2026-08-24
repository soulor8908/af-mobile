import { encode } from 'gpt-tokenizer';
import fs from 'fs';
const tok = (s) => encode(s).length;
const read = (f) => fs.readFileSync(f, 'utf8');
console.log('任务\tA行数\tA tokens\tB行数\tB tokens');
let aT = 0, bT = 0, aL = 0, bL = 0;
for (const t of ['t1', 't2', 't3', 't4', 't5']) {
  const a = read(`solA/${t}.mjs`), b = read(`solB/${t}.mjs`);
  const al = a.split('\n').length, bl = b.split('\n').length;
  const at = tok(a), bt = tok(b);
  aT += at; bT += bt; aL += al; bL += bl;
  console.log(`${t}\t${al}\t${at}\t${bl}\t${bt}`);
}
console.log(`合计\t${aL}\t${aT}\t${bL}\t${bT}`);
const pa = read('promptA.md'), pb = read('promptB.md');
console.log(`promptA=${tok(pa)} promptB=${tok(pb)}`);
console.log(`A 会话成本 = ${tok(pa) + aT}（prompt+代码，1轮）`);
console.log(`B 会话成本 = ${tok(pb) + bT}（prompt+代码，1轮）`);
console.log(`B/A 代码量 = ${(bT / aT * 100).toFixed(1)}%  B/A 总成本 = ${((tok(pb) + bT) / (tok(pa) + aT) * 100).toFixed(1)}%`);
