// AIFlow UI —— 文档站 API 底稿生成器
// 从 src/index.d.ts 提取组件属性/事件/方法 → 生成 site/components/af-*.md 的生成区
// marker 结构：<!-- gen:start:xxx --> ... <!-- gen:end:xxx -->，只重写 marker 内内容，人工区保留
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DTS = join(ROOT, 'src/index.d.ts');
const DEMO_IDX = join(ROOT, 'demo/index.html');
const OUT_DIR = join(ROOT, 'site/components');
const LIST_JSON = join(ROOT, 'site/.vitepress/component-list.json');
const SCEN_DIR = join(ROOT, 'demo/scenarios');

// 组件类名 → 标签：AfActionSheet → af-action-sheet
const classToTag = (name) =>
  name.replace(/^Af/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');

// 从 d.ts 的一个组件类块提取属性/方法/事件
export function parseClassBlock(block) {
  const props = [];
  const events = [];
  const methods = [];
  let desc = '';
  for (const raw of block.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const cm = line.match(/^\/\*\*(.*?)\*\//);
    if (cm) { desc = cm[1].trim(); continue; }
    if (line.startsWith('}')) continue;
    if (line.startsWith('//') || /\bstatic\s/.test(line)) { desc = ''; continue; }
    // 事件：addEventListener(type: 'af-x:ev', ...)
    const ev = line.match(/^addEventListener\(type:\s*['"]([a-z][\w:-]*)['"]/);
    if (ev) { events.push(ev[1]); continue; }
    // 方法：name(args...): Type;
    const md = line.match(/^([a-zA-Z][a-zA-Z0-9]*)\s*\([^)]*\)\s*:\s*([^;]*);/);
    if (md) { methods.push({ name: md[1], sig: line.replace(/;$/, '') }); desc = ''; continue; }
    // 属性：readonly? name: Type;
    const pr = line.match(/^(readonly\s+)?([a-zA-Z][a-zA-Z0-9]*)\s*:\s*([^=;]+);/);
    if (pr && !pr[2].includes('(')) { props.push({ name: pr[2], type: pr[3].trim(), readonly: !!pr[1], desc }); desc = ''; }
  }
  return { props, events, methods };
}

const tbl = (headers, rows) =>
  `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n` +
  (rows.length ? rows.join('\n') : `| ${headers.map(() => '—').join(' | ')} |`);

const propsTable = (api) =>
  tbl(['属性', '类型', '说明'], api.props.map((p) => `| ${esc(p.name)}${p.readonly ? ' *(readonly)*' : ''} | \`${esc(p.type)}\` | ${esc(p.desc)} |`));
const eventsTable = (evts) => tbl(['事件名', '说明'], evts.map((e) => `| \`${esc(e)}\` |  |`));
const methodsTable = (m) => tbl(['方法', '签名'], m.map((x) => `| \`${esc(x.name)}\` | \`${esc(x.sig)}\` |`));

// 从场景文件构建「示例」区：Playground iframe + 逐个场景代码块
// 场景文件仅作数据源；无场景文件则输出占位说明
async function scenariosSection(tag) {
  const path = join(SCEN_DIR, `af-${tag}.js`);
  if (!existsSync(path)) return '## 示例\n\n<!-- 无 Playground 场景（可补充 demo/scenarios/af-<tag>.js） -->';
  const mod = await import(path);
  const cfg = mod.default;
  const list = cfg.scenarios || [];
  const url = `/v/demo/playground.html?c=af-${tag}`;
  const lines = [`## 示例\n\n<iframe src="${url}" width="100%" height="520" style="border:1px solid var(--vp-c-divider);border-radius:8px;background:#fff" title="af-${tag} Playground"></iframe>`];
  list.forEach((s, i) => {
    lines.push(`### ${i + 1}. ${s.name}`);
    lines.push('```html', s.html.trimEnd(), '```');
  });
  return lines.join('\n');
}

// 追加/重建生成区，保留 marker 之前的人工区（标题 / 开头说明）
function upsert(file, header, sections) {
  let text;
  if (!existsSync(file)) {
    text = header + '\n';
  } else {
    const cur = readFileSync(file, 'utf8');
    const i = cur.indexOf('<!-- gen:start:');
    let manual = i >= 0 ? cur.slice(0, i).trimEnd() : header;
    // 幂等：移除人工区残留的生成结构标题（## 示例 / ## API），避免重复
    manual = manual.replace(/(\n## (?:示例|API)\s*)+$/g, '');
    text = manual + '\n';
  }
  for (const [key, content] of sections) {
    text += `<!-- gen:start:${key} -->\n${content}\n<!-- gen:end:${key} -->\n`;
  }
  writeFileSync(file, text);
}

export async function generateDocs() {
  const dts = readFileSync(DTS, 'utf8');
  const demo = existsSync(DEMO_IDX) ? readFileSync(DEMO_IDX, 'utf8') : '';
  const names = [...dts.matchAll(/^export class (Af[A-Za-z]+) extends AfElement \{/gm)].map((m) => m[1]);
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(dirname(LIST_JSON), { recursive: true });
  const list = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const start = dts.indexOf(`class ${name} `);
    const end = i + 1 < names.length ? dts.indexOf(`class ${names[i + 1]} `, start + name.length) : dts.length;
    const tag = classToTag(name);
    const tm = demo.match(new RegExp(`>af-${tag}\\s+([^<\\n]+)</span>`));
    const title = tm ? tm[1].trim() : tag;
    const api = parseClassBlock(dts.slice(start, end));
    const file = join(OUT_DIR, `af-${tag}.md`);
    upsert(file, `# af-${tag} ${title}`, [
      ['scenarios', await scenariosSection(tag)],
      ['props', '## API\n\n' + propsTable(api)],
      ['events', eventsTable(api.events)],
      ['methods', methodsTable(api.methods)],
    ]);
    list.push({ tag, className: name, title });
  }
  writeFileSync(LIST_JSON, JSON.stringify(list, null, 2) + '\n');
  return list.length;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const n = await generateDocs();
    console.log(`✓ docs:gen 完成，${n} 个组件`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}