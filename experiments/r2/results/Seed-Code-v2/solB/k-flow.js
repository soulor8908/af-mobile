// k-flow.js —— k 词表运行时（R2 实验条件 B；响应式核心复用 @af-mobile/ui 的 signal/computed/effect）
// 词表：html``（4 种绑定）+ Show/For/Switch + render/clean + signal/computed/effect/batch
// 本文件与词表卡 promptB.md 严格一一对应：词表外无任何 API。
// 与发布版 src/k/flow.js 保持逐行同步（含占位符报警器），仅以下两点不同：
//   ① import 源用裸包名 @af-mobile/ui（评分器把本文件拷进任意 solDir 后相对路径会失效）
//   ② 头注释（本块）
import { signal, computed, effect, batch, createRoot, untrack } from '@af-mobile/ui';

const rm = (n) => n.parentNode?.removeChild(n);
// 模板缓存：相同 strings 序列的模板只解析一次（cloneNode 复用）
const cache = new Map();
// 插值占位符：\u0001（SOH）不出现在正常模板文本，作为绑定位标记
const SENT = '\u0001';

// === html``：模板 → DOM ===
// strings 的插值位替换为 \u0001N\u0001 占位，解析后按序绑定回填
export function html(strings, ...vals) {
  const key = strings.join(SENT);
  let tpl = cache.get(key);
  if (!tpl) {
    tpl = document.createElement('template');
    tpl.innerHTML = strings.reduce((s, str, i) => s + (i ? `\u0001${i - 1}\u0001` : '') + str, '');
    warnBadPlaceholders(tpl.content);
    cache.set(key, tpl);
  }
  const root = tpl.content.cloneNode(true);
  const disposers = [];
  bindAttrs(root, vals, disposers);
  bindKids(root, vals, disposers);
  root._clean = () => disposers.forEach(d => d());
  return root;
}

// 报警器用锚定校验：占位符必须完整占据属性值（与 bindAttrs 的前缀匹配刻意不同）
const FULL_PLACEHOLDER = /^\u0001\d+\u0001$/;
// 烟雾报警器（模板缓存 miss 时执行一次，天然去重）：
// 两类坏位置的插值在 bindAttrs 前缀正则下静默失败——
//   ① 属性名位（<div ${name}="v">）：绑定被整体忽略
//   ② 带引号混合值（class="btn ${x}" / class="${x} btn"）：占位符留字面量或静态部分丢失
// 只告警不拦截，不改变现行绑定行为
function warnBadPlaceholders(root) {
  for (const el of root.querySelectorAll('*')) {
    for (const a of el.attributes) {
      if (a.name.includes(SENT)) {
        console.warn(`[k] 属性名位不支持插值（${JSON.stringify(a.name)}）：绑定将被忽略`);
      } else if (a.value.includes(SENT) && !FULL_PLACEHOLDER.test(a.value)) {
        console.warn(`[k] 属性 ${a.name} 为混合插值：仅支持完整属性值绑定（attr=${'${x}'} 无引号形态），静态部分或整条绑定将丢失`);
      }
    }
  }
}

// 属性位绑定：@ev=${fn} 事件 / .prop=${x} DOM属性 / attr=${x} HTML属性
function bindAttrs(n, vals, disposers) {
  if (n.nodeType === 1) {
    for (const a of [...n.attributes]) {
      const m = a.value.match(/^\u0001(\d+)\u0001$/);
      if (!m) continue;
      const v = vals[m[1]];
      n.removeAttribute(a.name);
      if (a.name[0] === '@') n.addEventListener(a.name.slice(1), v);
      else if (a.name[0] === '.') disposers.push(bindVal(n, a.name.slice(1), v, true));
      else disposers.push(bindVal(n, a.name, v, false));
    }
  }
  for (const c of n.childNodes) bindAttrs(c, vals, disposers);
}

// 子位绑定：值 / signal(getter) / DOM节点 / 数组 自动识别
function bindKids(n, vals, disposers) {
  for (const c of [...n.childNodes]) {
    if (c.nodeType === 8) {
      const m = c.textContent.match(/^\u0001(\d+)\u0001$/);
      if (m) setChild(c, vals[m[1]], disposers);
    } else if (c.nodeType === 3 && c.textContent.includes(SENT)) {
      // 单文本节点含多个插值位：拆分为 文本+锚点 序列
      const frag = document.createDocumentFragment();
      const anchors = [];
      for (const p of c.textContent.split(/(\u0001\d+\u0001)/)) {
        const m = p.match(/^\u0001(\d+)\u0001$/);
        if (m) { const a = document.createComment('k'); frag.appendChild(a); anchors.push([a, vals[m[1]]]); }
        else if (p) frag.appendChild(document.createTextNode(p));
      }
      c.replaceWith(frag);
      for (const [a, v] of anchors) setChild(a, v, disposers);
    } else if (c.nodeType === 1) bindKids(c, vals, disposers);
  }
}

// 锚点子位渲染：anchor 与 end 之间插入内容；函数值建 effect 细粒度更新
function setChild(anchor, v, disposers) {
  const end = document.createComment('/k');
  anchor.parentNode.insertBefore(end, anchor.nextSibling);
  const parent = anchor.parentNode;
  const put = (val) => {
    const el = val instanceof Node ? val : document.createTextNode(String(val ?? ''));
    parent.insertBefore(el, end);
    return el;
  };
  const clear = () => {
    let sib = anchor.nextSibling;
    while (sib && sib !== end) { const nx = sib.nextSibling; parent.removeChild(sib); sib = nx; }
  };
  if (typeof v === 'function') {
    // getter（通常为 signal）：值变化仅更新本锚点区间；数组展开渲染多节点
    disposers.push(effect(() => { clear(); for (const x of [].concat(v()).flat()) put(x)._k = 1; }));
  } else if (Array.isArray(v)) { v.flat().forEach(x => { put(x)._k = 1; }); }
  else { put(v)._k = 1; }
}

function bindVal(el, name, v, isProp) {
  if (typeof v !== 'function') { apply(el, name, v, isProp); return; }
  return effect(() => apply(el, name, v(), isProp));
}
function apply(el, name, val, isProp) {
  if (isProp) el[name] = val;
  else if (val == null || val === false) el.removeAttribute(name);
  else el.setAttribute(name, val === true ? '' : String(val));
}

// === 控制流（均返回 DocumentFragment，可直接放 ${} 子位） ===

// 条件渲染：when() 真值时渲染 kids()，假值清空
export function Show({ when, kids }) {
  const anchor = document.createComment('show');
  const end = document.createComment('/show');
  const frag = document.createDocumentFragment();
  frag.append(anchor, end);
  let nodes = [];
  effect(() => {
    nodes.forEach(n => { n._clean?.(); rm(n); });
    nodes = [];
    if (when()) { nodes = [...kids().childNodes]; nodes.forEach(n => anchor.parentNode.insertBefore(n, end)); }
  });
  return frag;
}

// keyed 列表：key 为字段名字符串，省略则以项本身为键；按 key 复用 DOM 节点
export function For({ each, key, kids }) {
  const anchor = document.createComment('for');
  const end = document.createComment('/for');
  const frag = document.createDocumentFragment();
  frag.append(anchor, end);
  const rows = new Map();
  effect(() => {
    const seen = new Set();
    let ref = anchor;
    for (const item of each()) {
      const k = key ? item[key] : item;
      seen.add(k);
      let row = rows.get(k);
      if (!row) { row = { nodes: [...kids(item).childNodes] }; rows.set(k, row); }
      for (const nd of row.nodes) { anchor.parentNode.insertBefore(nd, ref.nextSibling); ref = nd; }
    }
    for (const [k, row] of rows) if (!seen.has(k)) { row.nodes.forEach(n => { n._clean?.(); rm(n); }); rows.delete(k); }
  });
  return frag;
}

// 多路分支：when() 值命中 cases 的同名分支，否则 def 兜底（都是返回 html`` 的函数）
export function Switch({ when, cases, def }) {
  const anchor = document.createComment('sw');
  const end = document.createComment('/sw');
  const frag = document.createDocumentFragment();
  frag.append(anchor, end);
  let nodes = [];
  effect(() => {
    nodes.forEach(n => { n._clean?.(); rm(n); });
    nodes = [];
    const view = cases[when()] ?? def;
    if (view) { nodes = [...view().childNodes]; nodes.forEach(n => anchor.parentNode.insertBefore(n, end)); }
  });
  return frag;
}

// === 挂载与作用域清理 ===
let _scope = null;
// 注册清理函数到最近一次 render() 的作用域（unmount 时统一执行）
export function clean(fn) { _scope?.push(fn); }

// 渲染：app 为 html`` 结果或 () => html``；el 为容器元素或选择器
// 返回 unmount 函数：清理全部绑定 effect 与 clean() 注册的副作用
export function render(app, sel) {
  const target = typeof sel === 'string' ? document.querySelector(sel) : sel;
  const scope = [];
  const prev = _scope;
  _scope = scope;
  let node;
  try { node = typeof app === 'function' ? app() : app; }
  finally { _scope = prev; }
  target.replaceChildren(node);
  return () => { node._clean?.(); scope.forEach(f => f()); };
}

// 响应式核心随入口重导出（子库自包含，消费端无需再从主包导入）
export { signal, computed, effect, batch, createRoot, untrack };
