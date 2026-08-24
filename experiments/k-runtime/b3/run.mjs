// B3 确定性评分器：node run.mjs <A|B> <t1..t5|all>
// 每次运行独立进程 + 独立 JSDOM，按任务卡契约做 DOM 交互断言
import { JSDOM } from 'jsdom';

const arm = process.argv[2], task = process.argv[3];
const solDir = arm === 'A' ? './solA' : './solB';

function makeDom() {
  const dom = new JSDOM('<div id="app"></div>');
  for (const k of ['document', 'Node', 'DocumentFragment', 'HTMLElement', 'MutationObserver', 'Event', 'KeyboardEvent']) globalThis[k] = dom.window[k];
  return dom;
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const $ = (dom, sel) => dom.window.document.querySelector(sel);
const text = (dom) => dom.window.document.body.textContent;
function type(dom, sel, val) { const i = $(dom, sel); i.value = val; i.dispatchEvent(new dom.window.Event('input', { bubbles: true })); }
function press(dom, sel, key) { $(dom, sel).dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true })); }
function click(dom, sel) { $(dom, sel).dispatchEvent(new dom.window.Event('click', { bubbles: true })); }
let failed = 0;
const assert = (c, msg) => { if (!c) { console.log(`  ✗ ${msg}`); failed++; } else console.log(`  ✓ ${msg}`); };

async function load(taskId, dom, opts) {
  const mod = await import(`${solDir}/${taskId}.mjs?r=${Math.random()}`);
  mod.mount(dom.window.document.querySelector('#app'), opts);
}

const scenarios = {
  async t1() {
    const dom = makeDom();
    await load('t1', dom, {});
    assert($(dom, '#c')?.textContent === '0', '初始 c=0');
    assert($(dom, '#sq')?.textContent === '0', '初始 sq=0');
    click(dom, '#inc'); assert($(dom, '#c').textContent === '1' && $(dom, '#sq').textContent === '1', 'inc → c=1 sq=1');
    click(dom, '#inc'); assert($(dom, '#c').textContent === '2' && $(dom, '#sq').textContent === '4', 'inc → c=2 sq=4');
    click(dom, '#dec'); assert($(dom, '#c').textContent === '1' && $(dom, '#sq').textContent === '1', 'dec → c=1 sq=1');
  },
  async t2() {
    const dom = makeDom();
    await load('t2', dom, {});
    assert(text(dom).includes('暂无待办'), '空态提示');
    press(dom, '#new', 'Enter');
    assert(text(dom).includes('暂无待办'), '空输入回车不添加');
    type(dom, '#new', '买牛奶'); press(dom, '#new', 'Enter');
    assert(dom.window.document.querySelectorAll('li').length === 1, '添加 1 条');
    type(dom, '#new', '开会'); press(dom, '#new', 'Enter');
    assert(dom.window.document.querySelectorAll('li').length === 2, '添加 2 条');
    const li = dom.window.document.querySelector('li');
    li.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    const lis = [...dom.window.document.querySelectorAll('li')];
    assert(lis.length === 1 && lis[0].textContent === '开会', '点击删除指定项');
    lis[0].dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    assert(text(dom).includes('暂无待办') && dom.window.document.querySelectorAll('li').length === 0, '删空回到空态');
  },
  async t3() {
    // case1: 失败 → 重试成功
    let calls = 0;
    const dom = makeDom();
    const loadData = () => { calls++; return calls === 1 ? sleep(10).then(() => { throw new Error('x'); }) : sleep(10).then(() => ['a', 'b']); };
    await load('t3', dom, { loadData });
    click(dom, '#load');
    assert($(dom, '#status')?.textContent === '加载中', 'pending 态');
    await sleep(60);
    assert($(dom, '#status')?.textContent === '加载失败', '失败态');
    assert(!!$(dom, '#retry'), '重试按钮出现');
    click(dom, '#retry');
    assert($(dom, '#status')?.textContent === '加载中', '重试 pending');
    await sleep(60);
    assert(dom.window.document.querySelectorAll('#list li').length === 2, '成功渲染 2 条');
    assert(!text(dom).includes('加载中') && !text(dom).includes('加载失败'), '状态清理');
    // case2: 空数组
    const dom2 = makeDom();
    await load('t3', dom2, { loadData: () => sleep(10).then(() => []) });
    click(dom2, '#load');
    await sleep(60);
    assert($(dom2, '#status')?.textContent === '空', '空态');
  },
  async t4() {
    const dom = makeDom();
    await load('t4', dom, {});
    assert($(dom, '#count')?.textContent === '共5条', '初始 5 条');
    assert(dom.window.document.querySelectorAll('li').length === 5, '初始渲染 5 项');
    type(dom, '#kw', '手机');
    assert($(dom, '#count')?.textContent === '共3条', '过滤 → 3 条');
    const lis = [...dom.window.document.querySelectorAll('li')].map(l => l.textContent);
    assert(lis.join(',') === '手机壳,手机膜,手机支架', '命中项正确');
    type(dom, '#kw', 'zzz');
    assert($(dom, '#count')?.textContent === '共0条' && dom.window.document.querySelectorAll('li').length === 0, '无命中 → 0 条');
  },
  async t5() {
    const dom = makeDom();
    await load('t5', dom, {});
    type(dom, '#name', '张');
    assert($(dom, '#preview')?.textContent.includes('姓名：张'), '姓名预览');
    type(dom, '#email', 'a@b.c');
    assert($(dom, '#preview')?.textContent.includes('邮箱：a@b.c'), '邮箱预览');
    assert(!text(dom).includes('邮箱格式错误'), '合法邮箱无错误');
    type(dom, '#email', 'abc');
    assert(text(dom).includes('邮箱格式错误'), '非法邮箱显示错误');
    type(dom, '#email', 'x@y.z');
    assert(!text(dom).includes('邮箱格式错误'), '改回合法错误消失');
  },
};

const list = task === 'all' ? ['t1', 't2', 't3', 't4', 't5'] : [task];
for (const t of list) {
  const before = failed;
  try { await scenarios[t](); } catch (e) { console.log(`  ✗ 异常: ${e.message}`); failed++; }
  console.log(`${failed === before ? 'PASS' : 'FAIL'} ${arm}/${t}`);
}
process.exit(failed ? 1 : 0);
