// R2 严格审计评分器：补 run.mjs 未覆盖的显隐断言（t2 #empty / t3 #retry）
// 背景：run.mjs 只断言文本存在性与条目数；属性名位插值（k 告警且绑定被忽略）导致的
// 显隐失效不会被原断言发现（假阴性通过）。本脚本不改 run.mjs/prompts/runtime，
// 仅量化"原口径通过但显隐语义失效"的任务数。正式指标仍以 run.mjs 为准（B3 可比口径）。
// 用法: node run-strict.mjs <A|B> <t2|t3|all> [solDir]
import { JSDOM } from 'jsdom';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arm = process.argv[2], task = process.argv[3];
if (!arm || !task) { console.error('用法: node run-strict.mjs <A|B> <t2|t3|all> [solDir]'); process.exit(2); }
const solDir = resolve(HERE, process.argv[4] || (arm === 'A' ? './solA' : './solB'));

// 与 run.mjs 相同的 k-flow 自动装配
if (arm === 'B') {
  const src = join(HERE, 'runtime/k-flow.js'), dst = join(solDir, 'k-flow.js');
  if (!existsSync(solDir)) mkdirSync(solDir, { recursive: true });
  writeFileSync(dst, readFileSync(src));
}

function makeDom() {
  const dom = new JSDOM('<div id="app"></div>');
  for (const k of ['document', 'Node', 'DocumentFragment', 'HTMLElement', 'MutationObserver', 'Event', 'KeyboardEvent']) globalThis[k] = dom.window[k];
  return dom;
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const $ = (dom, sel) => dom.window.document.querySelector(sel);
function type(dom, sel, val) { const i = $(dom, sel); i.value = val; i.dispatchEvent(new dom.window.Event('input', { bubbles: true })); }
function press(dom, sel, key) { $(dom, sel).dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true })); }
function click(dom, sel) { $(dom, sel).dispatchEvent(new dom.window.Event('click', { bubbles: true })); }
// jsdom 无布局：以 hidden 属性 + display:none + 节点增删（Show/Switch）近似可见性
const visible = (dom, sel) => { const el = $(dom, sel); return !!el && !el.hidden && el.style.display !== 'none'; };

let failed = 0, passed = 0;
const assert = (c, msg) => { if (!c) { console.log(`  ✗ ${msg}`); failed++; } else { console.log(`  ✓ ${msg}`); passed++; } };

async function load(taskId, dom, opts) {
  const mod = await import(`${solDir}/${taskId}.mjs?r=${Math.random()}`);
  mod.mount(dom.window.document.querySelector('#app'), opts);
}

const scenarios = {
  async t2() {
    const dom = makeDom();
    await load('t2', dom, {});
    type(dom, '#new', '买牛奶'); press(dom, '#new', 'Enter');
    const empty = $(dom, '#empty');
    const showsEmpty = !!empty && !empty.hidden && empty.style.display !== 'none' && empty.textContent.includes('暂无待办');
    assert(dom.window.document.querySelectorAll('li').length === 1, '前置：已添加 1 条');
    assert(!showsEmpty, '有条目时 #empty 不显示"暂无待办"');
  },
  async t3() {
    // case1: 失败 → 重试成功
    let calls = 0;
    const dom = makeDom();
    const loadData = () => { calls++; return calls === 1 ? sleep(10).then(() => { throw new Error('x'); }) : sleep(10).then(() => ['a', 'b']); };
    await load('t3', dom, { loadData });
    assert(!visible(dom, '#retry'), '初始 #retry 不可见');
    click(dom, '#load');
    await sleep(60);
    assert(visible(dom, '#retry'), '失败后 #retry 可见');
    click(dom, '#retry');
    await sleep(60);
    assert(!visible(dom, '#retry'), '成功后 #retry 不可见');
    // case2: 空数组
    const dom2 = makeDom();
    await load('t3', dom2, { loadData: () => sleep(10).then(() => []) });
    click(dom2, '#load');
    await sleep(60);
    assert(!visible(dom2, '#retry'), '空态 #retry 不可见');
  },
};

const list = task === 'all' ? ['t2', 't3'] : [task];
const perTask = [];
for (const t of list) {
  const before = failed, beforeP = passed;
  try { await scenarios[t](); } catch (e) { console.log(`  ✗ 异常: ${e.message}`); failed++; }
  const ok = failed === before;
  perTask.push({ task: t, ok, asserts: passed - beforeP });
  console.log(`${ok ? 'PASS' : 'FAIL'} strict/${arm}/${t}`);
}
console.log(`\nSTRICT ${arm} | ${perTask.map(p => `${p.task}:${p.ok ? 'PASS' : 'FAIL'}`).join(' ')} | 断言 ${passed}/${passed + failed}`);
process.exit(failed ? 1 : 0);
