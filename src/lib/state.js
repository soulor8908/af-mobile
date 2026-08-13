// AIFlow UI —— 响应式状态原语
// signal/computed/effect/batch + Owner pattern（createRoot/getOwner/untrack）
// 函数式 API，无 class，顶层无副作用（SSR 安全）
// v3.0：移除 bus 死代码；computed tempEffect 引用修复上游订阅泄漏；batch 用模块级 Map 替代 s._subs 暴露

let _cur = null;            // 当前 effect 的 { run, cleanups }
let _owner = null;          // 当前 owner（createRoot 建立，effect/computed 自动注册 dispose）
let _batching = false;
const _pending = new Set();       // batch 期间待通知的 signal
const _pendingSubs = new Map();   // signal → subs（batch 期间缓存，替代 s._subs 内部 API 暴露）

// === 所有权树 ===

/** 建立 owner 作用域，fn 内创建的 effect/computed 自动注册到 owner；返回 dispose 函数级联清理 */
export function createRoot(fn) {
  const owner = { disposers: [], parent: _owner };
  const prev = _owner;
  _owner = owner;
  try { return fn(() => owner.disposers.forEach(d => d())); }
  finally { _owner = prev; }
}

/** 获取当前 owner（createRoot 内部用，外部调试用） */
export function getOwner() {
  return _owner;
}

// === signal ===

export function signal(v) {
  let val = v;
  const subs = new Map();   // effect-like { run } → cleanup fn
  const s = () => {
    if (_cur && !subs.has(_cur)) {
      const dep = _cur;
      const cleanup = () => subs.delete(dep);
      subs.set(dep, cleanup);
      dep.cleanups.push(cleanup);
    }
    return val;
  };
  s.set = (nv) => {
    if (typeof nv === 'function') nv = nv(val);
    if (Object.is(nv, val)) return;
    val = nv;
    if (_batching) {
      _pendingSubs.set(s, subs);   // 模块级 Map 替代 s._subs 暴露
      _pending.add(s);
    } else {
      _notify(subs);
    }
  };
  s.on = (f) => {
    const wrapped = { run: f, cleanups: [] };
    subs.set(wrapped, () => subs.delete(wrapped));
    return () => subs.delete(wrapped);
  };
  return s;
}

function _notify(subs) {
  for (const e of [...subs.keys()]) e.run();
}

// === effect（自动注册到 owner）===

export function effect(fn) {
  const e = { run: null, cleanups: [] };
  e.run = () => {
    e.cleanups.forEach(c => c());
    e.cleanups = [];
    const prev = _cur;
    _cur = e;
    try { fn(); }
    finally { _cur = prev; }
  };
  e.run();

  const dispose = () => { e.cleanups.forEach(c => c()); e.cleanups = []; };
  _owner?.disposers.push(dispose);   // 自动注册到当前 owner（无 owner 时仅返回 dispose 由调用方管理）
  return dispose;
}

// === computed（完整修复：tempEffect 保存引用，owner dispose 时清理上游订阅）===

export function computed(fn) {
  let cached;
  let dirty = true;
  let tempEffect = null;            // 保存临时 effect 引用（v2.1 缺失，导致 cleanup 空壳）
  const subs = new Set();           // 下游 effect 订阅

  const recompute = () => {
    dirty = true;
    for (const s of [...subs]) s.run();
  };

  // cleanup 注册到 owner：owner dispose 时清理上游 signal.subs 中的临时订阅
  const cleanup = () => {
    if (tempEffect) {
      tempEffect.cleanups.forEach(c => c());
      tempEffect = null;
    }
  };
  _owner?.disposers.push(cleanup);

  const c = () => {
    // 下游订阅（用局部 dep，避免 cleanup 闭包捕获全局 _cur 导致 dispose 时删错对象）
    if (_cur) {
      const dep = _cur;
      subs.add(dep);
      dep.cleanups.push(() => subs.delete(dep));
    }
    if (dirty) {
      // 重新求值前清理上一轮的临时 effect 上游订阅
      if (tempEffect) tempEffect.cleanups.forEach(c => c());
      dirty = false;
      const prev = _cur;
      tempEffect = { run: recompute, cleanups: [] };
      _cur = tempEffect;
      try { cached = fn(); }
      finally { _cur = prev; }
    }
    return cached;
  };
  c.on = (f) => effect(() => f(c()));
  return c;
}

// === untrack（阻断依赖追踪）===

/** 在 fn 内读取 signal 不建立依赖（写入仍生效） */
export function untrack(fn) {
  const prev = _cur;
  _cur = null;
  try { return fn(); } finally { _cur = prev; }
}

// === batch ===

export function batch(fn) {
  if (_batching) return fn();
  _batching = true;
  try { fn(); }
  finally {
    _batching = false;
    const snapshot = [..._pending];
    _pending.clear();
    // 收集所有受影响的 effect，去重后执行一次
    const effects = new Set();
    for (const s of snapshot) {
      const subs = _pendingSubs.get(s);
      if (subs) for (const e of subs.keys()) effects.add(e);
    }
    _pendingSubs.clear();
    for (const e of effects) e.run();
  }
}
