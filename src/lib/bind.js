// AIFlow UI —— :bind 响应式绑定管道
// 语法：:attr="state.field" / :attr="derived.field" / :attr="refName.field"
// 扫描 [attr^=":"] 元素，用 effect 订阅 signal 变化时自动 setAttribute
// MutationObserver 监听 DOM 新增（router 渲染新页面时自动绑定）
// ctx 必传：createPage() 实例（definePage 全局单例已移除）；MutationObserver 空闲扫描合并批量变更

import { effect } from './state.js';
import { getDataRef, _resetDataRefs } from './data-ref.js';

const _bindings = new WeakMap();   // element → cleanup

// 向后兼容：re-export 注册表 API（af-data 现已直接从 data-ref.js import，
// 此 re-export 仅为旧测试和潜在消费端代码保留）
export { registerDataRef, unregisterDataRef } from './data-ref.js';

/** 初始化 :bind 扫描（传入 createPage() 实例，绑定到该实例的 state/derived） */
export function initBind(root = document, ctx = null) {
  if (typeof root.querySelectorAll !== 'function') return () => {};
  if (!ctx?.state) {
    throw new Error('[aiflow] initBind(root, ctx) 需传入 createPage() 实例（definePage 全局单例已移除）');
  }
  const stateObj = ctx.state;
  const derivedObj = ctx.derived ?? {};
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
  // 未解析表达式不再静默失败：开发期告警，帮助定位拼写错误
  if (!parsed) return console.warn(`[aiflow] :bind 未解析:${attrName}="${expr}"`), null;
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
  // refName.a.b.c（af-data ref，支持多段路径）
  if (/^[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)+$/.test(expr)) {
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
  // 目标元素已有同名 property（自定义元素 defineProp 或原生成员）时直接赋 property：
  // 避免复杂对象走 JSON.stringify→setAttribute→attributeChangedCallback→JSON.parse 的往返
  // （:bind 绑定 af-list:data 等大数组时开销显著）。无同名 property 的 attribute
  // （role/aria-* / data-* 等）仍回落 setAttribute，行为不变。
  if (attrName in el) {
    el[attrName] = val;
    return;
  }
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
