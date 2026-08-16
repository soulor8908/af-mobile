// 一次性 codemod：defineProp 对象形式 → 紧凑形式（跑完即删）
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const inferType = (v) => v === "[]" ? 'Array'
  : /^['"`]/.test(v) ? 'String'
  : /^(true|false)$/.test(v) ? 'Boolean'
  : /^-?[\d.]+$/.test(v) ? 'Number'
  : null; // null / 其他 → 推断不了

const files = execSync("rg -l 'defineProp\\(' src/", { encoding: 'utf8' }).trim().split('\n').filter(f => f.endsWith('.js'));
let total = 0, left = 0;
for (const f of files) {
  let src = readFileSync(f, 'utf8');
  const re = /AfElement\.defineProp\((\w+(?:\.\w+)*)\.prototype, '(\w+)', \{ (?:attr: '([\w-]+)', )?type: (\w+), default: (.+?) \}\);/g;
  src = src.replace(re, (m, cls, name, attr, type, def) => {
    const it = inferType(def);
    const attrOk = !attr || attr === kebab(name);
    const typeOk = it === type || (def === 'null' && type === 'String');
    if (attrOk && typeOk) { total++; return `AfElement.defineProp(${cls}.prototype, '${name}', ${def});`; }
    left++;
    return m;
  });
  writeFileSync(f, src);
}
console.log(`compact: ${total}, kept object form: ${left}`);
