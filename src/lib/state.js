// AIFlow UI —— 响应式状态原语
// signal/computed/effect/batch/bus，函数式 API，无 class
// 顶层无副作用，Node 18+ EventTarget 原生支持（SSR 安全）

let _cur = null;            // 当前 effect 的 { run, cleanups }
let _batching = false;
const _pending = new Set(); // batch 期间待通知的 signal

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
    if (_batching) _pending.add(s);
    else _notify(subs);
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
  return () => { e.cleanups.forEach(c => c()); e.cleanups = []; };
}

export function computed(fn) {
  let cached;
  let dirty = true;
  const subs = new Set();
  const recompute = () => {
    dirty = true;
    for (const s of [...subs]) s.run();
  };
  const c = () => {
    if (_cur) {
      subs.add(_cur);
      _cur.cleanups.push(() => subs.delete(_cur));
    }
    if (dirty) {
      dirty = false;
      const prev = _cur;
      _cur = { run: recompute, cleanups: [] };
      try { cached = fn(); }
      finally { _cur = prev; }
    }
    return cached;
  };
  c.on = (f) => effect(() => f(c()));
  return c;
}
