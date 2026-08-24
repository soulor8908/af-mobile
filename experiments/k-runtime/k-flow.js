// k-flow.js —— k 风格核心实现（B3 实验用；响应式核心复用 af-mobile 的 state.js）
// 词表：html``（4 种绑定）+ Show/For/Switch + mount/clean + signal/computed/effect
import { signal, computed, effect, batch, createRoot, untrack } from '../../src/lib/state.js';

const rm = (n) => n.parentNode?.removeChild(n);
const cache = new Map();
const SENT = '\u0001';

// === html``：模板 → DOM ===
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

// 属性位：@ev=${fn} 事件 / .prop=${x} DOM属性 / attr=${x} HTML属性
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

// 子位：值 / signal(getter) / DOM节点 / 数组 自动识别
function bindKids(n, vals, disposers) {
  for (const c of [...n.childNodes]) {
    if (c.nodeType === 8) {
      const m = c.textContent.match(/^\u0001(\d+)\u0001$/);
      if (m) setChild(c, vals[m[1]], disposers);
    } else if (c.nodeType === 3 && c.textContent.includes(SENT)) {
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

// === 控制流 ===
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
export function clean(fn) { _scope?.push(fn); }

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

export { signal, computed, effect, batch, createRoot, untrack };
