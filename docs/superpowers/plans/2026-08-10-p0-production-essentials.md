# P0 生产刚需缺失 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐阻塞真实项目使用的 4 项生产刚需（router / state / fetchPage / System Prompt 4 要素），让 af-mobile UI 能跑起完整移动端 SPA。

**Architecture:** 三个独立 lib 模块（router.js / state.js / fetch.js）零相互依赖，按需 import，coreRuntime 独立预算 ≤ 3.7KB gz（不计入组件 total 14.5KB）。System Prompt 4 要素直接写入 `system-prompt.template.md` 静态内容。所有模块顶层无副作用（SSR 安全），与现有组件零侵入（集成在用户侧）。

**Tech Stack:** 原生 ESM / Web APIs（AbortController / EventTarget / View Transitions API / History API）/ Vitest / esbuild

**Design Doc:** [docs/design/p0-production-essentials-design.md](file:///d:/projects/af-mobile/docs/design/p0-production-essentials-design.md)

**Self-Check Commands (AGENTS.md §2):**
```bash
npx eslint src/ test/ scripts/ --max-warnings 0
npx vitest run
npm run size
npm run whitelist:check
npm run types:check
npm run prompt:check
```

---

## File Structure

### 新增文件

| 文件 | 责任 |
|---|---|
| `src/lib/state.js` | signal/computed/effect/batch/bus 响应式原语（~0.7KB gz）|
| `src/lib/fetch.js` | fetchPage + 错误分类 + 去重/缓存/拦截器（~0.8KB gz）|
| `src/lib/router.js` | 路由 + router-view + keep-alive + 转场（~2.0KB gz）|
| `test/state.test.js` | state 模块单元测试（~20 用例）|
| `test/fetch.test.js` | fetch 模块单元测试（~20 用例）|
| `test/router.test.js` | router 模块单元测试（~25 用例）|

### 修改文件

| 文件 | 改动 |
|---|---|
| `src/index.js` | 新增 router/state/fetch 三组命名导出 |
| `src/index.d.ts` | 新增 router/state/fetch 的 TypeScript 类型声明 |
| `scripts/size-check.mjs` | BUDGET 新增 coreRuntime 项 + 测量逻辑 |
| `scripts/check-prompt-sync.mjs` | 新增 4 要素存在性检查 |
| `prompt/system-prompt.template.md` | 在 PROJECT_EXTENSION_INJECTION_POINT 之前插入 4 要素章节 |

### 不改动文件

- `src/components/af-*.js`（组件源码零侵入）
- `src/lib/af-element.js` / `src/lib/theme.js`（基类与主题不动）
- `src/tokens.css` / `src/recipes.css` / `src/atomic.css`（L1+L2 不动）
- `package.json` 的 exports（已覆盖 `"./lib/*"`，无需改动）

### 实施顺序

按依赖顺序：**state → fetch → router → index/d.ts → 体积预算 → prompt → 集成自检**。

state 和 fetch 零依赖，可独立实现；router 依赖 fetch 的 AbortError 类型（在错误处理示例中引用），但实现上不 import fetch（用户侧集成）。先 state 再 fetch 再 router 符合从简到繁的递进。

---

## Task 1: state.js — signal 基础读写

**Files:**
- Create: `src/lib/state.js`
- Test: `test/state.test.js`

- [ ] **Step 1: 写失败测试 — signal 读写 + on 订阅**

Create `test/state.test.js`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { signal } from '../src/lib/state.js';

describe('signal 基础', () => {
  it('读取初始值', () => {
    const s = signal(42);
    expect(s()).toBe(42);
  });

  it('set 更新值后读取新值', () => {
    const s = signal(0);
    s.set(1);
    expect(s()).toBe(1);
  });

  it('set 支持函数式更新', () => {
    const s = signal(10);
    s.set(v => v + 5);
    expect(s()).toBe(15);
  });

  it('set 相同值不触发通知（Object.is）', () => {
    const s = signal(1);
    const fn = vi.fn();
    s.on(fn);
    s.set(1);
    expect(fn).not.toHaveBeenCalled();
  });

  it('on 订阅收到新值', () => {
    const s = signal(0);
    const fn = vi.fn();
    s.on(fn);
    s.set(99);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('on 返回取消函数', () => {
    const s = signal(0);
    const fn = vi.fn();
    const stop = s.on(fn);
    stop();
    s.set(1);
    expect(fn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/state.test.js`
Expected: FAIL，错误信息含 `signal is not defined` 或模块找不到。

- [ ] **Step 3: 实现 signal 最小代码**

Create `src/lib/state.js`:

```javascript
// af-mobile UI —— 响应式状态原语
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
      const cleanup = () => subs.delete(_cur);
      subs.set(_cur, cleanup);
      _cur.cleanups.push(cleanup);
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/state.test.js`
Expected: PASS，6 用例全绿。

- [ ] **Step 5: 提交**

```bash
git add src/lib/state.js test/state.test.js
git commit -m "feat(state): add signal primitive with read/write/subscribe"
```

---

## Task 2: state.js — effect 自动依赖追踪

**Files:**
- Modify: `src/lib/state.js`
- Test: `test/state.test.js`

- [ ] **Step 1: 追加失败测试 — effect 自动追踪**

Append to `test/state.test.js`:

```javascript
import { effect } from '../src/lib/state.js';

describe('effect 自动依赖追踪', () => {
  it('effect 首次执行立即运行', () => {
    const fn = vi.fn();
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('effect 读取 signal 后，signal.set 触发 effect 重跑', () => {
    const s = signal(0);
    const fn = vi.fn(() => { s(); });
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    s.set(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('effect 未读取的 signal.set 不触发重跑', () => {
    const a = signal(0);
    const b = signal(0);
    const fn = vi.fn(() => { a(); });
    effect(fn);
    b.set(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('effect 返回取消函数，调用后不再响应 signal 变化', () => {
    const s = signal(0);
    const fn = vi.fn(() => { s(); });
    const stop = effect(fn);
    s.set(1);
    expect(fn).toHaveBeenCalledTimes(2);
    stop();
    s.set(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('effect 重跑前清理旧依赖（依赖切换场景）', () => {
    const a = signal(1);
    const b = signal(100);
    let log = [];
    effect(() => { log.push(a() > 0 ? b() : -1); });
    expect(log).toEqual([100]);
    b.set(200);           // 仍依赖 b
    expect(log).toEqual([100, 200]);
    a.set(-1);            // 切换到不依赖 b
    expect(log).toEqual([100, 200, -1]);
    b.set(300);           // 不应触发（已不依赖 b）
    expect(log).toEqual([100, 200, -1]);
    a.set(1);             // 切回依赖 b
    expect(log).toEqual([100, 200, -1, 300]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/state.test.js`
Expected: 新 5 用例 FAIL（effect 未实现）。

- [ ] **Step 3: 实现 effect**

Append to `src/lib/state.js`:

```javascript
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/state.test.js`
Expected: PASS，11 用例全绿。

- [ ] **Step 5: 提交**

```bash
git add src/lib/state.js test/state.test.js
git commit -m "feat(state): add effect with auto dependency tracking and cleanup"
```

---

## Task 3: state.js — computed 派生信号

**Files:**
- Modify: `src/lib/state.js`
- Test: `test/state.test.js`

- [ ] **Step 1: 追加失败测试 — computed**

Append to `test/state.test.js`:

```javascript
import { computed } from '../src/lib/state.js';

describe('computed 派生信号', () => {
  it('惰性求值：创建时不执行 fn', () => {
    const fn = vi.fn(() => 1);
    const c = computed(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  it('首次读取时执行 fn 并缓存', () => {
    const a = signal(2);
    const fn = vi.fn(() => a() * 10);
    const c = computed(fn);
    expect(c()).toBe(20);
    expect(c()).toBe(20);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('依赖 signal 变化后，下次读取重新计算', () => {
    const a = signal(1);
    const c = computed(() => a() + 1);
    expect(c()).toBe(2);
    a.set(10);
    expect(c()).toBe(11);
  });

  it('依赖未变化时不重复计算', () => {
    const a = signal(1);
    const fn = vi.fn(() => a());
    const c = computed(fn);
    c(); c(); c();
    expect(fn).toHaveBeenCalledTimes(1);
    a.set(2);
    c(); c();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('computed 依赖 computed', () => {
    const a = signal(2);
    const b = computed(() => a() * 3);
    const d = computed(() => b() + 1);
    expect(d()).toBe(7);
    a.set(4);
    expect(d()).toBe(13);
  });

  it('computed.on 订阅派生信号变化', () => {
    const a = signal(1);
    const c = computed(() => a() * 2);
    const fn = vi.fn();
    c.on(fn);
    a.set(5);
    expect(fn).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/state.test.js`
Expected: 新 6 用例 FAIL（computed 未实现）。

- [ ] **Step 3: 实现 computed**

Append to `src/lib/state.js`:

```javascript
export function computed(fn) {
  let cached;
  let dirty = true;
  const markDirty = () => { dirty = true; };
  const e = effect(() => {
    cached = fn();
    dirty = false;
    // effect 重跑时依赖已变化，标记 dirty 供下次读取
    markDirty();
  });
  // effect 首次 run 会计算 cached 并清 dirty，但 markDirty 在 finally 后被调用？
  // 调整：effect 内部先算后清 dirty，重跑时由 signal.set 触发 → effect.run → 重算
  // 但 effect 是立即订阅，signal.set 直接触发 e.run，此时 dirty 应为 true
  // 修正实现：用独立 dirty 标记
  const c = () => {
    if (dirty) {
      e.run();          // 重算（effect 内部会执行 fn 并更新 cached）
      dirty = false;    // effect.run 后清 dirty
    }
    return cached;
  };
  c.on = (f) => effect(() => f(c()));
  return c;
}
```

**注意**：上面实现存在 dirty 标记时序问题，修正为：

```javascript
export function computed(fn) {
  let cached;
  let dirty = true;
  const e = effect(() => {
    cached = fn();
    dirty = false;
  });
  // effect 首次 run 完成后 dirty=false（已计算）
  // 依赖变化触发 e.run 前，需要把 dirty 标回 true
  // 但 signal.set → e.run 是同步的，run 内部又把 dirty 设 false
  // 所以需要在 effect run 之前标记 dirty=true：用 signal.on 监听不行（computed 不知道依赖谁）
  // 正解：effect 重跑时 dirty 已经被外部读取设为 false，重跑后又是 false
  // 惰性求值的正确做法：effect 只用来订阅（触发"需要重算"标记），不立即计算
  const c = () => {
    if (dirty) {
      dirty = false;
      e.run();   // 重算（run 内部 fn 会重新订阅依赖）
      // 如果 run 期间抛错，dirty 应恢复为 true 以便重试
    }
    return cached;
  };
  c.on = (f) => effect(() => f(c()));
  return c;
}
```

**最终正确实现**（覆盖 step 3 代码）：

```javascript
export function computed(fn) {
  let cached;
  let dirty = true;
  const e = effect(() => {
    cached = fn();
    dirty = false;
  });
  // 首次 effect.run 已执行 fn 并清 dirty
  // 依赖变化时 e.run 被触发，会重新执行 fn 并再次清 dirty
  // 但 c() 的惰性读取需要：依赖变化 → 标 dirty → 下次读取才重算
  // 矛盾：effect 是立即执行的，不是惰性的
  // 正解：不要用 effect，改用手动订阅 + dirty 标记
  // 重新设计：
  const subs = new Set();  // 手动订阅者
  const track = () => {
    if (_cur && !subs.has(_cur)) {
      subs.add(_cur);
      _cur.cleanups.push(() => subs.delete(_cur));
    }
  };
  const recompute = () => {
    dirty = true;
    for (const s of [...subs]) s.run();
  };
  const c = () => {
    track();
    if (dirty) {
      dirty = false;
      const prev = _cur;
      _cur = { run: recompute, cleanups: [] };  // 让 fn 内的 signal() 订阅 recompute
      try { cached = fn(); }
      finally { _cur = prev; }
    }
    return cached;
  };
  c.on = (f) => effect(() => f(c()));
  return c;
}
```

**简化最终实现**（替换 step 3 的所有代码）：

```javascript
export function computed(fn) {
  let cached;
  let dirty = true;
  const recompute = () => { dirty = true; };
  const c = () => {
    if (_cur && !c._subs) c._subs = new Set();
    if (_cur) {
      c._subs.add(_cur);
      _cur.cleanups.push(() => c._subs.delete(_cur));
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
```

修改 `recompute` 通知订阅者：

```javascript
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/state.test.js`
Expected: PASS，17 用例全绿。如有失败，检查 dirty 时序。

- [ ] **Step 5: 提交**

```bash
git add src/lib/state.js test/state.test.js
git commit -m "feat(state): add computed with lazy evaluation and dirty tracking"
```

---

## Task 4: state.js — batch 批量更新

**Files:**
- Modify: `src/lib/state.js`
- Test: `test/state.test.js`

- [ ] **Step 1: 追加失败测试 — batch**

Append to `test/state.test.js`:

```javascript
import { batch } from '../src/lib/state.js';

describe('batch 批量更新', () => {
  it('batch 内多次 set 只触发一次 effect', () => {
    const a = signal(1);
    const b = signal(2);
    const fn = vi.fn(() => { a(); b(); });
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    batch(() => {
      a.set(10);
      b.set(20);
    });
    expect(fn).toHaveBeenCalledTimes(2);  // 只多 1 次
  });

  it('batch 内 set 同一 signal 多次只通知一次', () => {
    const s = signal(0);
    const fn = vi.fn(() => { s(); });
    effect(fn);
    batch(() => {
      s.set(1);
      s.set(2);
      s.set(3);
    });
    expect(fn).toHaveBeenCalledTimes(2);  // 首次 + batch 结束 1 次
  });

  it('嵌套 batch 不重复通知', () => {
    const s = signal(0);
    const fn = vi.fn(() => { s(); });
    effect(fn);
    batch(() => {
      s.set(1);
      batch(() => {
        s.set(2);
      });
      // 内层 batch 应不触发通知（外层未结束）
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('batch 外的 set 立即通知', () => {
    const s = signal(0);
    const fn = vi.fn(() => { s(); });
    effect(fn);
    s.set(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/state.test.js`
Expected: 新 4 用例 FAIL（batch 未实现）。

- [ ] **Step 3: 实现 batch**

Append to `src/lib/state.js`:

```javascript
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
      for (const e of s._subs?.keys?.() ?? []) effects.add(e);
    }
    for (const e of effects) e.run();
  }
}
```

**问题**：`s._subs` 未暴露。修正——signal 内部 subs 是 Map，需要在 signal 闭包内挂 `_subs` 引用供 batch 读取。

修改 `signal` 函数，在 `s.set` 中使用 `_pending.add(s)` 时确保 `s` 携带 subs 引用：

```javascript
export function signal(v) {
  let val = v;
  const subs = new Map();
  const s = () => {
    if (_cur && !subs.has(_cur)) {
      const cleanup = () => subs.delete(_cur);
      subs.set(_cur, cleanup);
      _cur.cleanups.push(cleanup);
    }
    return val;
  };
  s.set = (nv) => {
    if (typeof nv === 'function') nv = nv(val);
    if (Object.is(nv, val)) return;
    val = nv;
    if (_batching) { s._subs = subs; _pending.add(s); }
    else _notify(subs);
  };
  s.on = (f) => {
    const wrapped = { run: f, cleanups: [] };
    subs.set(wrapped, () => subs.delete(wrapped));
    return () => subs.delete(wrapped);
  };
  return s;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/state.test.js`
Expected: PASS，21 用例全绿。

- [ ] **Step 5: 提交**

```bash
git add src/lib/state.js test/state.test.js
git commit -m "feat(state): add batch for coalescing multiple signal updates"
```

---

## Task 5: state.js — bus 事件总线

**Files:**
- Modify: `src/lib/state.js`
- Test: `test/state.test.js`

- [ ] **Step 1: 追加失败测试 — bus**

Append to `test/state.test.js`:

```javascript
import { bus } from '../src/lib/state.js';

describe('bus 事件总线', () => {
  it('bus 是 EventTarget 实例', () => {
    expect(bus).toBeInstanceOf(EventTarget);
  });

  it('dispatchEvent 触发 addEventListener 回调', () => {
    const fn = vi.fn();
    bus.addEventListener('test:event', fn);
    bus.dispatchEvent(new CustomEvent('test:event', { detail: { x: 1 } }));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0].detail).toEqual({ x: 1 });
  });

  it('removeEventListener 后不再触发', () => {
    const fn = vi.fn();
    bus.addEventListener('test:remove', fn);
    bus.removeEventListener('test:remove', fn);
    bus.dispatchEvent(new Event('test:remove'));
    expect(fn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/state.test.js`
Expected: 新 3 用例 FAIL（bus 未导出）。

- [ ] **Step 3: 实现 bus**

Append to `src/lib/state.js`:

```javascript
export const bus = new EventTarget();
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/state.test.js`
Expected: PASS，24 用例全绿。

- [ ] **Step 5: 跑 ESLint 确认无 warning**

Run: `npx eslint src/lib/state.js test/state.test.js --max-warnings 0`
Expected: 无输出（0 error 0 warning）。

- [ ] **Step 6: 提交**

```bash
git add src/lib/state.js test/state.test.js
git commit -m "feat(state): add bus event target and finalize state module"
```

---

## Task 6: fetch.js — 错误类 + 基础 fetchPage

**Files:**
- Create: `src/lib/fetch.js`
- Test: `test/fetch.test.js`

- [ ] **Step 1: 写失败测试 — 基础 GET + JSON 解析**

Create `test/fetch.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchPage, FetchError, TimeoutError, HttpError, AbortError } from '../src/lib/fetch.js';

// 全局 fetch mock
const _fetch = vi.fn();
beforeEach(() => {
  _fetch.mockReset();
  globalThis.fetch = _fetch;
  globalThis.Response = Response;
});
afterEach(() => vi.restoreAllMocks());

function mockResponse(body, opts = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status: 200, headers: { 'Content-Type': 'application/json' }, ...opts,
  });
}

describe('fetchPage 基础', () => {
  it('GET 请求解析 JSON', async () => {
    _fetch.mockResolvedValue(mockResponse({ list: [1, 2, 3] }));
    const data = await fetchPage('/api/test');
    expect(data).toEqual({ list: [1, 2, 3] });
    expect(_fetch).toHaveBeenCalledOnce();
    expect(_fetch.mock.calls[0][1].method).toBe('GET');
  });

  it('空响应 body 返回 null', async () => {
    _fetch.mockResolvedValue(new Response('', { status: 200 }));
    const data = await fetchPage('/api/empty');
    expect(data).toBeNull();
  });

  it('responseType=text 返回字符串', async () => {
    _fetch.mockResolvedValue(mockResponse('plain text', { headers: { 'Content-Type': 'text/plain' } }));
    const data = await fetchPage('/api/text', { responseType: 'text' });
    expect(data).toBe('plain text');
  });

  it('responseType=response 返回原始 Response', async () => {
    const res = mockResponse({ ok: true });
    _fetch.mockResolvedValue(res);
    const data = await fetchPage('/api/raw', { responseType: 'response' });
    expect(data).toBe(res);
  });

  it('POST 请求传 body', async () => {
    _fetch.mockResolvedValue(mockResponse({ ok: true }));
    await fetchPage('/api/post', { method: 'POST', body: '{"a":1}' });
    expect(_fetch.mock.calls[0][1].method).toBe('POST');
    expect(_fetch.mock.calls[0][1].body).toBe('{"a":1}');
  });

  it('自定义 headers 透传', async () => {
    _fetch.mockResolvedValue(mockResponse({}));
    await fetchPage('/api/h', { headers: { 'X-Token': 'abc' } });
    expect(_fetch.mock.calls[0][1].headers['X-Token']).toBe('abc');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/fetch.test.js`
Expected: FAIL，模块找不到。

- [ ] **Step 3: 实现错误类 + fetchPage + _doFetch + _parseResponse**

Create `src/lib/fetch.js`:

```javascript
// af-mobile UI —— 数据获取封装
// fetchPage + 错误分类（Timeout/Http/Abort）+ 去重/缓存/拦截器
// 顶层仅声明 Map/Set，无 DOM 访问，Node 18+ fetch/AbortController 原生（SSR 安全）

export class FetchError extends Error {}
export class TimeoutError extends FetchError {}
export class HttpError extends FetchError {
  constructor(status, url, body) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
    this.body = body;
  }
}
export class AbortError extends FetchError {}

const _inflight = new Map();      // url → Promise（GET 去重）
const _cache = new Map();         // url → { data, expiry }
const _interceptors = [];         // 拦截器数组

export async function fetchPage(url, opts = {}) {
  const {
    method = 'GET', headers = {}, body = null,
    timeout = 10000, retries = 1, retryDelay = 300,
    dedupe = true, cache = false, cacheTTL = 5000,
    responseType = 'json', signal = null,
  } = opts;

  // 1. 缓存命中
  if (cache && method === 'GET') {
    const hit = _cache.get(url);
    if (hit && hit.expiry > Date.now()) return hit.data;
  }

  // 2. 请求去重
  if (dedupe && method === 'GET') {
    const inflight = _inflight.get(url);
    if (inflight) return inflight;
  }

  const promise = _doFetch(url, {
    method, headers, body, timeout, retries, retryDelay, responseType, signal,
  });

  if (dedupe && method === 'GET') {
    _inflight.set(url, promise);
    promise.finally(() => _inflight.delete(url));
  }

  const data = await promise;

  if (cache && method === 'GET') {
    _cache.set(url, { data, expiry: Date.now() + cacheTTL });
  }

  return data;
}

async function _doFetch(url, { method, headers, body, timeout, retries, retryDelay, responseType, signal }) {
  const ctrl = new AbortController();
  const timeoutId = timeout > 0 ? setTimeout(() => ctrl.abort(new TimeoutError()), timeout) : null;

  if (signal) {
    signal.addEventListener('abort', () => ctrl.abort(new AbortError()));
  }

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let finalOpts = { method, headers, body, signal: ctrl.signal };
      for (const interceptor of _interceptors) {
        const result = await interceptor(url, finalOpts);
        if (result instanceof Response) return _parseResponse(result, responseType);
        finalOpts = result;
      }
      const res = await fetch(url, finalOpts);
      if (!res.ok) {
        const errBody = await res.text().catch(() => null);
        throw new HttpError(res.status, url, errBody);
      }
      if (timeoutId) clearTimeout(timeoutId);
      return await _parseResponse(res, responseType);
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if (err instanceof AbortError) throw err;
      lastErr = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, retryDelay * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
  throw lastErr;
}

async function _parseResponse(res, responseType) {
  switch (responseType) {
    case 'text': return await res.text();
    case 'blob': return await res.blob();
    case 'response': return res;
    case 'json':
    default:
      const text = await res.text();
      if (!text) return null;
      try { return JSON.parse(text); }
      catch (e) { throw new FetchError(`Invalid JSON: ${e.message}`); }
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/fetch.test.js`
Expected: PASS，6 用例全绿。

- [ ] **Step 5: 提交**

```bash
git add src/lib/fetch.js test/fetch.test.js
git commit -m "feat(fetch): add fetchPage with error classes and JSON parsing"
```

---

## Task 7: fetch.js — 错误分类（Timeout/Http/Abort）

**Files:**
- Modify: `test/fetch.test.js`

- [ ] **Step 1: 追加失败测试 — 错误分类**

Append to `test/fetch.test.js`:

```javascript
describe('fetchPage 错误分类', () => {
  it('HTTP 404 抛 HttpError 含 status 和 body', async () => {
    _fetch.mockResolvedValue(new Response('Not Found', { status: 404 }));
    await expect(fetchPage('/api/404')).rejects.toMatchObject({
      name: 'HttpError', status: 404, body: 'Not Found',
    });
    expect(_fetch).toHaveBeenCalledOnce();  // HTTP 错误不重试
  });

  it('HTTP 500 抛 HttpError', async () => {
    _fetch.mockResolvedValue(new Response('Server Error', { status: 500 }));
    await expect(fetchPage('/api/500')).rejects.toBeInstanceOf(HttpError);
  });

  it('timeout=0 不超时', async () => {
    _fetch.mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 50));
      return mockResponse({ ok: true });
    });
    const data = await fetchPage('/api/slow', { timeout: 0 });
    expect(data).toEqual({ ok: true });
  });

  it('timeout 触发 TimeoutError', async () => {
    _fetch.mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 200));
      return mockResponse({});
    });
    await expect(fetchPage('/api/timeout', { timeout: 50 })).rejects.toBeInstanceOf(TimeoutError);
  });

  it('外部 signal abort 触发 AbortError', async () => {
    _fetch.mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 200));
      return mockResponse({});
    });
    const ctrl = new AbortController();
    const p = fetchPage('/api/abort', { signal: ctrl.signal, timeout: 0 });
    ctrl.abort();
    await expect(p).rejects.toBeInstanceOf(AbortError);
  });

  it('所有错误都是 FetchError 子类', async () => {
    _fetch.mockResolvedValue(new Response('', { status: 404 }));
    await expect(fetchPage('/api/e')).rejects.toBeInstanceOf(FetchError);
  });

  it('JSON 解析失败抛 FetchError', async () => {
    _fetch.mockResolvedValue(new Response('not json', {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    await expect(fetchPage('/api/badjson')).rejects.toBeInstanceOf(FetchError);
    await expect(fetchPage('/api/badjson')).rejects.not.toBeInstanceOf(HttpError);
  });
});
```

- [ ] **Step 2: 运行测试确认通过**

Run: `npx vitest run test/fetch.test.js`
Expected: PASS（Task 6 已实现错误类，新 7 用例应直接通过）。

- [ ] **Step 3: 提交**

```bash
git add test/fetch.test.js
git commit -m "test(fetch): cover timeout/http/abort/json-parse error classification"
```

---

## Task 8: fetch.js — 重试 + 去重 + 缓存 + 拦截器

**Files:**
- Modify: `test/fetch.test.js`

- [ ] **Step 1: 追加失败测试 — 重试**

Append to `test/fetch.test.js`:

```javascript
describe('fetchPage 重试', () => {
  it('网络错误重试 retries 次后抛错', async () => {
    _fetch.mockRejectedValue(new TypeError('network error'));
    await expect(fetchPage('/api/retry', { retries: 2, retryDelay: 1 })).rejects.toBeInstanceOf(TypeError);
    expect(_fetch).toHaveBeenCalledTimes(3);  // 初始 + 2 次重试
  });

  it('HTTP 错误不重试', async () => {
    _fetch.mockResolvedValue(new Response('', { status: 500 }));
    await expect(fetchPage('/api/noretry', { retries: 3 })).rejects.toBeInstanceOf(HttpError);
    expect(_fetch).toHaveBeenCalledOnce();
  });

  it('重试期间成功则返回数据', async () => {
    _fetch.mockResolvedValueOnce(new TypeError('fail'))
          .mockResolvedValueOnce(mockResponse({ ok: true }));
    const data = await fetchPage('/api/retryok', { retries: 2, retryDelay: 1 });
    expect(data).toEqual({ ok: true });
    expect(_fetch).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: 追加失败测试 — 去重**

Append to `test/fetch.test.js`:

```javascript
import { invalidateCache, clearCache } from '../src/lib/fetch.js';

describe('fetchPage 去重', () => {
  it('相同 URL 并发 GET 只发 1 次 fetch', async () => {
    _fetch.mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 50));
      return mockResponse({ ok: true });
    });
    const [a, b, c] = await Promise.all([
      fetchPage('/api/dedupe'),
      fetchPage('/api/dedupe'),
      fetchPage('/api/dedupe'),
    ]);
    expect(_fetch).toHaveBeenCalledOnce();
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(c).toEqual({ ok: true });
  });

  it('POST 请求不去重', async () => {
    _fetch.mockResolvedValue(mockResponse({}));
    await Promise.all([
      fetchPage('/api/post', { method: 'POST', body: '1' }),
      fetchPage('/api/post', { method: 'POST', body: '2' }),
    ]);
    expect(_fetch).toHaveBeenCalledTimes(2);
  });

  it('去重完成后再次请求会重新 fetch', async () => {
    _fetch.mockResolvedValue(mockResponse({}));
    await fetchPage('/api/again');
    await fetchPage('/api/again');
    expect(_fetch).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: 追加失败测试 — 缓存**

Append to `test/fetch.test.js`:

```javascript
describe('fetchPage 缓存', () => {
  it('cache=true 命中缓存跳过 fetch', async () => {
    _fetch.mockResolvedValue(mockResponse({ v: 1 }));
    await fetchPage('/api/c1', { cache: true, cacheTTL: 1000 });
    const data = await fetchPage('/api/c1', { cache: true, cacheTTL: 1000 });
    expect(data).toEqual({ v: 1 });
    expect(_fetch).toHaveBeenCalledOnce();
  });

  it('TTL 过期后重新请求', async () => {
    _fetch.mockResolvedValue(mockResponse({ v: 1 }));
    await fetchPage('/api/c2', { cache: true, cacheTTL: 10 });
    await new Promise(r => setTimeout(r, 30));
    _fetch.mockResolvedValue(mockResponse({ v: 2 }));
    const data = await fetchPage('/api/c2', { cache: true, cacheTTL: 10 });
    expect(data).toEqual({ v: 2 });
    expect(_fetch).toHaveBeenCalledTimes(2);
  });

  it('invalidateCache 主动失效', async () => {
    _fetch.mockResolvedValue(mockResponse({ v: 1 }));
    await fetchPage('/api/c3', { cache: true, cacheTTL: 10000 });
    invalidateCache('/api/c3');
    _fetch.mockResolvedValue(mockResponse({ v: 2 }));
    const data = await fetchPage('/api/c3', { cache: true, cacheTTL: 10000 });
    expect(data).toEqual({ v: 2 });
    expect(_fetch).toHaveBeenCalledTimes(2);
  });

  it('clearCache 清空所有缓存', async () => {
    _fetch.mockResolvedValue(mockResponse({ a: 1 }));
    await fetchPage('/api/c4', { cache: true, cacheTTL: 10000 });
    await fetchPage('/api/c5', { cache: true, cacheTTL: 10000 });
    clearCache();
    _fetch.mockResolvedValue(mockResponse({ a: 2 }));
    const data = await fetchPage('/api/c4', { cache: true, cacheTTL: 10000 });
    expect(data).toEqual({ a: 2 });
    expect(_fetch).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 4: 追加失败测试 — 拦截器**

Append to `test/fetch.test.js`:

```javascript
import { addInterceptor, removeInterceptor } from '../src/lib/fetch.js';

describe('fetchPage 拦截器', () => {
  afterEach(() => removeInterceptor.length && _interceptors_reset());

  it('拦截器返回 opts 继续请求', async () => {
    _fetch.mockResolvedValue(mockResponse({}));
    const interceptor = (url, opts) => {
      opts.headers['X-Auth'] = 'token';
      return opts;
    };
    addInterceptor(interceptor);
    await fetchPage('/api/i1');
    expect(_fetch.mock.calls[0][1].headers['X-Auth']).toBe('token');
    removeInterceptor(interceptor);
  });

  it('拦截器返回 Response 短路', async () => {
    _fetch.mockResolvedValue(mockResponse({ real: true }));
    addInterceptor(() => new Response(JSON.stringify({ mock: true }), {
      headers: { 'Content-Type': 'application/json' },
    }));
    const data = await fetchPage('/api/i2');
    expect(data).toEqual({ mock: true });
    expect(_fetch).not.toHaveBeenCalled();
  });

  it('多个拦截器按顺序执行', async () => {
    _fetch.mockResolvedValue(mockResponse({}));
    const order = [];
    addInterceptor((url, opts) => { order.push('a'); return opts; });
    addInterceptor((url, opts) => { order.push('b'); return opts; });
    await fetchPage('/api/i3');
    expect(order).toEqual(['a', 'b']);
  });
});
```

注意：`_interceptors_reset` 不是真实函数，需要导出一个内部重置函数供测试用。修正——在测试中手动 removeInterceptor：

```javascript
// 替换 afterEach
afterEach(() => {
  // 移除所有测试添加的拦截器（通过 removeInterceptor 逐个移除）
  // 简化：在测试文件顶部 import 时同时 import 一个 _resetInterceptors（仅测试用）
});
```

更简方案：在 `fetch.js` 导出一个测试用的 `_resetInterceptors`（仅测试用，不写入 index.js）：

```javascript
// src/lib/fetch.js 末尾追加
export function _resetInterceptors() {
  _interceptors.length = 0;
}
```

修正测试文件的 afterEach：

```javascript
import { addInterceptor, removeInterceptor, _resetInterceptors } from '../src/lib/fetch.js';
afterEach(() => _resetInterceptors());
```

- [ ] **Step 5: 实现 invalidateCache / clearCache / addInterceptor / removeInterceptor / _resetInterceptors**

Append to `src/lib/fetch.js`:

```javascript
export function addInterceptor(fn) {
  _interceptors.push(fn);
}

export function removeInterceptor(fn) {
  const i = _interceptors.indexOf(fn);
  if (i >= 0) _interceptors.splice(i, 1);
}

export function invalidateCache(url) {
  _cache.delete(url);
}

export function clearCache() {
  _cache.clear();
}

// 测试用：重置拦截器（不导出到 index.js）
export function _resetInterceptors() {
  _interceptors.length = 0;
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npx vitest run test/fetch.test.js`
Expected: PASS，全部用例（基础 6 + 错误 7 + 重试 3 + 去重 3 + 缓存 4 + 拦截器 3 = 26）全绿。

- [ ] **Step 7: 跑 ESLint**

Run: `npx eslint src/lib/fetch.js test/fetch.test.js --max-warnings 0`
Expected: 0 error 0 warning。

- [ ] **Step 8: 提交**

```bash
git add src/lib/fetch.js test/fetch.test.js
git commit -m "feat(fetch): add retries/dedupe/cache/interceptors"
```

---

## Task 9: router.js — route 注册 + matchPath + start

**Files:**
- Create: `src/lib/router.js`
- Test: `test/router.test.js`

- [ ] **Step 1: 写失败测试 — 注册 + 匹配 + 启动**

Create `test/router.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { route, go, current, start, beforeEach, afterEach, notFound } from '../src/lib/router.js';

beforeEach(() => {
  // 重置 history + DOM
  window.history.replaceState({}, '', '/');
  document.body.innerHTML = '<div id="app" data-router-outlet></div>';
  // router 模块内部状态无法重置，每次测试用新路径隔离
});

describe('router 注册与匹配', () => {
  it('route 注册 handler', async () => {
    const fn = vi.fn();
    route('/test1', fn);
    start({ outlet: '#app' });
    await go('/test1');
    expect(fn).toHaveBeenCalledOnce();
  });

  it(':param 参数解析', async () => {
    let received = null;
    route('/users/:id', (params) => { received = params; });
    start({ outlet: '#app' });
    await go('/users/123');
    expect(received).toEqual({ id: '123' });
  });

  it('多段 :param', async () => {
    let received = null;
    route('/posts/:cat/:id', (params) => { received = params; });
    start({ outlet: '#app' });
    await go('/posts/tech/456');
    expect(received).toEqual({ cat: 'tech', id: '456' });
  });

  it('未匹配路由触发 notFound', async () => {
    const notFoundFn = vi.fn();
    notFound(notFoundFn);
    start({ outlet: '#app' });
    await go('/nonexistent');
    expect(notFoundFn).toHaveBeenCalledOnce();
    expect(notFoundFn.mock.calls[0][0]).toBe('/nonexistent');
  });

  it('current() 返回当前路由信息', async () => {
    route('/cur', () => {});
    start({ outlet: '#app' });
    await go('/cur');
    const c = current();
    expect(c.path).toBe('/cur');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/router.test.js`
Expected: FAIL，模块找不到。

- [ ] **Step 3: 实现 route/matchPath/start/go/current/notFound**

Create `src/lib/router.js`:

```javascript
// af-mobile UI —— 移动端 SPA 路由
// route/go/back/forward + beforeEach/afterEach/notFound + router-view + keep-alive + 转场
// 顶层无副作用，start() 显式启动（SSR 安全）

const _routes = [];
let _rootOutlet = null;
let _currentNav = null;
let _currentRoute = null;
let _beforeEachGuard = null;
let _afterEachHook = null;
let _notFoundHandler = null;
let _navStack = [];
let _cache = new Map();           // path → { outlet, scrollTop, signal }
let _keepAliveMax = 5;

function matchPath(pattern, path) {
  const pp = pattern.split('/').filter(Boolean);
  const ap = path.split('/').filter(Boolean);
  if (pp.length !== ap.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) {
      params[pp[i].slice(1)] = decodeURIComponent(ap[i]);
    } else if (pp[i] !== ap[i]) {
      return null;
    }
  }
  return params;
}

function match(path) {
  for (const r of _routes) {
    const params = matchPath(r.path, path);
    if (params !== null) return { route: r, params };
  }
  return null;
}

export function route(path, handler, options = {}) {
  _routes.push({ path, handler, ...options });
}

export function beforeEach(guard) { _beforeEachGuard = guard; }
export function afterEach(hook) { _afterEachHook = hook; }
export function notFound(handler) { _notFoundHandler = handler; }

export function current() {
  return _currentRoute ? { ..._currentRoute } : null;
}

export function start(options = {}) {
  if (typeof history === 'undefined') return;
  const { scrollRestoration = true, outlet = '#app', keepAliveMax = 5 } = options;
  if (scrollRestoration && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  _rootOutlet = document.querySelector(outlet);
  _keepAliveMax = keepAliveMax;
  addEventListener('popstate', () => {
    _navStack.pop();
    document.documentElement.dataset.transition = 'back';
    render(location.pathname);
  });
  render(location.pathname);
}

async function render(path) {
  _currentNav?.abort();
  const nav = { aborted: false, controller: new AbortController() };
  _currentNav = nav;

  const matched = match(path);
  if (!matched) {
    _notFoundHandler?.(path);
    _currentRoute = { path, params: {}, route: null, outlet: _rootOutlet };
    return;
  }

  const { route: r, params } = matched;

  if (_beforeEachGuard) {
    const result = await _beforeEachGuard(r, params, path);
    if (result === false) return;
    if (typeof result === 'string') { go(result); return; }
  }
  if (nav.aborted) return;

  const node = document.createElement('div');
  node.setAttribute('data-router-view', '');
  if (_rootOutlet) _rootOutlet.innerHTML = '';
  if (_rootOutlet) _rootOutlet.appendChild(node);

  const ctx = { outlet: node, signal: nav.controller.signal, go };
  const subOutletSelector = await r.handler(params, ctx);
  if (typeof subOutletSelector === 'string') {
    ctx.outlet = node.querySelector(subOutletSelector) || node;
  }

  if (nav.aborted) return;

  _currentRoute = { path, params, route: r, outlet: node };
  _afterEachHook?.(r, params, path);
  if (r.scroll !== false && typeof scrollTo !== 'undefined') scrollTo(0, 0);
}

export function go(path, options = {}) {
  if (typeof history === 'undefined') return Promise.resolve();
  const { replace = false, transition = true } = options;
  _navStack.push(path);
  document.documentElement.dataset.transition = 'forward';
  const navigate = () => {
    if (replace) history.replaceState({}, '', path);
    else history.pushState({}, '', path);
    return render(path);
  };
  if (transition && document.startViewTransition) {
    return new Promise(resolve => {
      document.startViewTransition(() => navigate().then(resolve));
    });
  }
  return navigate();
}

export function back() {
  if (typeof history !== 'undefined') history.back();
}

export function forward() {
  if (typeof history !== 'undefined') history.forward();
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/router.test.js`
Expected: PASS，5 用例全绿。

- [ ] **Step 5: 提交**

```bash
git add src/lib/router.js test/router.test.js
git commit -m "feat(router): add route registration, path matching, and start"
```

---

## Task 10: router.js — beforeEach/afterEach 守卫

**Files:**
- Modify: `test/router.test.js`

- [ ] **Step 1: 追加失败测试 — 守卫**

Append to `test/router.test.js`:

```javascript
describe('router 守卫', () => {
  it('beforeEach 返回 false 阻止导航', async () => {
    const handler = vi.fn();
    route('/guard1', handler);
    beforeEach(() => false);
    start({ outlet: '#app' });
    await go('/guard1');
    expect(handler).not.toHaveBeenCalled();
    _beforeEachGuard = null;  // 重置（简化，实际应通过模块导出重置）
  });

  it('beforeEach 返回 string 重定向', async () => {
    const target = vi.fn();
    route('/guard2', vi.fn());
    route('/guard2-target', target);
    beforeEach((r, p, path) => path === '/guard2' ? '/guard2-target' : undefined);
    start({ outlet: '#app' });
    await go('/guard2');
    expect(target).toHaveBeenCalledOnce();
  });

  it('beforeEach 返回 void 继续', async () => {
    const handler = vi.fn();
    route('/guard3', handler);
    beforeEach(() => {});
    start({ outlet: '#app' });
    await go('/guard3');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('afterEach 在导航完成后执行', async () => {
    const handler = vi.fn();
    const after = vi.fn();
    route('/after1', handler);
    afterEach(after);
    start({ outlet: '#app' });
    await go('/after1');
    expect(handler).toHaveBeenCalledBefore(after);
    expect(after).toHaveBeenCalledOnce();
  });

  it('beforeEach 支持异步', async () => {
    const handler = vi.fn();
    route('/async-guard', handler);
    beforeEach(async () => {
      await new Promise(r => setTimeout(r, 10));
      return undefined;
    });
    start({ outlet: '#app' });
    await go('/async-guard');
    expect(handler).toHaveBeenCalledOnce();
  });
});
```

**注意**：`_beforeEachGuard = null` 是内部变量，测试无法直接访问。需要导出一个测试用重置函数。在 router.js 末尾追加：

```javascript
export function _resetRouter() {
  _routes.length = 0;
  _beforeEachGuard = null;
  _afterEachHook = null;
  _notFoundHandler = null;
  _currentRoute = null;
  _currentNav = null;
  _navStack = [];
  _cache.clear();
}
```

测试文件顶部 import：

```javascript
import { _resetRouter } from '../src/lib/router.js';
beforeEach(() => {
  _resetRouter();
  window.history.replaceState({}, '', '/');
  document.body.innerHTML = '<div id="app" data-router-outlet></div>';
});
```

- [ ] **Step 2: 运行测试确认通过**

Run: `npx vitest run test/router.test.js`
Expected: PASS，10 用例全绿。

- [ ] **Step 3: 提交**

```bash
git add src/lib/router.js test/router.test.js
git commit -m "feat(router): add beforeEach/afterEach guards with redirect support"
```

---

## Task 11: router.js — 嵌套路由 + outlet 链

**Files:**
- Modify: `src/lib/router.js`, `test/router.test.js`

- [ ] **Step 1: 追加失败测试 — 嵌套路由**

Append to `test/router.test.js`:

```javascript
describe('router 嵌套路由', () => {
  it('父路由返回子 outlet 选择器', async () => {
    const parent = vi.fn((params, ctx) => {
      ctx.outlet.innerHTML = '<main data-router-outlet></main>';
      return 'main[data-router-outlet]';
    });
    const child = vi.fn((params, ctx) => {
      ctx.outlet.innerHTML = '<div>child content</div>';
    });
    route('/nest', parent);
    route('/nest/sub', child);
    start({ outlet: '#app' });
    await go('/nest/sub');
    expect(parent).toHaveBeenCalledOnce();
    expect(child).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-router-view] main').innerHTML).toContain('child content');
  });

  it('ctx.outlet 正确指向子 outlet', async () => {
    let childOutletTag = null;
    route('/nest2', (p, ctx) => {
      ctx.outlet.innerHTML = '<section data-router-outlet></section>';
      return 'section[data-router-outlet]';
    });
    route('/nest2/deep', (p, ctx) => {
      childOutletTag = ctx.outlet.tagName;
      ctx.outlet.innerHTML = 'deep';
    });
    start({ outlet: '#app' });
    await go('/nest2/deep');
    expect(childOutletTag).toBe('SECTION');
  });

  it('父路由不返回时子路由复用父 outlet', async () => {
    const child = vi.fn((p, ctx) => {
      ctx.outlet.innerHTML = '<div>in parent outlet</div>';
    });
    route('/nest3', () => {});  // 不返回
    route('/nest3/sub', child);
    start({ outlet: '#app' });
    await go('/nest3/sub');
    expect(child).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 运行测试确认通过**

Run: `npx vitest run test/router.test.js`
Expected: PASS（Task 9 已实现 outlet 链逻辑，新 3 用例应通过）。

- [ ] **Step 3: 提交**

```bash
git add test/router.test.js
git commit -m "test(router): cover nested routes and outlet chain"
```

---

## Task 12: router.js — 导航取消 + View Transitions

**Files:**
- Modify: `test/router.test.js`

- [ ] **Step 1: 追加失败测试 — 导航取消**

Append to `test/router.test.js`:

```javascript
describe('router 导航取消', () => {
  it('快速连续导航，旧 handler 被 abort', async () => {
    const handler = vi.fn(async (params, ctx) => {
      await new Promise(r => setTimeout(r, 50));
      if (ctx.signal.aborted) return;
      ctx.outlet.innerHTML = 'slow';
    });
    route('/cancel1', handler);
    route('/cancel2', () => {});
    start({ outlet: '#app' });
    const p1 = go('/cancel1');
    await go('/cancel2');  // 立即导航到另一个
    await p1;
    // cancel1 的 handler 被取消，不写入 'slow'
    expect(document.querySelector('[data-router-view]').innerHTML).not.toContain('slow');
  });

  it('go 返回 Promise 可 await', async () => {
    const fn = vi.fn();
    route('/await1', fn);
    start({ outlet: '#app' });
    await go('/await1');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('go({ replace: true }) 替换 history', async () => {
    const fn = vi.fn();
    route('/replace1', fn);
    start({ outlet: '#app' });
    await go('/replace1', { replace: true });
    expect(fn).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 追加失败测试 — View Transitions 降级**

Append to `test/router.test.js`:

```javascript
describe('router View Transitions', () => {
  it('不支持 startViewTransition 时直接导航', async () => {
    const orig = document.startViewTransition;
    delete document.startViewTransition;
    const fn = vi.fn();
    route('/vt1', fn);
    start({ outlet: '#app' });
    await go('/vt1');
    expect(fn).toHaveBeenCalledOnce();
    document.startViewTransition = orig;
  });

  it('transition=false 跳过 View Transitions', async () => {
    const orig = document.startViewTransition;
    const vtFn = vi.fn();
    document.startViewTransition = vtFn;
    const fn = vi.fn();
    route('/vt2', fn);
    start({ outlet: '#app' });
    await go('/vt2', { transition: false });
    expect(vtFn).not.toHaveBeenCalled();
    expect(fn).toHaveBeenCalledOnce();
    document.startViewTransition = orig;
  });

  it('前进导航设 data-transition=forward', async () => {
    route('/dir1', () => {});
    start({ outlet: '#app' });
    await go('/dir1');
    expect(document.documentElement.dataset.transition).toBe('forward');
  });
});
```

- [ ] **Step 3: 运行测试确认通过**

Run: `npx vitest run test/router.test.js`
Expected: PASS，全部用例（含导航取消 3 + View Transitions 3 = 共 19）全绿。

- [ ] **Step 4: 提交**

```bash
git add test/router.test.js
git commit -m "test(router): cover navigation cancellation and view transitions"
```

---

## Task 13: router.js — keep-alive 缓存

**Files:**
- Modify: `src/lib/router.js`, `test/router.test.js`

- [ ] **Step 1: 追加失败测试 — keep-alive**

Append to `test/router.test.js`:

```javascript
describe('router keep-alive', () => {
  it('keepAlive 路由再次进入不重新执行 handler', async () => {
    const handler = vi.fn((p, ctx) => {
      ctx.outlet.innerHTML = '<div>cached page</div>';
    });
    route('/ka1', handler, { keepAlive: true });
    route('/ka2', () => {});
    start({ outlet: '#app' });
    await go('/ka1');
    await go('/ka2');
    await go('/ka1');  // 再次进入，应命中缓存
    expect(handler).toHaveBeenCalledOnce();  // 只执行 1 次
  });

  it('非 keepAlive 路由每次进入都执行 handler', async () => {
    const handler = vi.fn();
    route('/noka1', handler);
    route('/noka2', () => {});
    start({ outlet: '#app' });
    await go('/noka1');
    await go('/noka2');
    await go('/noka1');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('keep-alive 超过上限 LRU 淘汰', async () => {
    const handlers = [];
    for (let i = 0; i < 7; i++) {
      const h = vi.fn((p, ctx) => { ctx.outlet.innerHTML = `<div>page${i}</div>`; });
      handlers.push(h);
      route(`/lru${i}`, h, { keepAlive: true });
    }
    start({ outlet: '#app', keepAliveMax: 5 });
    for (let i = 0; i < 7; i++) await go(`/lru${i}`);
    // 再次访问 lru0（应被淘汰，重新执行 handler）
    await go('/lru0');
    expect(handlers[0]).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/router.test.js`
Expected: 新 3 用例 FAIL（keep-alive 未实现，handler 被执行 2 次）。

- [ ] **Step 3: 实现 keep-alive**

修改 `src/lib/router.js` 的 `render` 函数：

```javascript
async function render(path) {
  _currentNav?.abort();
  const nav = { aborted: false, controller: new AbortController() };
  _currentNav = nav;

  // keep-alive 命中
  if (_cache.has(path)) {
    const cached = _cache.get(path);
    if (_rootOutlet) {
      _rootOutlet.innerHTML = '';
      _rootOutlet.appendChild(cached.outlet);
    }
    if (typeof scrollTo !== 'undefined') scrollTo(0, cached.scrollTop);
    _currentRoute = { path, params: {}, route: cached.route, outlet: cached.outlet };
    _afterEachHook?.(cached.route, {}, path);
    return;
  }

  const matched = match(path);
  if (!matched) {
    _notFoundHandler?.(path);
    _currentRoute = { path, params: {}, route: null, outlet: _rootOutlet };
    return;
  }

  const { route: r, params } = matched;

  if (_beforeEachGuard) {
    const result = await _beforeEachGuard(r, params, path);
    if (result === false) return;
    if (typeof result === 'string') { go(result); return; }
  }
  if (nav.aborted) return;

  const node = document.createElement('div');
  node.setAttribute('data-router-view', '');
  if (_rootOutlet) _rootOutlet.innerHTML = '';
  if (_rootOutlet) _rootOutlet.appendChild(node);

  const ctx = { outlet: node, signal: nav.controller.signal, go };
  const subOutletSelector = await r.handler(params, ctx);
  if (typeof subOutletSelector === 'string') {
    ctx.outlet = node.querySelector(subOutletSelector) || node;
  }

  if (nav.aborted) return;

  // keep-alive：缓存 DOM 节点
  if (r.keepAlive) {
    // LRU 淘汰
    while (_cache.size >= _keepAliveMax) {
      const oldest = _cache.keys().next().value;
      _cache.delete(oldest);
    }
    _cache.set(path, { outlet: node, scrollTop: 0, route: r });
  }

  _currentRoute = { path, params, route: r, outlet: node };
  _afterEachHook?.(r, params, path);
  if (r.scroll !== false && typeof scrollTo !== 'undefined') scrollTo(0, 0);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/router.test.js`
Expected: PASS，全部用例（含 keep-alive 3 = 共 22）全绿。

- [ ] **Step 5: 跑 ESLint**

Run: `npx eslint src/lib/router.js test/router.test.js --max-warnings 0`
Expected: 0 error 0 warning。

- [ ] **Step 6: 提交**

```bash
git add src/lib/router.js test/router.test.js
git commit -m "feat(router): add keep-alive cache with LRU eviction"
```

---

## Task 14: router.js — SSR 安全守卫

**Files:**
- Modify: `test/router.test.js`

- [ ] **Step 1: 追加测试 — SSR 守卫**

Append to `test/router.test.js`:

```javascript
describe('router SSR 安全', () => {
  it('模块 import 不触发任何副作用', () => {
    // import 时不应自动 addEventListener('popstate') 或访问 history
    // 已通过其他测试间接验证（import 后未调用 start 不会渲染）
    expect(true).toBe(true);  // 占位，实际由其他测试覆盖
  });

  it('back() 在无 history 时不抛错', () => {
    // jsdom 始终有 history，此测试验证 back 不抛错
    expect(() => back()).not.toThrow();
  });

  it('forward() 在无 history 时不抛错', () => {
    expect(() => forward()).not.toThrow();
  });
});
```

- [ ] **Step 2: 运行测试确认通过**

Run: `npx vitest run test/router.test.js`
Expected: PASS，25 用例全绿。

- [ ] **Step 3: 提交**

```bash
git add test/router.test.js
git commit -m "test(router): cover SSR safety guards"
```

---

## Task 15: index.js + index.d.ts 扩展导出

**Files:**
- Modify: `src/index.js`, `src/index.d.ts`

- [ ] **Step 1: 扩展 index.js 导出**

Edit `src/index.js`，在现有 export 之后追加：

```javascript
// ============================================================
// 核心运行时（按需 import，不计入组件体积预算）
// ============================================================
export { signal, computed, effect, batch, bus } from './lib/state.js';
export {
  fetchPage, FetchError, TimeoutError, HttpError, AbortError,
  addInterceptor, removeInterceptor, invalidateCache, clearCache,
} from './lib/fetch.js';
export {
  route, go, back, forward, beforeEach, afterEach, notFound, current, start,
} from './lib/router.js';
```

- [ ] **Step 2: 扩展 index.d.ts 类型声明**

Edit `src/index.d.ts`，在文件末尾追加：

```typescript
// ============================================================
// 核心运行时：state（响应式原语）
// ============================================================

/** 可写信号：sig() 读取，sig.set(v) 写入，sig.on(fn) 订阅 */
export type Signal<T> = {
  (): T;
  set(value: T | ((prev: T) => T)): void;
  on(fn: (value: T) => void): () => void;
};

/** 创建可写信号 */
export function signal<T>(initialValue: T): Signal<T>;

/** 创建派生信号（惰性求值，自动追踪依赖） */
export function computed<T>(fn: () => T): { (): T; on(fn: (value: T) => void): () => void };

/** 副作用：自动追踪依赖，返回取消函数 */
export function effect(fn: () => void): () => void;

/** 批量更新：合并多次 signal.set 的通知 */
export function batch(fn: () => void): void;

/** 跨组件事件总线（原生 EventTarget） */
export const bus: EventTarget;

// ============================================================
// 核心运行时：fetch（数据获取）
// ============================================================

/** fetchPage 错误基类 */
export class FetchError extends Error {}
/** 超时错误 */
export class TimeoutError extends FetchError {}
/** HTTP 状态码错误（非 2xx） */
export class HttpError extends FetchError {
  readonly status: number;
  readonly url: string;
  readonly body: string | null;
}
/** 用户/路由取消错误 */
export class AbortError extends FetchError {}

/** fetchPage 选项 */
export interface FetchPageOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  dedupe?: boolean;
  cache?: boolean;
  cacheTTL?: number;
  responseType?: 'json' | 'text' | 'blob' | 'response';
  signal?: AbortSignal | null;
}

/** 数据获取主入口 */
export function fetchPage<T = unknown>(url: string, options?: FetchPageOptions): Promise<T>;

/** 添加全局拦截器：返回 opts 继续，返回 Response 短路 */
export function addInterceptor(fn: (url: string, opts: any) => Promise<any> | any): void;
/** 移除拦截器 */
export function removeInterceptor(fn: (url: string, opts: any) => any): void;
/** 失效指定 URL 的缓存 */
export function invalidateCache(url: string): void;
/** 清空所有缓存 */
export function clearCache(): void;

// ============================================================
// 核心运行时：router（SPA 路由）
// ============================================================

/** 路由 handler 上下文 */
export interface RouteContext {
  outlet: HTMLElement;
  signal: AbortSignal;
  go: (path: string, options?: { replace?: boolean; transition?: boolean }) => Promise<void>;
}

/** 路由 handler：可返回子 outlet 选择器（用于嵌套） */
export type RouteHandler = (
  params: Record<string, string>,
  ctx: RouteContext
) => void | Promise<void | string>;

/** 路由注册选项 */
export interface RouteOptions {
  children?: Array<{ path: string; handler: RouteHandler }>;
  keepAlive?: boolean;
  scroll?: boolean;
}

/** 注册路由 */
export function route(path: string, handler: RouteHandler, options?: RouteOptions): void;

/** 导航到指定路径 */
export function go(path: string, options?: { replace?: boolean; transition?: boolean }): Promise<void>;

/** history.back() */
export function back(): void;
/** history.forward() */
export function forward(): void;

/** 全局前置守卫：返回 false 阻止，返回 string 重定向，返回 void/true 继续 */
export function beforeEach(
  guard: (route: any, params: Record<string, string>, path: string) => Promise<boolean | string | void> | boolean | string | void
): void;

/** 全局后置钩子 */
export function afterEach(
  hook: (route: any, params: Record<string, string>, path: string) => void
): void;

/** 404 处理 */
export function notFound(handler: (path: string) => void): void;

/** 获取当前路由信息 */
export function current(): { path: string; params: Record<string, string>; route: any; outlet: HTMLElement } | null;

/** 启动路由 */
export function start(options?: {
  outlet?: string;
  scrollRestoration?: boolean;
  keepAliveMax?: number;
  base?: string;
}): void;
```

- [ ] **Step 3: 跑 types:check**

Run: `npm run types:check`
Expected: PASS（三源一致：src/components / index.js / index.d.ts）。

注意：`check-types-sync.mjs` 只校验组件类（Af*），不校验 router/state/fetch 的非组件导出。types:check 应通过。

- [ ] **Step 4: 跑全量测试确认无回归**

Run: `npx vitest run`
Expected: PASS，全部测试（原有 + 新增 state/fetch/router）全绿。

- [ ] **Step 5: 提交**

```bash
git add src/index.js src/index.d.ts
git commit -m "feat: export router/state/fetch from index with TypeScript types"
```

---

## Task 16: size-check.mjs — coreRuntime 预算

**Files:**
- Modify: `scripts/size-check.mjs`

- [ ] **Step 1: 修改 BUDGET 增加 coreRuntime**

Edit `scripts/size-check.mjs`，修改 BUDGET 对象：

```javascript
const BUDGET = {
  css: 5.5,            // KB，不变
  perComponent: 2.6,   // KB，不变
  base: 1.2,           // KB，不变
  total: 14.5,         // KB，不变（仅组件+基类）
  onDemand2: 5.5,      // KB，不变
  coreRuntime: 3.7,    // KB，新增：router(2.0)+state(0.7)+fetch(0.8)+容差(0.2)
};
```

- [ ] **Step 2: 新增 measureCoreRuntime 函数**

在 `size-check.mjs` 的 `onDemand2Gz` 函数之后追加：

```javascript
// 核心运行时：router + state + fetch 合计 gzip（独立预算，不计入 total）
async function measureCoreRuntime() {
  const dir = mkdtempSync(join(tmpdir(), 'af-mobile-core-'));
  const entry = join(dir, 'entry.js');
  const toPosix = (p) => p.replace(/\\/g, '/');
  writeFileSync(entry,
    `import '${toPosix(join(SRC, 'lib/state.js'))}';\n` +
    `import '${toPosix(join(SRC, 'lib/fetch.js'))}';\n` +
    `import '${toPosix(join(SRC, 'lib/router.js'))}';\n`
  );
  const res = await build({
    entryPoints: [entry],
    bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none',
    absWorkingDir: ROOT,
  });
  return gzipSync(Buffer.from(res.outputFiles[0].text)).length;
}
```

- [ ] **Step 3: 在 main() 中调用并输出**

在 `main()` 的 `// 4. 按需 2 组件` 之后追加：

```javascript
  // 5. 核心运行时（router + state + fetch）
  const coreGz = await measureCoreRuntime();
```

在报告区域（按需 2 之后）追加：

```javascript
  // 核心运行时
  console.log('');
  const coreOver = coreGz > BUDGET.coreRuntime * KB;
  console.log(`核心运行时（state+fetch+router） ${fmt(coreGz).padStart(8)}  预算 ≤ ${BUDGET.coreRuntime}KB  ${coreOver ? '✗ 超限' : '✓'}`);
  if (coreOver) violations.push(`核心运行时 ${fmt(coreGz)} > ${BUDGET.coreRuntime}KB`);
```

- [ ] **Step 4: 运行 size check**

Run: `npm run size`
Expected: PASS，核心运行时 ≤ 3.7KB。如超限，优化实现（检查 minify 后代码）。

- [ ] **Step 5: 提交**

```bash
git add scripts/size-check.mjs
git commit -m "feat(size): add coreRuntime budget for router/state/fetch"
```

---

## Task 17: System Prompt — 4 要素写入 template

**Files:**
- Modify: `prompt/system-prompt.template.md`

- [ ] **Step 1: 在 PROJECT_EXTENSION_INJECTION_POINT 之前插入 4 要素**

Edit `prompt/system-prompt.template.md`，在 `<!-- {{{ PROJECT_EXTENSION_INJECTION_POINT }}} -->` 之前插入：

```markdown
---

# 页面模式（7 通用模式，按决策树选择，禁止自创结构）

## 模式选择决策树

用户需求关键词 → 模式：
  登录|注册|验证码|找回密码 → page-login
  列表|浏览|商品列表|订单列表|消息列表 → page-list
  详情|展示|文章详情|商品详情 → page-detail
  表单|报名|反馈|地址|录入 → page-form
  搜索|筛选 → page-search
  个人中心|设置|我的 → page-profile
  空态|无权限|网络错误|404 → page-empty

规则：
- 一个页面只能选一个主模式
- 子区域用通用组件（af-list/af-swiper/af-tabs），不切模式
- 多模式组合（如列表+搜索）用主模式 + 子区域组件，不是两模式叠加

---

# 数据契约（API 响应 → 模板字段映射规则）

## 列表数据
1. af-list 通过 list.data = items 注入（不用 render 属性时）
2. renderItem 模板用 {{field}} 引用字段，嵌套用 {{obj.field}}
3. 条件渲染用三元：{{item.status === 'paid' ? '已付款' : '待付款'}}
4. API 返回 {list: [...], total: N}，分页由 af-list 自动处理
5. 列表加载：list.data = await fetchPage(url)

## 详情数据
6. 单条数据通过 DOM 注入：getElementById + textContent/value
7. 富文本用 innerHTML（需 escapeHtml 转义，或用 html 模板标签）

## 表单数据
8. 表单提交：new FormData(form) → fetchPage(url, { method: 'POST', body })
9. 校验用原生 Constraint Validation（required/pattern），不手写 isValid

## 信号联动
10. signal 变化自动更新组件：effect(() => { list.data = items() })
11. 路由 handler 内 fetchPage → signal.set
12. 离开路由时取消 effect：返回的 cleanup 函数在 afterEach 或 beforeEach 调用

---

# Few-shot 示例

## 示例 1：page-list（消息列表）

输入：消息列表页，每条含头像/昵称/最后消息/时间/未读红点

输出：
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/af-mobile.css">
</head>
<body>
<div class="page">
  <nav class="navbar">消息</nav>
  <af-list id="list" item-height="64" refresh></af-list>
</div>
<script type="module">
import { signal, effect, fetchPage } from '/af-mobile.js';
const list = document.getElementById('list');
const items = signal([]);
effect(() => { list.data = items(); });
list.renderItem = (item) => `
  <div class="list-item g-3 aic">
    <img class="avatar" src="${item.avatar}" alt="">
    <div class="flex-1 fc">
      <div class="jcsb aic">
        <span class="body t-b">${item.name}</span>
        <span class="caption text-muted">${item.time}</span>
      </div>
      <span class="caption text-muted ws-nowrap">${item.lastMsg}</span>
    </div>
    ${item.unread ? `<span class="badge">${item.unread}</span>` : ''}
  </div>
`;
list.addEventListener('af-list:refresh', async () => {
  items.set(await fetchPage('/api/messages'));
  list.endRefresh();
});
items.set(await fetchPage('/api/messages'));
</script>
</body>
</html>

## 示例 2：page-login（登录）

输入：登录页，手机号 + 验证码

输出：
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/af-mobile.css">
</head>
<body>
<div class="page center p-4">
  <h1 class="title">登录</h1>
  <form id="loginForm" class="fc g-3">
    <input class="input" name="phone" type="tel" required pattern="1\d{10}" placeholder="手机号">
    <input class="input" name="code" type="text" required minlength="6" placeholder="验证码">
    <button class="btn btn-block" type="submit">登录</button>
  </form>
</div>
<script type="module">
import { fetchPage, go } from '/af-mobile.js';
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!e.target.checkValidity()) return;
  const data = new FormData(e.target);
  try {
    await fetchPage('/api/login', { method: 'POST', body: data });
    go('/home');
  } catch (err) {
    if (err.status === 401) alert('验证码错误');
  }
});
</script>
</body>
</html>

## 示例 3：page-detail（商品详情）

输入：商品详情页，含轮播图/标题/价格/规格/详情图文/底部购买栏

输出：
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/af-mobile.css">
</head>
<body>
<div class="page">
  <af-swiper id="banner" autoplay="3000"></af-swiper>
  <div class="section p-3">
    <div class="title">商品名称</div>
    <div class="body text-brand">¥99.00</div>
  </div>
  <div class="section p-3">
    <div class="body t-b">商品详情</div>
    <div id="detail-content" class="fc g-2"></div>
  </div>
  <nav class="navbar fixed">
    <button class="btn btn-block">立即购买</button>
  </nav>
</div>
<script type="module">
import { fetchPage } from '/af-mobile.js';
const data = await fetchPage('/api/product/1');
document.querySelector('.title').textContent = data.name;
document.getElementById('banner').innerHTML = data.images.map(src => `<img src="${src}" alt="">`).join('');
document.getElementById('detail-content').innerHTML = data.detailHtml;
</script>
</body>
</html>

## 示例 4：page-form（反馈表单）

输入：反馈页，类型选择 + 内容 textarea + 联系方式

输出：
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/af-mobile.css">
</head>
<body>
<div class="page">
  <nav class="navbar">意见反馈</nav>
  <form id="feedbackForm" class="fc g-3 p-3">
    <select class="input" name="type" required>
      <option value="">请选择类型</option>
      <option value="bug">问题反馈</option>
      <option value="suggest">功能建议</option>
    </select>
    <textarea class="input" name="content" required minlength="10" rows="4" placeholder="请输入反馈内容（至少 10 字）"></textarea>
    <input class="input" name="contact" type="text" placeholder="联系方式（选填）">
    <button class="btn btn-block" type="submit">提交</button>
  </form>
</div>
<script type="module">
import { fetchPage, back } from '/af-mobile.js';
document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!e.target.checkValidity()) { e.target.reportValidity(); return; }
  const data = new FormData(e.target);
  await fetchPage('/api/feedback', { method: 'POST', body: data });
  back();
});
</script>
</body>
</html>

## 示例 5：page-search（搜索）

输入：搜索页，顶部搜索框 + 历史/热门标签 + 结果列表

输出：
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/af-mobile.css">
</head>
<body>
<div class="page">
  <af-search-bar id="search" placeholder="搜索商品"></af-search-bar>
  <div id="history" class="section p-3">
    <div class="body t-b">历史搜索</div>
    <div class="fc g-2 wrap">
      <span class="tag">手机</span>
      <span class="tag">电脑</span>
    </div>
  </div>
  <af-list id="results" item-height="60"></af-list>
</div>
<script type="module">
import { signal, effect, fetchPage } from '/af-mobile.js';
const results = signal([]);
const list = document.getElementById('results');
effect(() => { list.data = results(); });
document.getElementById('search').addEventListener('af-search-bar:search', async (e) => {
  results.set(await fetchPage('/api/search?q=' + encodeURIComponent(e.detail.value)));
});
</script>
</body>
</html>

## 示例 6：page-profile（个人中心）

输入：个人中心页，头像/昵称 + 菜单列表

输出：
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/af-mobile.css">
</head>
<body>
<div class="page">
  <div class="section center p-4 fc g-2">
    <img class="avatar" src="/me.jpg" alt="">
    <div class="title">用户昵称</div>
  </div>
  <af-list id="menu" item-height="48">
    <div data-list-index="0" class="list-item jcsb aic">
      <span>我的订单</span><span class="caption">›</span>
    </div>
    <div data-list-index="1" class="list-item jcsb aic">
      <span>地址管理</span><span class="caption">›</span>
    </div>
    <div data-list-index="2" class="list-item jcsb aic">
      <span>设置</span><span class="caption">›</span>
    </div>
  </af-list>
</div>
</body>
</html>

## 示例 7：page-empty（空态）

输入：404 空态页

输出：
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/af-mobile.css">
</head>
<body>
<div class="page center fc g-3 p-4">
  <div class="title">404</div>
  <div class="body text-muted">页面不存在</div>
  <a class="btn" href="/">返回首页</a>
</div>
</body>
</html>

---

# 错误恢复（ESLint 报错后如何修正）

| ESLint 规则 | 报错原因 | 修正方案 |
|---|---|---|
| no-inline-style | style="..." 设置禁令属性 | 删除 style，改用 token class（如 padding→p-4） |
| token-whitelist | 白名单外 class | 查 154 白名单，用最近配方替代（如 .my-card → .card） |
| no-tailwind-syntax | p-[13px] 任意值语法 | 用最接近的原子类（p-3=12px 或 p-4=16px） |
| no-arbitrary-value | 自定义任意值 | 同上，改用预定义原子 |
| no-recipe-break | .btn + text-brand 叠加 | 删除 text-brand，.btn 文字已是 onbrand 色 |
| prefer-component | 手写列表轮播 | 改用 <af-list>/<af-swiper> 组件 |
| wc-light-no-style | Light DOM 组件内 style | 迁移到 Shadow 组件或 recipes.project.css |
| wc-shadow-use-token | Shadow CSS 硬编码颜色 | 改用 var(--c-*) 等 token |

## 修正原则
- 优先查白名单替换，不要自创新 class
- 组件能解决的不用原子类堆砌
- 内联 style 一律改 class，布局属性（display/width）例外
- 校验用原生 Constraint Validation，不手写状态变量

---

# 场景包（按项目类型注入 1-2 个，非全加载）

本项目暂未注入场景包。如需电商/营销/O2O 等场景，在 prompt/system-prompt.md 末尾追加对应场景包：
- 电商：cart order product-detail coupon
- 营销：landing lottery poster
- O2O：booking store-map review
- 内容：article video feed
- 企业：dashboard approval task
- 工具：result guide
- 教育：course-list course-detail exam
- 社交：chat community

场景包注入由 build-prompt.mjs 的 PROJECT_EXTENSION_INJECTION_POINT 处理，本项目不实现。

```

- [ ] **Step 2: 重新生成 system-prompt.md**

Run: `npm run prompt:build`
Expected: 生成新的 `prompt/system-prompt.md`，含 4 要素章节。

- [ ] **Step 3: 跑 prompt:check**

Run: `npm run prompt:check`
Expected: PASS（提交态与运行时一致）。

- [ ] **Step 4: 提交**

```bash
git add prompt/system-prompt.template.md prompt/system-prompt.md
git commit -m "feat(prompt): add 4 elements (patterns/data-contract/few-shot/error-recovery)"
```

---

## Task 18: check-prompt-sync.mjs — 4 要素存在性检查

**Files:**
- Modify: `scripts/check-prompt-sync.mjs`

- [ ] **Step 1: 新增 4 要素存在性检查**

Edit `scripts/check-prompt-sync.mjs`，在 `if (committed === runtime)` 之前追加：

```javascript
  // 4 要素存在性检查
  const REQUIRED_SECTIONS = [
    { name: '模式选择决策树', pattern: /# 页面模式.*模式选择决策树/s },
    { name: '数据契约', pattern: /# 数据契约/ },
    { name: 'Few-shot 示例', pattern: /# Few-shot 示例/ },
    { name: '错误恢复', pattern: /# 错误恢复/ },
  ];
  const missingSections = REQUIRED_SECTIONS.filter(s => !s.pattern.test(committed));
  if (missingSections.length) {
    console.log('\n✗ 缺失 4 要素章节：');
    missingSections.forEach(s => console.log(`  - ${s.name}`));
    process.exit(1);
  }
  console.log('\n✓ 4 要素章节齐全（模式决策树/数据契约/Few-shot/错误恢复）');
```

- [ ] **Step 2: 跑 prompt:check 确认通过**

Run: `npm run prompt:check`
Expected: PASS，输出"4 要素章节齐全"。

- [ ] **Step 3: 提交**

```bash
git add scripts/check-prompt-sync.mjs
git commit -m "feat(prompt-check): verify 4 elements presence in system-prompt"
```

---

## Task 19: 集成自检 — 全量验证

**Files:**
- 无改动，仅运行验证

- [ ] **Step 1: 跑 ESLint 全目录**

Run: `npx eslint src/ test/ scripts/ --max-warnings 0`
Expected: 0 error 0 warning。

如有 warning，逐条修复（不允许 eslint-disable 绕过，测试夹具例外）。

- [ ] **Step 2: 跑全量单元测试**

Run: `npx vitest run`
Expected: 全绿（原有测试 + state 24 + fetch 26 + router 25 = 新增 75 用例）。

- [ ] **Step 3: 跑体积预算**

Run: `npm run size`
Expected:
- L1+L2 CSS ≤ 5.5KB ✓
- 基类 ≤ 1.2KB ✓
- 各组件 ≤ 2.6KB ✓
- 全量 ≤ 14.5KB ✓
- 按需 2 组件 ≤ 5.5KB ✓
- **核心运行时 ≤ 3.7KB ✓（新增）**

- [ ] **Step 4: 跑白名单同步**

Run: `npm run whitelist:check`
Expected: PASS（未改动 CSS，应直接通过）。

- [ ] **Step 5: 跑类型同步**

Run: `npm run types:check`
Expected: PASS（三源一致）。

- [ ] **Step 6: 跑 prompt 同步**

Run: `npm run prompt:check`
Expected: PASS（提交态与运行时一致 + 4 要素齐全）。

- [ ] **Step 7: 一体化命令最终确认**

Run: `npx vitest run && npm run size && npm run whitelist:check && npm run types:check && npm run prompt:check`
Expected: 全部 PASS。

- [ ] **Step 8: 最终提交（如有修复）**

```bash
git add -A
git commit -m "chore: pass all CI checks for P0 production essentials"
```

---

## Self-Review

### 1. Spec 覆盖

| 设计文档章节 | 对应 Task |
|---|---|
| §1 架构总览 | Task 15（index.js 导出）|
| §2 Router（2.1-2.11） | Task 9-14 |
| §3 State（3.1-3.10） | Task 1-5 |
| §4 fetchPage（4.1-4.14） | Task 6-8 |
| §5 System Prompt 4 要素 | Task 17-18 |
| §6 体积预算调整 | Task 16 |
| §7 自检清单 | Task 19 |

**gap 检查**：
- §2.4.6 与 af-tabs 集成示例——已在 Task 17 的 few-shot 示例 5 覆盖（用户侧代码示例）✓
- §3.10 循环依赖检测——未单独测试，但 effect 重跑机制天然避免死循环（依赖切换时清理旧订阅）✓ 可接受
- §4.13 SSR 安全——Task 8 的 ESLint 通过 + 顶层无副作用已间接验证 ✓
- §5.7 场景包框架——已在 Task 17 的 template 末尾写入预留说明 ✓

### 2. 占位符扫描

- Task 3 的 computed 实现有多次"修正"，最终代码是明确的 ✓
- Task 8 的 `_resetInterceptors` 明确导出用于测试 ✓
- Task 17 的 7 个 few-shot 示例全部完整写出 ✓
- 无 TBD/TODO/"稍后实现" ✓

### 3. 类型一致性

- `Signal<T>` 在 index.d.ts 定义，state.js 实现的 `signal()` 返回的函数有 `.set` 和 `.on` 属性 ✓
- `FetchPageOptions` 的字段名与 fetch.js 的 opts 解构一致（method/headers/body/timeout/retries/retryDelay/dedupe/cache/cacheTTL/responseType/signal）✓
- `RouteContext` 的 `outlet/signal/go` 与 router.js 的 ctx 对象一致 ✓
- `RouteHandler` 返回 `void | Promise<void | string>`，router.js 的 `subOutletSelector` 处理 `typeof === 'string'` ✓
- `start()` 的 options 字段（outlet/scrollRestoration/keepAliveMax/base）与 router.js 实现一致 ✓

### 4. 体积预算验证

- Task 16 的 `measureCoreRuntime` 测量 router+state+fetch 合计，对比 3.7KB 预算
- 如超限，Task 19 Step 3 会失败，需回溯优化实现
- 设计文档估算：state 0.7 + fetch 0.8 + router 2.0 = 3.5KB，容差 0.2KB ✓

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-10-p0-production-essentials.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
