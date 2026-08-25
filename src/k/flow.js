// @af-mobile/ui/k —— k 渲染层核心：html`` 声明式模板 + 细粒度响应式绑定
// 定位：主库 innerHTML 字符串渲染之外的可选渲染层（独立入口，不进主包 index.js）
//   主库 html``（lib/af-element.js）返回转义字符串，配 innerHTML 使用
//   本层 html`` 返回真实 DOM（DocumentFragment），四种绑定 + Show/For/Switch 控制流
// 响应式核心复用 lib/state.js（signal/computed/effect/batch），零重复实现
// 设计依据：experiments/r2（k 词表 B3 实验，会话成本 -24%，代码量 -23%）

import { signal, computed, effect, batch, createRoot, untrack } from '../lib/state.js';

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
    cache.set(key, tpl);
  }
  const root = tpl.content.cloneNode(true);
  const disposers = [];
  bindAttrs(root, vals, disposers);
  bindKids(root, vals, disposers);
  root._clean = () => disposers.forEach(d => d());
  return root;
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
