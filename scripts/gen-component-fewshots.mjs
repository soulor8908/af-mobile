// af-mobile UI —— 组件用法 few-shot 编译器（demo 即教材 → System Prompt 内联片段）
// 源：demo/scenarios/af-*.js 的可选 fewshot: { html, js, note } 字段（手写最小用法，人审）
// 回退：无 fewshot 时从场景 html 提取主组件标签骨架 + events 数组生成接线模板（保底全覆盖）
// 校验：片段中 af-* 标签与 class 必须 ∈ whitelist-v1.json（防教材教坏 AI，同 demo:check 思路）
// 产物：prompt/component-fewshots.md（按 ### <tag> 分节，build-prompt.mjs 的 buildHitSection 按需内联）
// 用法：
//   node scripts/gen-component-fewshots.mjs           # 生成/覆写产物
//   node scripts/gen-component-fewshots.mjs --check   # 比对磁盘产物，不一致 exit 1（CI 闸门）
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { resolveAsset } from './resolve-asset.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCENARIO_DIR = join(ROOT, 'demo/scenarios');
const OUT = join(ROOT, 'prompt/component-fewshots.md');

// ===== 回退提取：场景 html → 主组件标签骨架 =====
function extractTagSkeleton(html, tag) {
  const open = new RegExp('<' + tag + '(?:\\s[^>]*)?>', 's').exec(html);
  if (!open) return null;
  const openTag = open[0].replace(/\s+/g, ' ').replace(/\s>/g, '>').trim();
  return openTag.endsWith('/>') ? openTag : openTag + '</' + tag + '>';
}

// ===== 回退提取：events 数组 → 接线模板 =====
function buildEventsTemplate(events, tag) {
  const lines = [
    "const el = document.querySelector('" + tag + "');",
  ];
  for (const evt of events) {
    lines.push("el.addEventListener('" + evt + "', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准");
  }
  return lines.join('\n');
}

// ===== 合规校验：标签 ∈ whitelist components；class ∈ whitelist classes =====
function validateShot(tag, shot, wl) {
  const errors = [];
  const knownTags = new Set(wl.components);
  const knownClasses = new Set([...wl.classes.recipe, ...wl.classes.atomic]);
  for (const m of shot.html.matchAll(/<(\/?)(af-[a-z-]+)/g)) {
    if (m[1] === '/' || m[2] === tag) continue; // 闭合标签与主标签跳过
    if (!knownTags.has(m[2])) errors.push(`未知组件标签 <${m[2]}>`);
  }
  for (const m of shot.html.matchAll(/class="([^"]*)"/g)) {
    for (const cls of m[1].trim().split(/\s+/)) {
      if (cls && !knownClasses.has(cls)) errors.push(`白名单外 class：.${cls}`);
    }
  }
  return errors;
}

// ===== 单组件编译：优先手写 fewshot，否则回退提取 =====
function compileShot(mod, wl) {
  const tag = mod.tag;
  const knownTags = new Set(wl.components);
  if (!knownTags.has(tag)) return { skip: true }; // 子库/L3.5 Block 不进 System Prompt
  const withShot = (mod.scenarios || []).find(s => s.fewshot);
  let shot;
  if (withShot) {
    shot = withShot.fewshot;
  } else {
    const first = (mod.scenarios || [])[0];
    if (!first) return { skip: true };
    const skeleton = extractTagSkeleton(first.html || '', tag);
    if (!skeleton) return { skip: true };
    const events = first.events || [];
    shot = {
      html: skeleton,
      js: events.length ? buildEventsTemplate(events, tag) : '',
      note: '最小骨架（回退生成）；完整场景读本文件 scenarios',
    };
  }
  const errors = validateShot(tag, shot, wl);
  return { tag, shot, errors };
}

// ===== 产物渲染 =====
function render(names, shots) {
  const lines = [
    '<!-- 由 scripts/gen-component-fewshots.mjs 自动生成，勿手改；源：demo/scenarios/af-*.js -->',
    '<!-- 手写 fewshot 字段的组件优先内联；其余为回退骨架。协议见 demo/scenarios/af-picker.js 头注释 -->',
    '',
  ];
  for (const name of names) {
    const { shot } = shots[name];
    lines.push('### <' + name + '>');
    lines.push('');
    lines.push('```html');
    lines.push(shot.html.trim());
    lines.push('```');
    lines.push('');
    if (shot.js && shot.js.trim()) {
      lines.push('```js');
      lines.push(shot.js.trim());
      lines.push('```');
      lines.push('');
    }
    if (shot.note) lines.push('- ' + shot.note);
    lines.push('');
  }
  return lines.join('\n');
}

// ===== 场景模块加载：剥 import 行 + DOM stub 后经 data URL 导入 =====
// 场景文件顶层是纯数据对象（init 闭包不被调用），但可能 import DOM 依赖源码，
// 或顶层自注册（如 charts 场景的 customElements.define）；Node 无 DOM 环境，前置 stub 兜底。
const DOM_STUB = 'const _noop=()=>{};'
  + 'globalThis.customElements??={get:_noop,define:_noop};'
  + 'globalThis.HTMLElement??=class{};'
  + 'globalThis.document??={getElementById:_noop,querySelector:_noop};'
  + 'globalThis.window??={};';
async function loadScenario(file) {
  const src = readFileSync(join(SCENARIO_DIR, file), 'utf8');
  const stripped = src
    .replace(/^import\s.+;?\s*$/gm, '') // import 行（DOM 依赖源码）
    .replace(/^if\s*\(!customElements\.get\(.+\)\)\s*customElements\.define\(.+;\s*$/gm, '') // 顶层组件自注册
    .replace(/^register[A-Za-z]*\s*\(\s*\)\s*;?\s*$/gm, ''); // 子库顶层注册调用（registerChat 等）
  const url = 'data:text/javascript;base64,' + Buffer.from(DOM_STUB + stripped, 'utf8').toString('base64');
  try {
    return (await import(url)).default;
  } catch (e) {
    console.error(`⚠ ${file} 加载失败，跳过（${e.message.split('\n')[0]}）`);
    return null;
  }
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const wl = JSON.parse(readFileSync(resolveAsset('eslint-plugin-af-mobile/utils/whitelist-v1.json'), 'utf8'));
  const files = readdirSync(SCENARIO_DIR).filter(f => /^af-[a-z-]+\.js$/.test(f)).sort();

  const shots = {};
  const invalid = [];
  const skipped = [];
  for (const f of files) {
    const mod = await loadScenario(f);
    if (!mod || !mod.tag || !Array.isArray(mod.scenarios)) continue;
    const r = compileShot(mod, wl);
    if (r.skip) { skipped.push(f); continue; }
    if (r.errors.length) {
      console.error(`✗ ${f} fewshot 合规校验失败：`);
      r.errors.forEach(e => console.error(`  - ${e}`));
      invalid.push(f);
      continue;
    }
    shots[r.tag] = r;
  }
  if (invalid.length) process.exit(1);

  const names = Object.keys(shots).sort();
  const md = render(names, shots);

  if (checkOnly) {
    let committed = null;
    try { committed = readFileSync(OUT, 'utf8'); } catch { /* 未生成 */ }
    if (committed !== md) {
      console.error('✗ prompt/component-fewshots.md 与 demo/scenarios 不同步');
      console.error('修复：运行 `npm run fewshots:gen` 重新生成后提交');
      process.exit(1);
    }
    console.log(`✓ component-fewshots.md 同步（${names.length} 组件）`);
    return;
  }

  writeFileSync(OUT, md);
  console.log(`✓ prompt/component-fewshots.md 生成（${names.length} 组件，回退骨架 ${skipped.length}）`);
  if (skipped.length) console.log('  无场景/无标签跳过：' + skipped.join(', '));
}

main();
