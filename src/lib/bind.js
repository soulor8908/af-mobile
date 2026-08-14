// AIFlow UI —— :bind 响应式绑定管道
// 语法：:attr="state.field" / :attr="derived.field" / :attr="refName.field"
// 扫描 [attr^=":"] 元素，用 effect 订阅 signal 变化时自动 setAttribute
// MutationObserver 监听 DOM 新增（router 渲染新页面时自动绑定）
// v3.0：initBind(root, ctx) 支持多实例（ctx.state/ctx.derived），未传 ctx 时回退全局；MutationObserver 空闲扫描合并批量变更

import { effect } from './state.js';
import { state as _globalState, derived as _globalDerived } from './page.js';
import { getDataRef, _resetDataRefs } from './data-ref.js';

const _bindings = new WeakMap();   // element → cleanup

// 向后兼容：re-export 注册表 API（af-data 现已直接从 data-ref.js import，
// 此 re-export 仅为旧测试和潜在消费端代码保留）
export { registerDataRef, unregisterDataRef } from './data-ref.js';

/** 初始化 :bind 扫描（应用启动时调用一次；传入 ctx 绑定到指定实例的 state/derived） */
export function initBind(root = document, ctx = null) {
  if (typeof root.querySelectorAll !== 'function') return () => {};
  const stateObj = ctx?.state ?? _globalState;
  const derivedObj = ctx?.derived ?? _globalDerived;
  scan(root, stateObj, derivedObj);
  if (typeof MutationObserver === 'undefined') return () => {};

  // MutationObserver 默认开启（v2.1-Final 默认关闭会导致动态 DOM 不绑定）：
  // 用空闲扫描合并批量变更，降低回调频率而非关闭
  let pending = null;
  const cancelIdle = () => {
    if (pending) {
      if (typeof requestIdleCallback === 'function') cancelIdleCallback(pending);
      else clearTimeout(pending);
      pending = null;
    }
  };
  const observer = new MutationObserver(() => {
    if (pending) return;
    pending = typeof requestIdleCallback === 'function'
      ? requestIdleCallback(() => { scan(root, stateObj, derivedObj); pending = null; })
      : setTimeout(() => { scan(root, stateObj, derivedObj); pending = null; }, 0);
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => { observer.disconnect(); cancelIdle(); };
}

function scan(root, stateObj, derivedObj) {
  // root 自身可能带 :attr，子节点也可能带
  const candidates = root.attributes && [...root.attributes].some(a => a.name.startsWith(':'))
    ? [root, ...root.querySelectorAll('*')]
    : [...root.querySelectorAll('*')];
  for (const el of candidates) {
    if (_bindings.has(el)) continue;
    const bindAttrs = [...el.attributes].filter(a => a.name.startsWith(':'));
    if (bindAttrs.length === 0) continue;
    const cleanups = [];
    for (const attr of bindAttrs) {
      const attrName = attr.name.slice(1);
      const cleanup = bindOne(el, attrName, attr.value, stateObj, derivedObj);
      if (cleanup) cleanups.push(cleanup);
      el.removeAttribute(attr.name);
    }
    _bindings.set(el, () => cleanups.forEach(c => c()));
  }
}

function bindOne(el, attrName, expr, stateObj, derivedObj) {
  const parsed = parseExpr(expr, stateObj, derivedObj);
  if (!parsed) return null;
  return effect(() => {
    const val = parsed.get();
    applyValue(el, attrName, val);
  });
}

function parseExpr(expr, stateObj, derivedObj) {
  // state.xxx[.yyy]
  if (/^state\./.test(expr)) {
    return { get: () => getPath(stateObj, expr.slice(6)) };
  }
  // derived.xxx
  if (/^derived\./.test(expr)) {
    return { get: () => getPath(derivedObj, expr.slice(8)) };
  }
  // refName.xxx（af-data ref）
  if (/^[a-zA-Z_$][\w$]*\.[a-zA-Z_$][\w$]*$/.test(expr)) {
    const [refName, ...rest] = expr.split('.');
    return { get: () => {
      const getData = getDataRef(refName);
      return getData ? getPath(getData(), rest.join('.')) : undefined;
    }};
  }
  return null;
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function applyValue(el, attrName, val) {
  if (val == null || val === false) {
    el.removeAttribute(attrName);
  } else if (val === true) {
    el.setAttribute(attrName, '');
  } else if (typeof val === 'object') {
    el.setAttribute(attrName, JSON.stringify(val));
  } else {
    el.setAttribute(attrName, String(val));
  }
}

/** 测试用：重置内部状态（重置 data-ref 注册表） */
export function _resetBind() {
  _resetDataRefs();
}
