#!/usr/bin/env node
// af-mobile UI —— L3.5 Block 脚手架（一键生成 + 同步六源 + 自检）
// 用法：
//   node scripts/new-block.mjs <tag> [options]
//   node scripts/new-block.mjs af-product-card --purpose "商品卡片" --variant "default,grid" --props "title,price,items,loading" --events "itemclick"
//
// 六源同步：
//   1. src/blocks/af-<tag>.js          五态骨架（loading/error/empty/success）+ a11y + 键盘导航
//   2. test/af-<tag>.test.js           8 个冒烟测试（五态 + 交互 + a11y + XSS）
//   3. src/index.js                    import + export（按需 import 模式，无全量注册器）
//   4. src/index.d.ts                  interface + class 声明
//   5. scripts/build-prompt.mjs        BLOCK_META 追加一行
//   6. src/lib/i18n.js                 zh-CN + en-US 字典追加 5 个 key
//
// 生成后自动跑：whitelist + prompt + vitest + size + types + prompt:check
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BLOCKS_DIR = join(ROOT, 'src/blocks');
const TEST_DIR = join(ROOT, 'test');
const INDEX_JS = join(ROOT, 'src/index.js');
const INDEX_DTS = join(ROOT, 'src/index.d.ts');
const BUILD_PROMPT_MJS = join(ROOT, 'scripts/build-prompt.mjs');
const I18N_JS = join(ROOT, 'src/lib/i18n.js');

// ─── 参数解析 ──────────────────────────────────────────────
const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('-')) {
  console.error('用法: node scripts/new-block.mjs <tag> [--purpose P] [--variant V1,V2] [--props p1,p2] [--events e1,e2] [--dry-run]');
  console.error('示例: node scripts/new-block.mjs af-product-card --purpose "商品卡片" --variant "default,grid" --props "title,price,items,loading" --events "itemclick"');
  process.exit(1);
}
const tag = args[0];
const getOpt = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : null;
};
const purpose = getOpt('purpose') || 'Block';
const variants = (getOpt('variant') || 'default').split(',').map(s => s.trim());
const props = (getOpt('props') || 'title,items,variant,loading').split(',').map(s => s.trim());
const events = (getOpt('events') || 'itemclick').split(',').map(s => s.trim());
const dryRun = args.includes('--dry-run');

// ─── 校验 ─────────────────────────────────────────────────
if (!/^af-[a-z][a-z0-9-]*$/.test(tag)) {
  console.error('✗ tag 必须匹配 af-<name> 格式（小写+连字符）');
  process.exit(1);
}
if (existsSync(join(BLOCKS_DIR, tag + '.js'))) {
  console.error('✗ Block 已存在: ' + tag);
  process.exit(1);
}
if (props.length > 6) {
  console.error('✗ props 数量超限（≤6，wc-block-props-count 规则）');
  process.exit(1);
}
if (variants.length > 4) {
  console.error('✗ variant 数量超限（≤4）');
  process.exit(1);
}
if (events.length > 3) {
  console.error('✗ events 数量超限（≤3，避免体积超 1.6KB）');
  process.exit(1);
}

// ─── 派生名称 ─────────────────────────────────────────────
// af-product-card → AfProductCard
const cls = 'Af' + tag.split('-').slice(1).map(p => p[0].toUpperCase() + p.slice(1)).join('');
// af-product-card → pc（i18n key 前缀，取每段首字母）
const i18nPrefix = tag.split('-').slice(1).map(p => p[0]).join('');
const mainEvent = events[0]; // 用于 _bindItemClicks 的默认事件
const blockFile = join(BLOCKS_DIR, tag + '.js');
const testFile = join(TEST_DIR, tag + '.test.js');

console.log('╔══════════════════════════════════════════════════╗');
console.log(`║  生成 Block: ${tag.padEnd(36).slice(0, 36)}║`);
console.log('╚══════════════════════════════════════════════════╝');
console.log(`  类名:      ${cls}`);
console.log(`  用途:      ${purpose}`);
console.log(`  variant:   ${variants.join(' / ')}`);
console.log(`  props:     ${props.join(', ')}`);
console.log(`  events:    ${events.map(e => tag + ':' + e).join(', ')} + ${tag}:retry（内置）`);
console.log(`  i18n 前缀: ${i18nPrefix}`);
console.log('');

// ─── 1. 生成 Block 源码 ───────────────────────────────────
function genBlockSource() {
  // props 的 defineProp 声明
  const propDecls = props.map(p => {
    let type = 'String';
    let def = "''";
    if (p === 'loading') { type = 'Boolean'; def = 'false'; }
    else if (p === 'items') { type = 'Array'; def = '[]'; }
    else if (p === 'variant') { type = 'String'; def = `'${variants[0]}'`; }
    else if (p === 'disabled') { type = 'Boolean'; def = 'false'; }
    else if (p === 'checked') { type = 'Boolean'; def = 'false'; }
    return `AfElement.defineProp(${cls}.prototype, '${p}', { type: ${type}, default: ${def} });`;
  }).join('\n');

  const watchAttrs = props.map(p => `'${p}'`).join(', ');
  const variantComment = variants.join(' / ');

  return `// af-mobile UI —— L3.5 Block：${tag}（${purpose}）
// Light DOM，五态（loading/error/empty/success）+ a11y + 键盘导航
// variant: ${variantComment}
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

const ARROW = '›';
const SKEL_ROWS = 4;

export class ${cls} extends AfElement {
  static useShadow = false;
  static i18n = {
    '@': ['aria-label', '${i18nPrefix}.al'],
    '[data-role="empty-text"]': ['', '${i18nPrefix}.em'],
    '[data-role="loading-text"]': ['', '${i18nPrefix}.ld'],
    '[data-role="error-text"]': ['', '${i18nPrefix}.er'],
    '[data-role="retry-btn"]': ['', '${i18nPrefix}.rt'],
  };

  constructor() {
    super();
    this._activeIndex = -1;
    this._error = null;
  }

  mounted() {
    this._render();
    this._bindKeydown();
  }

  _wrap(body, live = '') {
    const al = this.title ? \` aria-label="\${esc(this.title)}"\` : '';
    const head = this.title ? \`<div class="list-item"><div class="caption">\${esc(this.title)}</div></div>\` : '';
    const liveAttr = live ? \` \${live}\` : '';
    return \`<section class="card" role="group"\${al}\${liveAttr}>\${head}\${body}</section>\`;
  }

  _render() {
    if (this.loading) {
      this.setAttribute('aria-busy', 'true');
      const rows = '<div class="list-item"><div class="skeleton skeleton-line"></div></div>'.repeat(SKEL_ROWS);
      this.innerHTML = this._wrap(\`<div class="list" data-role="loading" aria-live="polite">\${rows}<div class="caption t-center p-2" data-role="loading-text"></div></div>\`);
      return;
    }
    this.removeAttribute('aria-busy');
    if (this._error) {
      this.innerHTML = this._wrap(\`<div class="empty" data-role="error" aria-live="assertive"><div class="body" data-role="error-text"></div><button class="btn btn-ghost btn-sm" data-role="retry-btn" type="button"></button></div>\`);
      this.$('[data-role="retry-btn"]').addEventListener('click', () => {
        this._error = null;
        this.emit('${tag}:retry', {});
        this._render();
        this._applyI18n();
      });
      return;
    }
    if (!this.items?.length) {
      this.innerHTML = this._wrap(\`<div class="empty" data-role="empty"><div class="body" data-role="empty-text"></div></div>\`);
      return;
    }
    const rows = this.items.map((it, i) => this._renderItem(it, i)).join('');
    this.innerHTML = this._wrap(\`<div class="list" role="list" tabindex="0" data-role="list">\${rows}</div>\`, 'aria-live="polite"');
    this._listEl = this.$('[data-role="list"]');
    this._itemEls = this.$$('.list-item[data-index]');
    this._bindItemClicks();
  }

  _renderItem(item, i) {
    const dis = item.disabled ? ' aria-disabled="true"' : '';
    const label = \`<span class="body">\${esc(item.label ?? '')}</span>\`;
    const tail = item.action === 'arrow' ? \`<span class="caption" aria-hidden="true">\${ARROW}</span>\` : '';
    return \`<div class="list-item" role="listitem" data-index="\${i}" tabindex="-1"\${dis}>\${label}\${tail}</div>\`;
  }

  _bindItemClicks() {
    this._onClick = (e) => {
      const row = e.target.closest('.list-item[data-index]');
      if (!row || row.hasAttribute('aria-disabled')) return;
      const idx = Number(row.dataset.index);
      this.emit('${tag}:${mainEvent}', { index: idx, item: this.items[idx] });
    };
    this._listEl.addEventListener('click', this._onClick);
  }

  _bindKeydown() {
    this._onKeydown = (e) => {
      if (!this._listEl || !this._itemEls?.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        this._activeIndex = (this._activeIndex + dir + this._itemEls.length) % this._itemEls.length;
        this._itemEls[this._activeIndex]?.focus();
      } else if (e.key === 'Enter' && this._activeIndex >= 0) {
        e.preventDefault();
        const row = this._itemEls[this._activeIndex];
        if (!row.hasAttribute('aria-disabled')) {
          this.emit('${tag}:${mainEvent}', { index: this._activeIndex, item: this.items[this._activeIndex] });
        }
      }
    };
    this.addEventListener('keydown', this._onKeydown);
  }

  setError(err) {
    this._error = err;
    this._render();
    this._applyI18n();
  }

  onAttributeChange(name) {
    if (!this._mounted) return;
    if ([${watchAttrs}].includes(name)) {
      this._render();
      this._applyI18n();
    }
  }

  unmounted() {
    this.removeEventListener('keydown', this._onKeydown);
    this._listEl?.removeEventListener('click', this._onClick);
  }
}

${propDecls}
`;
}

// ─── 2. 生成冒烟测试 ─────────────────────────────────────
function genTestSource() {
  const mainEventName = `${tag}:${mainEvent}`;
  return `import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ${cls} } from '../src/blocks/${tag}.js';
customElements.define('${tag}', ${cls});

function makeEl(props = {}) {
  const el = new ${cls}();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('${tag} 五态', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('loading=true 渲染骨架屏 + aria-busy', () => {
    const el = makeEl({ loading: true, title: '${purpose}' });
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.$('[data-role="loading"]')).not.toBeNull();
    expect(el.$$('.skeleton-line').length).toBeGreaterThanOrEqual(4);
  });

  it('空 items 渲染 empty 态', () => {
    const el = makeEl({ items: [], title: '${purpose}' });
    expect(el.$('[data-role="empty"]')).not.toBeNull();
  });

  it('setError 触发 error 态 + 重试按钮', () => {
    const el = makeEl({ items: [{ label: 'x' }] });
    el.setError(new Error('网络错误'));
    expect(el.$('[data-role="error"]')).not.toBeNull();
    expect(el.$('[data-role="retry-btn"]')).not.toBeNull();
  });

  it('点击重试按钮派发 retry 事件 + 退出 error 态', () => {
    const el = makeEl({ items: [{ label: 'x' }] });
    el.setError(new Error('x'));
    const onRetry = vi.fn();
    el.addEventListener('${tag}:retry', onRetry);
    el.$('[data-role="retry-btn"]').click();
    expect(onRetry).toHaveBeenCalledOnce();
    expect(el.$('[data-role="error"]')).toBeNull();
  });

  it('有 items 渲染 success 态 + list-item 行', () => {
    const el = makeEl({
      title: '${purpose}',
      items: [{ label: '项目A', action: 'arrow' }, { label: '项目B' }],
    });
    expect(el.$('[data-role="list"]')).not.toBeNull();
    expect(el.$$('.list-item[data-index]').length).toBe(2);
  });
});

describe('${tag} 交互 + a11y', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('点击行派发 ${mainEventName} 事件', () => {
    const el = makeEl({
      items: [{ label: 'A', action: 'arrow' }, { label: 'B', action: 'arrow' }],
    });
    const onClick = vi.fn();
    el.addEventListener('${mainEventName}', onClick);
    el.$$('.list-item[data-index]')[1].click();
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ index: 1 }),
    }));
  });

  it('a11y: role=group + aria-label（title 非空）', () => {
    const el = makeEl({ title: '${purpose}', items: [{ label: 'x' }] });
    const section = el.$('section');
    expect(section.getAttribute('role')).toBe('group');
    expect(section.getAttribute('aria-label')).toBe('${purpose}');
  });

  it('XSS 防护：label 含 <script> 被转义', () => {
    const el = makeEl({
      items: [{ label: '<script>alert(1)</script>', action: 'arrow' }],
    });
    expect(el.innerHTML).not.toContain('<script>');
    expect(el.innerHTML).toContain('&lt;script&gt;');
  });
});
`;
}

// ─── 3. 追加 index.js ────────────────────────────────────
function patchIndexJs(src) {
  // 在最后一个 block import 后追加
  const importLine = `import { ${cls} } from './blocks/${tag}.js';`;
  if (src.includes(importLine)) return src;
  // 找最后一个 './blocks/af-' import 行后插入
  const lines = src.split('\n');
  let lastBlockImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("from './blocks/af-")) lastBlockImportIdx = i;
  }
  if (lastBlockImportIdx >= 0) {
    lines.splice(lastBlockImportIdx + 1, 0, importLine);
  } else {
    // 回退：在最后一个 components import 后插入
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("from './components/af-")) lastBlockImportIdx = i;
    }
    lines.splice(lastBlockImportIdx + 1, 0, importLine);
  }

  // 追加单独 export（在最后一个 `export { Af... };` 单独行后）
  const exportLine = `export { ${cls} };`;
  let lastBlockExportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^export \{ Af[A-Z]\w+ \};$/.test(lines[i].trim())) lastBlockExportIdx = i;
  }
  if (lastBlockExportIdx >= 0) {
    lines.splice(lastBlockExportIdx + 1, 0, exportLine);
  }

  // 注：不追加 BLOCK_REGISTRY（已移除全量注册器，Block 只能按需 import + customElements.define）

  return lines.join('\n');
}

// ─── 4. 追加 index.d.ts ──────────────────────────────────
function patchIndexDts(src) {
  const itemInterface = `${cls[2]}Item`; // AfProductCard → ProductCardItem... 太长，简化为 BlockItem
  // 简化：用 tag 转 PascalCase 作为 Item 接口名后缀
  const pascalBase = tag.split('-').slice(1).map(p => p[0].toUpperCase() + p.slice(1)).join('');
  const itemIface = `${pascalBase}Item`;
  const clickDetail = `${pascalBase}ClickDetail`;

  // 生成 props 的 TS 类型
  const propTypes = props.map(p => {
    if (p === 'loading' || p === 'disabled' || p === 'checked') return `  ${p}: boolean;`;
    if (p === 'items') return `  ${p}: ${itemIface}[];`;
    if (p === 'variant') return `  ${p}: ${variants.map(v => `'${v}'`).join(' | ')};`;
    return `  ${p}: string;`;
  }).join('\n');

  const eventListeners = events.map(e => {
    const evName = `${tag}:${e}`;
    const detail = e === 'itemclick' || e === 'change' ? clickDetail : 'AfEventDetail';
    return `  addEventListener(type: '${evName}', listener: (e: CustomEvent<${detail}>) => void, options?: boolean | AddEventListenerOptions): void;`;
  }).join('\n');
  const retryListener = `  addEventListener(type: '${tag}:retry', listener: (e: CustomEvent) => void, options?: boolean | AddEventListenerOptions): void;`;

  const insertion = `
/** ${tag} item schema */
export interface ${itemIface} {
  label?: string;
  value?: string;
  action?: 'arrow';
  checked?: boolean;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface ${clickDetail} extends AfEventDetail {
  index: number;
  item: ${itemIface};
}

/** ${tag}：${purpose}（含五态/键盘导航/移动端适配） */
export class ${cls} extends AfElement {
  static useShadow: false;
${propTypes}
  /** 触发错误态（如 fetch 失败） */
  setError(err: unknown): void;
${eventListeners}
${retryListener}
}
`;

  // 插入点：在最后一个 `export class Af... extends AfElement` 块后
  // 找到 `// 核心运行时` 注释行前插入
  const marker = '// ============================================================\n// 核心运行时：state（响应式原语）';
  if (src.includes(marker)) {
    return src.replace(marker, insertion + '\n' + marker);
  }
  // 回退：追加到文件末尾
  return src + '\n' + insertion;
}

// ─── 5. 追加 build-prompt.mjs BLOCK_META ─────────────────
function patchBuildPrompt(src) {
  const metaLine = `  { tag: '${tag}', purpose: '${purpose}（五态+键盘导航）', variant: '${variants.join(' / ')}', props: '${props.join(', ')}', events: '${events.map(e => tag + ':' + e).join(', ')}, ${tag}:retry' },`;
  // 在 BLOCK_META 数组的 ]; 前插入
  const re = /const BLOCK_META = \[([\s\S]*?)\];/;
  const match = src.match(re);
  if (!match) return src;
  const newMeta = `const BLOCK_META = [${match[1]}${metaLine}\n];`;
  return src.replace(re, newMeta);
}

// ─── 6. 追加 i18n.js 字典 ─────────────────────────────────
function patchI18n(src) {
  const zhKeys = [
    `    '${i18nPrefix}.al': '${purpose}',`,
    `    '${i18nPrefix}.em': '暂无数据',`,
    `    '${i18nPrefix}.ld': '加载中…',`,
    `    '${i18nPrefix}.er': '加载失败',`,
    `    '${i18nPrefix}.rt': '重试',`,
  ].join('\n');
  const enKeys = [
    `    '${i18nPrefix}.al': '${purpose}',`,
    `    '${i18nPrefix}.em': 'No data',`,
    `    '${i18nPrefix}.ld': 'Loading...',`,
    `    '${i18nPrefix}.er': 'Load failed',`,
    `    '${i18nPrefix}.rt': 'Retry',`,
  ].join('\n');

  // 在 zh-CN 块的 } 前插入（找 'sg.rt': '重试', 后）
  src = src.replace(
    /('zh-CN': \{[\s\S]*?'sg\.rt': '重试',)/,
    `$1\n${zhKeys}`
  );
  // 在 en-US 块的 } 前插入
  src = src.replace(
    /('en-US': \{[\s\S]*?'sg\.rt': 'Retry',)/,
    `$1\n${enKeys}`
  );
  return src;
}

// ─── 主流程 ───────────────────────────────────────────────
function run(cmd, label) {
  console.log(`\n── ${label} ──`);
  const res = spawnSync('npx', cmd, { stdio: 'inherit', shell: true, cwd: ROOT });
  if (res.status !== 0) {
    console.error(`✗ ${label} 失败（exit ${res.status}）`);
    process.exit(res.status ?? 1);
  }
}

function main() {
  const blockSrc = genBlockSource();
  const testSrc = genTestSource();
  const indexJsSrc = patchIndexJs(readFileSync(INDEX_JS, 'utf8'));
  const indexDtsSrc = patchIndexDts(readFileSync(INDEX_DTS, 'utf8'));
  const buildPromptSrc = patchBuildPrompt(readFileSync(BUILD_PROMPT_MJS, 'utf8'));
  const i18nSrc = patchI18n(readFileSync(I18N_JS, 'utf8'));

  if (dryRun) {
    console.log('=== DRY RUN: 不写文件，不跑自检 ===\n');
    console.log('── src/blocks/' + tag + '.js ──');
    console.log(blockSrc);
    console.log('── test/' + tag + '.test.js ──');
    console.log(testSrc);
    console.log('── src/index.js diff ──');
    console.log(indexJsSrc);
    return;
  }

  // 写文件
  writeFileSync(blockFile, blockSrc);
  writeFileSync(testFile, testSrc);
  writeFileSync(INDEX_JS, indexJsSrc);
  writeFileSync(INDEX_DTS, indexDtsSrc);
  writeFileSync(BUILD_PROMPT_MJS, buildPromptSrc);
  writeFileSync(I18N_JS, i18nSrc);

  console.log('✓ 六源已写入：');
  console.log('  1. src/blocks/' + tag + '.js');
  console.log('  2. test/' + tag + '.test.js');
  console.log('  3. src/index.js（import + export，按需模式）');
  console.log('  4. src/index.d.ts（interface + class）');
  console.log('  5. scripts/build-prompt.mjs（BLOCK_META）');
  console.log('  6. src/lib/i18n.js（zh-CN + en-US）');

  // 自动同步 + 自检
  run(['npm', 'run', 'whitelist'], '同步 whitelist（自动登记组件）');
  run(['npm', 'run', 'prompt', '--', '-o', 'prompt/system-prompt.md'], '同步 prompt（注入 BLOCK_META）');
  run(['npx', 'eslint', 'src/', 'test/', 'scripts/', '--max-warnings', '0'], 'ESLint');
  run(['npx', 'vitest', 'run', 'test/' + tag + '.test.js'], 'vitest（新 Block 单测）');
  run(['npm', 'run', 'size'], 'size 预算');
  run(['npm', 'run', 'whitelist:check'], 'whitelist 三源同步');
  run(['npm', 'run', 'types:check'], 'types 四源一致');
  run(['npm', 'run', 'prompt:check'], 'prompt 快照一致');

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  ✓ Block 生成完成，全部自检通过                    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('\n下一步：编辑 src/blocks/' + tag + '.js 的 _renderItem 方法，实现业务逻辑。');
}

main();
