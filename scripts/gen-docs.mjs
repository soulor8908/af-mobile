// af-mobile UI —— 文档站 API 生成器（P2 Task A）
// 从 src/index.d.ts 解析组件属性/方法/事件，结合组件源码 defineProp 默认值，
// 生成 site/components/af-*.md 文档页（marker：<!-- gen:start:api --> ... <!-- gen:end:api -->）
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// 场景配置可能 import 组件源码（如 demo/scenarios/af-list.js 引 html 工具），
// af-element.js 模块求值需要 HTMLElement——纯 Node 无 DOM，垫空基类（不参与渲染）
globalThis.HTMLElement ??= class {};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// 组件类名 → 标签：AfActionSheet → af-action-sheet
const classToTag = (name) => `af-${name.replace(/^Af/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;

// 段头注释：// af-xxx（P0 · 中文名）
const HEAD_RE = (tag) => new RegExp(`^// ${tag}（([^）]*)）$`, 'm');
// 类定义：export class AfXxx extends Parent { ... }（到行首 `}` 结束）
const CLASS_RE = /export\s+class\s+(Af[A-Za-z]+)\s+extends\s+[A-Za-z]+\s*\{([\s\S]*?)^\}/m;

// —— 类体行解析：属性（可带上一行 JSDoc）/ 方法 / 事件 ——
function parseBody(body) {
  const props = [];
  const methods = [];
  const events = [];
  let doc = '';
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) { doc = ''; continue; }
    const dm = line.match(/^\/\*\* (.*?) \*\/$/);
    if (dm) { doc = dm[1].trim(); continue; }
    const em = line.match(/^addEventListener\(type: '([^']+)'/);
    if (em) { events.push({ name: em[1] }); continue; }
    const mm = line.match(/^([a-zA-Z][\w]*)(\(.*\)):\s*([^;]+);$/);
    if (mm) { methods.push({ name: mm[1], sig: line.replace(/;$/, ''), doc }); doc = ''; continue; }
    const pm = line.match(/^(readonly )?([a-zA-Z][\w]*)\??: (.+);$/);
    if (pm) { props.push({ name: pm[2], type: pm[3].trim(), readonly: !!pm[1], doc }); doc = ''; continue; }
    doc = '';
  }
  return { props, methods, events };
}

// —— 解析 index.d.ts ——
// 定位所有 `export class AfXxx extends AfElement`，向前找最近的 `// af-xxx（…）` 段头，
// 向后到下一个 `export class` 或文件尾，只取类体内属性/方法/事件（避开 interface 定义）。
export function parseDts(code) {
  const out = [];
  const anchors = [...code.matchAll(/^export\s+class\s+(Af[A-Za-z]+)\s+extends\s+AfElement\s*\{/gm)];
  anchors.forEach((a, i) => {
    const tag = classToTag(a[1]);
    const h = code.slice(0, a.index).match(HEAD_RE(tag));
    if (!h) return;
    const end = i + 1 < anchors.length ? anchors[i + 1].index : code.length;
    const clsM = code.slice(h.index, end).match(CLASS_RE);
    if (!clsM) return;
    out.push({ tag, desc: h[1].trim(), cls: a[1], ...parseBody(clsM[2]) });
  });
  return out;
}

// —— 解析 defineProp 默认值 ——
const DEF_RE = /defineProp\([\w.]+\.prototype,\s*'([\w]+)',\s*([^)]+)\);/g;
const parseLiteral = (raw) => {
  const s = raw.trim();
  if (s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) return s.slice(1, -1);
  return s;
};
export function parseDefineProps(src) {
  const defs = {};
  for (const m of src.matchAll(DEF_RE)) defs[m[1]] = parseLiteral(m[2]);
  return defs;
}

// —— 渲染 markdown ——
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');
const fmtDef = (d) => {
  if (d === undefined) return '';
  return typeof d === 'string' ? `'${d}'` : String(d);
};
export function renderMarkdown(c) {
  const propRows = c.props.map((p) => {
    const name = p.readonly ? `${esc(p.name)} *(readonly)*` : esc(p.name);
    return `| ${name} | \`${esc(p.type)}\` | ${esc(fmtDef(p.def))} | ${esc(p.doc)} |`;
  }).join('\n');
  const evtRows = c.events.map((e) => `| \`${esc(e.name)}\` | 触发时：组件内 emit 调用 |`).join('\n');
  const mtdRows = c.methods.map((m) => `| \`${esc(m.sig)}\` | ${esc(m.doc)} |`).join('\n');
  // 示例段：demo/scenarios/{tag}.js 存在时，把每个场景的 html 原样嵌入（主流程已挂到 c.scenarios）
  const examples = (c.scenarios || []).map((s) => `### ${s.name}\n\n\`\`\`html\n${s.html.trim()}\n\`\`\``).join('\n\n');
  const exampleSection = examples ? `## 示例\n\n${examples}\n\n` : '';
  // 在线调试：相对路径 ../demo/playground/index.html，从 /v/components/{tag}.html 解析到 /v/demo/playground/
  // 必须显式带 index.html：VitePress dev 对 public 目录不做 index 解析（生产 GH Pages 两种形式均可）
  const playground = `## 在线调试\n\n<iframe src="../demo/playground/index.html?c=${c.tag}" width="100%" height="600" frameborder="0" loading="lazy"></iframe>\n\n`;
  return `# ${c.tag}\n\n> ${c.desc}\n\n${playground}${exampleSection}## API\n\n<!-- gen:start:api -->\n### 属性\n\n| 属性 | 类型 | 默认值 | 说明 |\n| --- | --- | --- | --- |\n${propRows}\n\n### 事件\n\n| 事件名 | 说明 |\n| --- | --- |\n${evtRows}\n\n### 方法\n\n| 签名 | 说明 |\n| --- | --- |\n${mtdRows}\n<!-- gen:end:api -->\n`;
}

// —— 主流程：遍历 src/components/af-*.js，按段头定位 d.ts 段并生成文档页 ——
function findComponent(code, tag) {
  const h = code.match(HEAD_RE(tag));
  if (!h) return null;
  const clsM = code.slice(h.index).match(CLASS_RE);
  if (!clsM) return null;
  return { tag, desc: h[1].trim(), cls: clsM[1], ...parseBody(clsM[2]) };
}

export async function main() {
  const dts = readFileSync(join(ROOT, 'src/index.d.ts'), 'utf8');
  const outDir = join(ROOT, 'site/components');
  mkdirSync(outDir, { recursive: true });
  const files = readdirSync(join(ROOT, 'src/components')).filter((f) => /^af-.*\.js$/.test(f));
  let n = 0;
  for (const f of files) {
    const tag = f.replace(/\.js$/, '');
    const c = findComponent(dts, tag);
    if (!c) continue; // 无 d.ts 段的组件（如 af-data）跳过
    const defs = parseDefineProps(readFileSync(join(ROOT, 'src/components', f), 'utf8'));
    c.props = c.props.map((p) => ({ ...p, def: defs[p.name] }));
    // 场景示例：demo/scenarios/{tag}.js 存在则挂到 c.scenarios，renderMarkdown 在 ## API 前插入 ## 示例
    const scPath = join(ROOT, 'demo/scenarios', `${tag}.js`);
    if (existsSync(scPath)) {
      const spec = (await import(pathToFileURL(scPath).href)).default;
      c.scenarios = spec?.scenarios;
    }
    writeFileSync(join(outDir, `${tag}.md`), renderMarkdown(c));
    n++;
  }
  console.log(`✓ gen-docs: 生成/更新 ${n} 个组件文档页`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1); });
