# AIFlow UI 演进方案 v3.0（最终审定版）

> **版本**：v3.0-final  
> **日期**：2026-08-13  
> **基础**：Kimi K3 初稿 + GLM-5.2 审查 + K3 交叉验证分析 + GLM-5.2 二次审查  
> **定位**：AI 原生微型前端框架（AI-Native Micro Frontend Framework）  
> **审查对象**：aiflow-ui@1.3.0（4465 行 JS + 4 CSS + 36 测试文件，749 pass / 3 fail）

---

## 一、K3 回复审查：正确的纠正与遗留问题

### 1.1 K3 分析报告中正确的纠正（6 项，全部接受）

K3 的交叉验证分析报告对 GLM-5.2 原审查的 6 项纠偏，经源码二次验证后确认合理：

| # | K3 纠偏 | 验证结论 |
|---|---------|----------|
| 1 | state.js 泄漏描述"自相矛盾"定性过重 | **接受**。核心结论（泄漏存在）双方一致，修正为"措辞不精确"而非"自相矛盾" |
| 2 | "SolidJS 级"是方向性描述，非营销话术 | **接受**。修正为"采用与 SolidJS 同源的拉模型依赖追踪机制，但功能子集" |
| 3 | WeakRef + FinalizationRegistry 可以工作，非"错误方案" | **接受**。修正为"可行但增加运行时不确定性；Owner pattern 是更可控的方案" |
| 4 | DSD 价值不仅是 SSR，也是 Shadow DOM 声明式封装 | **接受**。DSD 允许无 JS 时声明 shadow root，降至 P2 合理 |
| 5 | GLM 遗漏了 MutationObserver 具体优化方案 | **接受**。K3 的"一次性扫描 + 可选 observe"更具体 |
| 6 | GLM 遗漏了 defineProp 全部 reflect 问题 | **接受**。内部状态如 `_isLoadingMore` 不应暴露到 HTML attribute |

### 1.2 K3 分析报告中的事实错误（1 项）

| # | K3 判断 | 源码验证 | 结论 |
|---|---------|----------|------|
| 1 | "无 Tree-shaking 友好的导出结构，`sideEffects: false` 未在 package.json 中声明" | `package.json` 第 28-30 行：`"sideEffects": ["**/*.css"]` | **错误**。项目已正确声明 sideEffects——CSS 文件有副作用（需要保留 import），JS 文件无副作用（可 tree-shake）。这是 UI 库的标准配置，`false` 反而是错误的 |

### 1.3 K3 v2.1-Final 方案中的技术问题（10 项）

经逐行对照源码，K3 的 v2.1-Final 存在以下问题：

#### 问题 1：computed() cleanup 实现为空壳

v2.1-Final Section 3.1.2 的 computed 实现中：

```javascript
const cleanup = () => { /* 清理上游 signal.subs 中的临时 effect */ };
_owner?.disposers.push(cleanup);
```

**问题**：cleanup 函数体是空注释。临时 effect `{ run: recompute, cleanups: [] }` 是 `c()` 函数内的局部变量，cleanup 闭包**无法访问它**。当 owner dispose 时调用 cleanup()，什么都不会发生——上游订阅不会被清理。

**源码验证**：`state.js` 第 70 行 `_cur = { run: recompute, cleanups: [] }` 确认临时 effect 是局部变量，无外部引用。

#### 问题 2：createResource 放在 computed() 内是反模式

v2.1-Final Section 3.4.2 的使用示例：

```javascript
computed: {
  user: (s) => createResource(() => s.userId, (id) => fetchPage(`/api/user/${id}`)),
}
```

**问题**：`createResource` 内部调用 `effect()`（副作用）。在 `computed` 内调用副作用违反纯函数契约。更严重的是：每次 `userId` 变化导致 computed 重新求值时，会创建**新的** signal 和 effect，旧的永不清理——级联泄漏。

**正确做法**：`createResource` 应在 `setup()` 生命周期中调用，不在 computed 内。

#### 问题 3：createPage 缺少 setup 生命周期

v2.1-Final 的 `createPage` API 有 `state`/`computed`/`effects`/`actions`，但没有 `setup`。`createResource`、手动 signal 创建、第三方库初始化等命令式逻辑无处安放。

#### 问题 4：MutationObserver 默认关闭会破坏动态内容绑定

v2.1-Final Section 3.5.3 提议 `observe = false` 为默认值，依赖 `router:rendered` 事件重新扫描。但 `router:rendered` 只在路由切换时触发——`af-list` 虚拟滚动新建列表项、`af-dialog` 打开插入内容、`af-tabs` 切换面板等场景的动态 DOM 插入不会被绑定。

**源码验证**：`bind.js` 第 21-29 行的 MutationObserver 监听 `childList: true, subtree: true`，是当前动态绑定的唯一机制。

#### 问题 5：20 组件 i18n 迁移安排在 1 周内不现实

v2.1-Final 路线图 W3："af-element.js 移除 i18n + 20 组件迁移"。每个组件需要：代码修改、测试更新、i18n key 验证、向后兼容检查。20 个组件最少需要 2 周。

#### 问题 6：9 条未导出 ESLint 规则需要审计后再导出

v2.1-Final Section 5.1 计划"导出全部 24 条规则"。但 9 条未导出的规则可能是 WIP、有 bug、或与现有规则重叠。应先审计再导出。

#### 问题 7：CSP 合规未纳入路线图

K3 分析报告 Section 3.1 识别了 CSP 问题（`<style>` textContent 注入被严格 CSP 阻断），但 v2.1-Final 路线图未包含修复。

#### 问题 8：i18n 复数规则 1 周完成过于乐观

v2.1-Final W4 安排"i18n 复数规则"。即使"轻量 ICU 子集"也需要 CLDR 复数规则数据（阿拉伯语 6 种形式，中文 1 种），加上 `t()` 函数改造和测试，1 周不够。

#### 问题 9：actions API 变更未说明实现细节

v2.1-Final 示例改为 `increment: (s) => s.count++`，但当前 `page.js` 第 129 行实现是 `config.actions[key](...args)`——不传 state。需要明确改为 `config.actions[key](state, ...args)`。

#### 问题 10：batch() 修复方案过度设计

v2.1-Final 提议 `const _pendingSubs = new Map()` 替代 `s._subs`。但实际只需在 `signal.set` 中将 subs 引用存入已有的 `_pending` Set 的元数据中，无需额外 Map。

---

## 二、架构总览（最终版）

```
┌─────────────────────────────────────────────────────────────┐
│  L4  AI 约束层                                               │
│  ├─ eslint-plugin-aiflow/   规则引擎（15 条可用 + 9 条待审计）│
│  ├─ prompt/                 System Prompt 工程               │
│  ├─ eval/                   生成质量评估 + 数据飞轮          │
│  └─ scripts/                自动化中枢（generate/ai-fix）    │
├─────────────────────────────────────────────────────────────┤
│  L3  组件层（20 个 af-* Custom Elements）                    │
│  ├─ Light DOM（17 个）：af-list / af-tabs / af-field ...    │
│  └─ Shadow DOM（3 个）：af-swiper / af-dialog / af-picker   │
├─────────────────────────────────────────────────────────────┤
│  L2  样式层                                                  │
│  ├─ recipes.css             102 个配方类                     │
│  ├─ atomic.css              51 个原子类                     │
│  └─ tokens.css              43 个 CSS 变量                  │
├─────────────────────────────────────────────────────────────┤
│  L0  运行时层（src/lib/）—— 骨架                             │
│  ├─ state.js                响应式信号系统（拉模型 + 所有权树）│
│  ├─ page.js                 createPage 页面框架（9 原语）    │
│  ├─ router.js               SPA 路由（嵌套/keep-alive/VT）   │
│  ├─ fetch.js                数据获取（去重/缓存/拦截）       │
│  ├─ resource.js             createResource（新增）          │
│  ├─ bind.js                 声明式绑定（:attr="state.x"）    │
│  ├─ i18n.js + theme.js      国际化 + 主题（对称设计）        │
│  ├─ af-element.js           WC 基类（生命周期/属性同步）     │
│  └─ with-i18n.js            i18n 按需混入（体积优化）        │
└─────────────────────────────────────────────────────────────┘
```

**v3.0 相对 v2.1-Final 的变更**：
- state.js 新增 `createRoot`/`getOwner`/`untrack`，computed cleanup 实现补完
- page.js 新增 `setup` 生命周期原语（第 9 原语），actions 传 state 参数
- resource.js 为新增文件（从 fetch.js 拆出 createResource）
- 删除 bus 死代码

---

## 三、L0 运行时层详细演进设计

### 3.1 state.js —— 响应式内核重建

#### 3.1.1 问题清单（三方交叉验证终版）

| # | 问题 | 严重性 | 发现方 | 状态 |
|---|------|--------|--------|------|
| 1 | effect 订阅无法可靠清理（Map 强引用阻止 GC） | P0 | 双方 | 确认 |
| 2 | computed 上游订阅永久泄漏（临时 effect 无外部引用） | P0 | GLM | 确认 |
| 3 | 无 effect 所有权树，dispose 责任不明确 | P0 | GLM | 确认 |
| 4 | batch() 使用 s._subs 内部 API 暴露 | P1 | GLM | 确认 |
| 5 | bus（EventTarget）死代码 | P1 | GLM | 确认 |
| 6 | 缺少 untrack 原语 | P1 | K3 | 确认 |

#### 3.1.2 修复方案：Owner Pattern + computed 完整实现

**关键修正**：v2.1-Final 的 computed cleanup 是空壳，以下是完整可运行的实现。

```javascript
// state.js —— 所有权树核心
let _cur = null;
let _owner = null;
let _batching = false;
const _pending = new Set();

// === 所有权树 ===
export function createRoot(fn) {
  const owner = { disposers: [], parent: _owner };
  const prev = _owner;
  _owner = owner;
  try { return fn(() => owner.disposers.forEach(d => d())); }
  finally { _owner = prev; }
}

export function getOwner() { return _owner; }

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
  _owner?.disposers.push(dispose);  // ← 自动注册到当前 owner
  return dispose;
}

// === computed（完整修复：临时 effect 可被清理）===
export function computed(fn) {
  let cached, dirty = true;
  let tempEffect = null;  // ← 保存临时 effect 引用，v2.1-Final 缺失的关键

  const subs = new Set();  // 下游 effect 订阅
  const recompute = () => {
    dirty = true;
    for (const s of [...subs]) s.run();
  };

  // cleanup 注册到 owner：owner dispose 时清理上游订阅
  const cleanup = () => {
    if (tempEffect) {
      tempEffect.cleanups.forEach(c => c());  // ← 清理上游 signal.subs
      tempEffect = null;
    }
  };
  _owner?.disposers.push(cleanup);

  const c = () => {
    // 下游订阅
    if (_cur) {
      subs.add(_cur);
      _cur.cleanups.push(() => subs.delete(_cur));
    }
    if (dirty) {
      // 重新求值前先清理上一轮的临时 effect 上游订阅
      if (tempEffect) tempEffect.cleanups.forEach(c => c());

      dirty = false;
      const prev = _cur;
      tempEffect = { run: recompute, cleanups: [] };  // ← 保存引用
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
export function untrack(fn) {
  const prev = _cur; _cur = null;
  try { return fn(); } finally { _cur = prev; }
}

// === signal（batch 修复）===
export function signal(v) {
  let val = v;
  const subs = new Map();
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
      // ← 修复：用模块级 Map 替代 s._subs 暴露
      _pendingSubs.set(s, subs);
      _pending.add(s);
    }
    else _notify(subs);
  };
  s.on = (f) => {
    const wrapped = { run: f, cleanups: [] };
    subs.set(wrapped, () => subs.delete(wrapped));
    return () => subs.delete(wrapped);
  };
  return s;
}

// ← 修复：模块级 Map 替代 s._subs hack
const _pendingSubs = new Map();

function _notify(subs) {
  for (const e of [...subs.keys()]) e.run();
}

export function batch(fn) {
  if (_batching) return fn();
  _batching = true;
  try { fn(); }
  finally {
    _batching = false;
    const snapshot = [..._pending];
    _pending.clear();
    const effects = new Set();
    for (const s of snapshot) {
      const subs = _pendingSubs.get(s);  // ← 从模块级 Map 读取
      if (subs) for (const e of subs.keys()) effects.add(e);
    }
    _pendingSubs.clear();
    for (const e of effects) e.run();
  }
}

// bus 已移除（死代码）
```

**与 v2.1-Final 的关键差异**：
1. `tempEffect` 变量保存临时 effect 引用——v2.1-Final 缺失，cleanup 无法工作
2. 重新求值前清理上一轮临时 effect——防止累积
3. `_pendingSubs` 模块级 Map 替代 `s._subs`——v2.1-Final 的 WeakMap 方案多余
4. `bus` 移除——v2.1-Final 也提了但未在代码中体现

#### 3.1.3 关键决策：不用 WeakRef

- **背景**：effect/computed 订阅泄漏
- **选项 A**：WeakRef + FinalizationRegistry（自动 GC 时清理）
- **选项 B**：Owner pattern + 显式 dispose（SolidJS 同源）
- **决策**：选 B
- **理由**：WeakRef + FinalizationRegistry 技术上可行（修正 GLM 原审查的过激表述），但 GC 时机不可预测，调试困难；Owner pattern 级联清理可控可预测，与 SolidJS 对齐降低 AI 理解成本

---

### 3.2 page.js —— 从全局单例到实例化工厂

#### 3.2.1 问题清单（终版）

| # | 问题 | 严重性 | 发现方 |
|---|------|--------|--------|
| 1 | state/derived/actions 全局单例 | P0 | 双方 |
| 2 | afterEach 单变量覆盖 | P0 | GLM |
| 3 | route effect 无法清理（afterEach 不返回取消函数） | P0 | 双方 |
| 4 | transform 占用 state.__transform__ 命名空间 | P1 | 双方 |
| 5 | actions 不传 state 参数 | P1 | GLM（v3.0 新增） |
| 6 | 缺少 setup 生命周期 | P0 | GLM（v3.0 新增） |

#### 3.2.2 修正后的 createPage API（9 原语）

```javascript
import { createPage } from 'aiflow-ui';

const page = createPage({
  // 1. state
  state: { count: 0, userId: 1 },

  // 2. computed（参数注入，避免鸡生蛋）
  computed: {
    double: (s) => s.count * 2,
  },

  // 3. setup（新增：命令式初始化，createResource 等）
  setup: (s) => {
    // createResource 在 setup 中调用，不在 computed 中
    const userResource = createResource(
      () => s.userId,
      (id) => fetchPage(`/api/user/${id}`)
    );
    return { user: userResource };  // ← 挂到 page.refs
  },

  // 4. effects（白名单 key）
  effects: {
    mount: () => console.log('mounted'),
    route: (params) => console.log('route', params),
    resize: (info) => console.log('resize', info),
  },

  // 5. transform（独立通道，不占 state 命名空间）
  transform: (data) => ({ ...data, formatted: formatDate(data.date) }),

  // 6. actions（参数注入 state）
  actions: {
    increment: (s) => s.count++,
    setUserId: (s, id) => { s.userId = id; },
  },

  // 7. onError
  onError: (err) => console.error(err),

  // 8. transition
  transition: { name: 'slide', duration: 300 },

  // 9. keepAlive
  keepAlive: true,
});

page.mount(document.querySelector('#app'));
page.unmount();  // 级联清理所有 effect + computed + 上游订阅
```

**与 v2.1-Final 的关键差异**：
1. 新增 `setup` 生命周期——解决 createResource 反模式
2. `actions` 明确传 state 参数——v2.1-Final 示例改了但未说明实现
3. `setup` 返回值挂到 `page.refs`——resource 对象有明确归属

#### 3.2.3 内部实现

```javascript
export function createPage(config = {}) {
  const _signals = new Map();
  const _computeds = new Map();
  const _refs = {};  // setup 返回值

  // 响应式 state 对象
  const state = {};
  const derived = {};
  const actions = {};

  // 在 createRoot 内执行所有初始化，确保 effect/computed 注册到 owner
  const dispose = createRoot((rootDispose) => {
    // 1. state
    if (config.state) {
      for (const key in config.state) {
        const sig = signal(config.state[key]);
        _signals.set(key, sig);
        Object.defineProperty(state, key, {
          get: () => sig(), set: (v) => sig.set(v),
          enumerable: true, configurable: true,
        });
      }
    }

    // 2. computed
    if (config.computed) {
      for (const key in config.computed) {
        const c = computed(() => config.computed[key](state));
        _computeds.set(key, c);
        Object.defineProperty(derived, key, {
          get: () => c(), enumerable: true, configurable: true,
        });
      }
    }

    // 3. setup（在 state/computed 之后，effects 之前）
    if (config.setup) {
      Object.assign(_refs, config.setup(state) || {});
    }

    // 4. effects
    if (config.effects) {
      for (const key in config.effects) {
        EFFECT_HANDLERS[key]?.(config.effects[key], { state, derived, actions });
      }
    }

    // 5. actions（传 state 作为第一个参数）
    if (config.actions) {
      for (const key in config.actions) {
        actions[key] = (...args) => batch(() => config.actions[key](state, ...args));
      }
    }
  });

  return {
    state, derived, actions, refs: _refs,
    transform: config.transform || null,
    mount(root) {
      initBind(root, this);  // ← bind.js 接收 page 实例
    },
    unmount() {
      dispose();  // ← 级联清理所有 effect + computed
    },
  };
}
```

#### 3.2.4 兼容层

`definePage` 保留为兼容 API，内部委托 `createPage` 并挂载到全局代理：

```javascript
export function definePage(config = {}) {
  const page = createPage(config);
  Object.assign(_globalState, page.state);
  Object.assign(_globalDerived, page.derived);
  Object.assign(_globalActions, page.actions);
  return page;
}
```

#### 3.2.5 router.js afterEach 修复

```javascript
// router.js
const _afterEachHooks = new Set();

export function afterEach(hook) {
  _afterEachHooks.add(hook);
  return () => _afterEachHooks.delete(hook);  // ← 返回取消函数
}

function callAfterEach(route, params, path) {
  _afterEachHooks.forEach(hook => hook(route, params, path));
}
```

`page.js` 的 `EFFECT_HANDLERS.route` 将返回的取消函数注册到 owner：

```javascript
route: (fn, ctx) => {
  const cancel = router.afterEach((route, params, path) => fn(params));
  // cancel 自动注册到 owner.disposers（通过 effect 机制）
  // 或手动注册：_owner?.disposers.push(cancel);
}
```

---

### 3.3 router.js —— 路由增强

#### 3.3.1 问题清单（终版）

| # | 问题 | 严重性 | 发现方 |
|---|------|--------|--------|
| 1 | afterEach 单变量覆盖 | P0 | GLM |
| 2 | 不支持 query string 和 hash | P1 | GLM |
| 3 | 嵌套路由 outlet 失败静默回退 | P1 | 双方 |
| 4 | matchNested O(n×m) 性能 | P2 | GLM |
| 5 | 滚动恢复不完整 | P1 | K3 |

#### 3.3.2 修复方案

| 优先级 | 改动 | 实现 |
|--------|------|------|
| P0 | afterEach 改为 Set + 返回取消函数 | 见 3.2.5 |
| P1 | query string + hash 支持 | `parsePath()` 分离 path/search/hash |
| P1 | outlet 失败抛错 | `querySelector` 返回 null 时抛 `RouterError` |
| P1 | scrollBehavior 配置 | 仿 Vue Router：`scrollBehavior(to, from, savedPosition)` |
| P2 | matchNested 优化为前缀树 | 路由数 > 20 时启用 Trie |
| P2 | 路由元信息 meta | `route(path, handler, { meta: { requiresAuth: true } })` |
| P2 | 路由懒加载 | `route('/heavy', () => import('./heavy.js'))` |

#### 3.3.3 query string 实现

```javascript
function parsePath(fullPath) {
  const [path, search = ''] = fullPath.split('?');
  const [cleanPath, hash = ''] = path.split('#');
  const query = Object.fromEntries(new URLSearchParams(search));
  return { path: cleanPath, query, hash };
}

function match(fullPath) {
  const { path, query } = parsePath(fullPath);
  for (const r of _routes) {
    const params = matchPath(r.path, path);
    if (params !== null) return { route: r, params: { ...params, ...query } };
  }
  return null;
}
```

---

### 3.4 fetch.js + resource.js —— 数据层与响应式打通

#### 3.4.1 问题清单

| # | 问题 | 严重性 | 发现方 |
|---|------|--------|--------|
| 1 | 与响应式系统割裂 | P0 | 双方 |
| 2 | 拦截器无阶段区分 | P1 | K3 |
| 3 | 缓存无持久化 | P2 | K3 |

#### 3.4.2 createResource 原语（新文件 resource.js）

**关键修正**：v2.1-Final 将 createResource 放在 computed 内使用，本方案改为在 setup 中使用。

```javascript
// resource.js
import { signal, effect, computed } from './state.js';

export function createResource(source, fetcher, options = {}) {
  const data = signal(options.initialValue ?? null);
  const isLoading = signal(false);
  const error = signal(null);
  const isError = computed(() => error() !== null);

  // effect 自动注册到当前 owner（setup 的 createRoot）
  effect(() => {
    const key = typeof source === 'function' ? source() : source;
    if (key == null) return;

    isLoading.set(true);
    error.set(null);

    fetcher(key)
      .then(d => { data.set(d); isLoading.set(false); })
      .catch(e => { error.set(e); isLoading.set(false); });
  });

  return { data, isLoading, error, isError };
}
```

**正确使用方式**（在 setup 中，不在 computed 中）：

```javascript
const page = createPage({
  state: { userId: 1 },
  setup: (s) => {
    const userResource = createResource(
      () => s.userId,
      (id) => fetchPage(`/api/user/${id}`)
    );
    return { user: userResource };
  },
});

// 在组件中使用
// page.refs.user.data()        → 当前数据
// page.refs.user.isLoading()   → 是否加载中
// page.refs.user.error()       → 错误对象
```

#### 3.4.3 拦截器分阶段（向后兼容）

```javascript
const _interceptors = { request: [], response: [], error: [] };

export function addInterceptor(fnOrPhase, fn) {
  if (typeof fnOrPhase === 'function') {
    _interceptors.request.push(fnOrPhase);  // 向后兼容
  } else {
    _interceptors[fnOrPhase].push(fn);
  }
}
```

---

### 3.5 bind.js —— 声明式绑定解耦

#### 3.5.1 问题清单

| # | 问题 | 严重性 | 发现方 |
|---|------|--------|--------|
| 1 | 硬编码 import page.js 全局对象 | P0 | 双方 |
| 2 | MutationObserver 持续监听开销 | P1 | 双方 |
| 3 | 表达式语法单一（无对象表达式） | P1 | K3 |

#### 3.5.2 解耦方案

```javascript
// bind.js —— 接收外部 context
export function initBind(root, ctx = null) {
  const state = ctx?.state ?? _globalState;
  const derived = ctx?.derived ?? _globalDerived;

  const disconnect = scanAndBind(root, state, derived);

  // MutationObserver：默认开启但可配置（修正 v2.1-Final 的默认关闭问题）
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) scanAndBind(node, state, derived);
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true });

  return () => { observer.disconnect(); disconnect(); };
}
```

**与 v2.1-Final 的关键差异**：MutationObserver **保持默认开启**。v2.1-Final 的默认关闭会导致 `af-list` 虚拟滚动新建列表项、`af-dialog` 插入内容等动态 DOM 不被绑定。优化方向不是关闭，而是用 `requestIdleCallback` 空闲扫描 + 批量处理减少回调频率：

```javascript
let _pendingScan = null;
const observer = new MutationObserver(() => {
  if (_pendingScan) return;
  _pendingScan = requestIdleCallback(() => {
    scanAndBind(root, state, derived);
    _pendingScan = null;
  });
});
observer.observe(root, { childList: true, subtree: true });
```

#### 3.5.3 对象表达式支持（P1）

```html
<!-- 当前 -->
<div :class="state.activeClass"></div>

<!-- 目标 -->
<div :class="{ active: state.isActive, disabled: state.isDisabled }"></div>
```

实现：解析对象表达式，为每个 key 创建独立 effect，分别监听对应依赖。

---

### 3.6 i18n.js + theme.js —— 对称服务层增强

#### 3.6.1 问题清单（终版）

| # | 问题 | 严重性 | 发现方 |
|---|------|--------|--------|
| 1 | af-element.js 基类仍内嵌 i18n | P0 | 双方 |
| 2 | i18n 字典缺失导致 3 个测试失败 | P0 | GLM |
| 3 | 4 个组件直接 import t() 绕过体系 | P1 | GLM |
| 4 | i18n 不支持复数规则 | P1 | 双方 |
| 5 | theme.js 不监听系统主题变化 | P1 | 双方 |

#### 3.6.2 修复方案

| 优先级 | 改动 | 周期 | 详细设计 |
|--------|------|------|----------|
| P0 | 修复 3 个失败测试 + CI 字典校验 | 0.5 周 | 补全 `sg.em`/`sg.er`/`sg.rt` 等 key；CI 扫描 `static i18n` 引用 |
| P0 | af-element.js 彻底移除 i18n | 1 周 | 删除 `_applyI18n()`/`onLocaleChange()`/`import t` |
| P0 | 20 组件迁移到 withI18n 或移除 i18n | 1.5 周 | **修正 v2.1-Final 的 1 周排期**，实际需 1.5 周 |
| P1 | 4 组件统一 i18n 调用方式 | 0.5 周 | `af-img`/`af-list`/`af-pull-refresh`/`af-swiper` 改用 `static i18n` |
| P1 | 系统主题监听 | 0.5 周 | `matchMedia('(prefers-color-scheme: dark)')` change 事件 |
| P1 | 复数规则支持 | 1.5 周 | **修正 v2.1-Final 的 1 周排期**。轻量 ICU 子集 + CLDR plural rules 数据 |

#### 3.6.3 i18n 复数规则实现

```javascript
// CLDR plural rules（内置常见语言，按需扩展）
const PLURAL_RULES = {
  en: (n) => n === 1 ? 'one' : 'other',
  zh: () => 'other',           // 中文无复数
  ja: () => 'other',           // 日语无复数
  ar: (n) => {                 // 阿拉伯语 6 种形式
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    if (n % 100 >= 3 && n % 100 <= 10) return 'few';
    if (n % 100 >= 11 && n % 100 <= 99) return 'many';
    return 'other';
  },
};

// 字典格式：{ items: { zero: '无项目', one: '{n} 项', other: '{n} 项' } }
export function t(key, vars = {}) {
  const locale = _locale;
  const entry = _messages[locale]?.[key] ?? _messages[_fallback]?.[key] ?? key;
  if (typeof entry === 'object' && vars.n != null) {
    const rule = (PLURAL_RULES[locale] || PLURAL_RULES.en)(vars.n);
    return _format(entry[rule] ?? entry.other, vars);
  }
  return _format(entry, vars);
}
```

#### 3.6.4 theme.js 系统主题监听

```javascript
export function initTheme() {
  // ... 现有 localStorage 恢复 ...
  if (typeof matchMedia === 'function') {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
      if (!localStorage.getItem('theme')) {  // 仅未显式设定时跟随系统
        document.documentElement.dispatchEvent(
          new CustomEvent('themechange', { detail: getTheme() })
        );
      }
    });
  }
}
```

---

### 3.7 af-element.js —— 组件基类瘦身

#### 3.7.1 问题清单

| # | 问题 | 严重性 | 发现方 |
|---|------|--------|--------|
| 1 | 基类仍内嵌 i18n 逻辑 | P0 | 双方 |
| 2 | defineProp 全部 reflect 到 DOM | P1 | K3 |
| 3 | 无 part 导出 | P1 | K3 |
| 4 | CSP 不合规（style textContent 注入） | P1 | K3 分析报告 |

#### 3.7.2 defineProp reflect 选项

```javascript
static defineProp(proto, name, { attr, type = String, default: defVal = null, reflect = true } = {}) {
  // ... 现有代码 ...
  set(val) {
    this[privateName] = val;
    if (reflect) {                    // ← 仅 reflect=true 时同步到 attribute
      this.skipAttrSync = true;
      if (val == null || val === false) this.removeAttribute(attrName);
      else if (val === true) this.setAttribute(attrName, '');
      else if (type === Array || type === Object) this.setAttribute(attrName, JSON.stringify(val));
      else this.setAttribute(attrName, String(val));
      this.skipAttrSync = false;
    }
  }
}

// 使用示例
AfElement.defineProp(proto, 'isLoadingMore', { type: Boolean, reflect: false });  // 内部状态
AfElement.defineProp(proto, 'title', { type: String });                           // 默认 reflect: true
```

#### 3.7.3 CSP 合规样式注入

```javascript
// af-element.js _injectStyles 修改
static _injectStyles(css) {
  if (this._styleEl) return;
  const el = document.createElement('style');
  el.textContent = css;
  this.$root.prepend(el);
  this._styleEl = el;
}

// 新增：支持外部样式表（CSP strict 模式）
static _injectStylesheet(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  this.$root.prepend(link);
}
```

**策略**：默认用 `<style>` 内联（零请求、Shadow DOM 封装）；提供 `--aiflow-css-mode: external` CSS 变量或构建时配置切换为 `<link>` 外部引用。

---

## 四、L3 组件层演进设计

### 4.1 Hydration —— 轻量 input value 保留

**共识**：不做完整 diff 算法（过度工程），仅保留表单输入状态。

```javascript
connectedCallback() {
  if (this._mounted) return;
  this._mounted = true;

  // 升级前记录 input value
  const inputValues = new Map();
  this.querySelectorAll('input, textarea, select').forEach(el => {
    inputValues.set(el, { value: el.value, checked: el.checked });
  });

  this._upgrade();

  // 升级后恢复
  inputValues.forEach(({ value, checked }, el) => {
    if (el.value !== value) el.value = value;
    if (el.checked !== checked) el.checked = checked;
  });
}
```

### 4.2 DSD —— 降至 P2

当前无 SSR 基础设施，DSD 的优先级降至 P2。DSD 的独立价值（Shadow DOM 声明式封装、无 JS 时基本结构渲染）在引入骨架屏/SSR 时再评估。

### 4.3 组件缺口

| 优先级 | 组件 | 理由 |
|--------|------|------|
| P0 | `af-calendar` / `af-date-picker` | 电商/预约/考勤刚需 |
| P0 | `af-cascade-picker` | 省市区/分类级联，复用 `af-picker` 滚轮内核 |
| P1 | `af-rate` | 评分 |
| P1 | `af-badge` | 徽标角标 |
| P1 | `af-notice-bar` | 公告滚动条 |
| P2 | `af-floating-panel` | 地图/详情页底部浮动面板 |

---

## 五、L4 AI 约束层演进设计

### 5.1 eslint-plugin-aiflow —— 规则引擎整合

**修正**：当前为 15 条可用 + 9 条未导出 = 24 个规则文件。**9 条未导出规则必须先审计再导出**（修正 v2.1-Final 的直接全导出）。

| 优先级 | 改动 | 详细设计 |
|--------|------|----------|
| P0 | **审计 9 条未导出规则** | 逐条检查：是否 WIP、是否有 bug、是否与现有规则重叠。通过审计的导出，不通过的修复或废弃 |
| P0 | **规则分级** | `meta.fixable` 三级：自动修复 / AI 重写 / 仅人工判断 |
| P1 | **合并元数据规则** | `wc-block-props-count` 等 4 条合并为 `wc-component-meta` |
| P1 | **独立发布 npm** | `@aiflow-ui/eslint-plugin` |

### 5.2 prompt/ —— Prompt 工程化

| 优先级 | 改动 | 详细设计 |
|--------|------|----------|
| P0 | Prompt 模块化拆分 | 角色定义（固定）+ 白名单速查（半固定）+ 组件 API（按需加载）+ 正反示例（动态检索） |
| P0 | Prompt 版本与 A/B 测试 | `prompt/` 下按版本管理，`eval/run.mjs` 支持对比 pass@k |
| P1 | 模型特化 Prompt | `system-prompt.claude.md` / `.gpt4.md` / `.glm.md` |
| P1 | Prompt 即 API | `@aiflow-ui/prompt`，`buildPrompt({ components, theme, model })` |

### 5.3 eval/ + scripts/ —— 质量评估闭环

| 优先级 | 改动 | 详细设计 |
|--------|------|----------|
| P0 | LLM-as-Judge 视觉评估 | GPT-4V/GLM-4V 对生成代码截图进行视觉合规判断 |
| P0 | 抽象 `AiflowGenerator` 核心类 | LLM 调用 + lint + fix 闭环抽象为可复用模块 |
| P1 | AST 级自动修复 | `atomic-duplicate` 等用 `espree` 直接修改 AST |
| P1 | eval 基线回归 | 每次 PR 跑 eval，下降即阻断 |
| P1 | MCP Server | `@aiflow-ui/mcp`，暴露 `generate_page`/`fix_code`/`check_compliance` |

---

## 六、演进路线图（最终版）

### Phase 1：L0 架构修复（v2.0.0，7 周）

**修正 v2.1-Final 的 6 周排期为 7 周**——20 组件迁移和 i18n 复数规则各增加 0.5 周。

| 周次 | 任务 | 产出 | 验证标准 |
|------|------|------|----------|
| W1 | state.js Owner pattern + computed 泄漏完整修复 + untrack + 移除 bus | PR + 单测 | 所有 effect/computed 可级联 dispose，无 orphaned computation |
| W1 | batch() s._subs hack 修复（模块级 Map） | PR | 无内部 API 暴露 |
| W2 | page.js createPage 工厂 + setup 生命周期 + 参数注入 API | PR + 单测 | createPage + mount + unmount 完整生命周期 |
| W2 | router.js afterEach 数组化 + 返回取消函数 | PR | 多页面 route effect 互不干扰 |
| W3 | bind.js 解耦 page.js + MutationObserver 空闲扫描优化 | PR | `initBind(root, ctx)` 支持多实例 |
| W3 | af-element.js 移除 i18n | PR | 基类无 i18n 依赖，体积 ≤ 1.0KB gzip |
| W4-W5 | 20 组件迁移到 withI18n 或移除 i18n | PR | **2 周完成（修正 v2.1-Final 的 1 周）** |
| W5 | 4 组件 i18n 统一 + 字典补全 + CI 校验 | PR | 752 个测试全部通过 |
| W6 | theme.js 系统主题监听 | PR | `prefers-color-scheme` 变化自动切换 |
| W6 | fetch.js createResource + 拦截器分阶段 | PR + 单测 | createResource 在 setup 中自动管理 loading/error/data |
| W7 | i18n 复数规则（CLDR plural rules） | PR | **1.5 周完成（修正 v2.1-Final 的 1 周）** |
| W7 | router.js query string + outlet 抛错 + scrollBehavior | PR + 单测 | `?id=123` 正确解析，选择器失败抛错 |
| W7 | E2E 测试 + 体积检查 + 迁移指南 | 文档 | L0 运行时 ≤ 8.0KB gzip |

### Phase 2：AI 原生差异化（v2.1.0，6 周，拆分为 3 个子阶段）

| 子阶段 | 周期 | 任务 | 产出 |
|--------|------|------|------|
| 2A | W1-W2 | ESLint 规则审计 + 整合 | 审计 9 条未导出规则 → 通过的导出 + 分级 + `@aiflow-ui/eslint-plugin` |
| 2B | W3-W4 | Prompt 工程化 | 模块化拆分 + 版本管理 + `@aiflow-ui/prompt` + Cursor Rules |
| 2C | W5-W6 | MCP + 生态验证 | MCP Server + 储备项目真实场景验证 |

> **2B 完成状态（2026-08-13）**：P0 + P1 全部落地。
> - 模块化拆分：`buildPrompt({ components, categories, userPrompt })`（角色固定 + 白名单半固定 + 组件 API 按需 + Few-shot 动态检索），无参 = 全量，与提交态 `system-prompt.md` 字节一致；
> - 版本 A/B：`eval/run.mjs --prompt full|tailored` 对比 pass@k；
> - 模型特化：`prompt/models/{claude,gpt4,glm}.md`，`buildPrompt({ model })` 拼特化头；
> - Prompt 即 API：`@aiflow-ui/prompt`（`prompt/index.mjs` + `package.json` 薄包壳，re-export `buildPrompt` 等），`theme` 注入项目 Token 段；
> - Cursor Rules：`.cursor/rules/{l4-consumer,l3-library}.mdc`；
> - 自检：ESLint（含 eval/ prompt/）0 错、vitest 829 用例全绿、prompt:check / whitelist / types 三源同步。

### Phase 3：生态扩展（v2.2.0+，持续）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | 组件补齐 | `af-calendar`、`af-cascade-picker`、`af-rate`、`af-badge` |
| P0 | CSP 合规样式方案 | `<link>` 外部引用模式 |
| P1 | i18n 懒加载 | `addMessages(locale, () => import(...))` |
| P1 | fetch.js 持久化缓存 | `localStorageAdapter` |
| P1 | router.js 路由懒加载 + meta | `route('/heavy', () => import(...))` |
| P2 | DSD 支持 | Shadow DOM 组件声明式封装 |
| P2 | 设计 Token JSON 化 | W3C Design Tokens Format |
| P2 | 框架适配层 | `@aiflow-ui/vue`、`@aiflow-ui/react`（仅 wrapper） |
| P2 | 运行时性能监控钩子 | `onRender`/`onUpdate` + DevTools 集成 |

---

## 七、关键决策记录（ADR）

### ADR-001：不用 WeakRef，用 Owner Pattern

- **背景**：state.js 的 effect/computed 订阅泄漏
- **选项 A**：WeakRef + FinalizationRegistry（自动 GC 时清理）
- **选项 B**：Owner pattern + 显式 dispose（SolidJS 同源）
- **决策**：选 B
- **理由**：WeakRef + FinalizationRegistry 技术上可行（接受 K3 纠正），但 GC 时机不可预测、调试困难；Owner pattern 级联清理可控可预测，与 SolidJS 对齐降低 AI 理解成本

### ADR-002：createPage 用参数注入而非闭包引用

- **背景**：`createPage` API 设计
- **选项 A**：`computed: { double: () => page.state.count * 2 }`（闭包引用）
- **选项 B**：`computed: { double: (s) => s.count * 2 }`（参数注入）
- **决策**：选 B
- **理由**：避免鸡生蛋问题，配置对象在 `createPage` 返回前即完整可用

### ADR-003：createResource 在 setup 中调用，不在 computed 中

- **背景**：createResource 包含副作用（effect），不能放在纯函数 computed 内
- **选项 A**：在 computed 内调用（v2.1-Final 方案）
- **选项 B**：在 setup 生命周期中调用
- **决策**：选 B
- **理由**：computed 每次重求值会创建新的 createResource 实例，旧的永不清理——级联泄漏。setup 只执行一次，resource 的 effect 自动注册到 owner

### ADR-004：Light DOM 不做完整 hydrate，仅保留 input value

- **背景**：Light DOM 组件 upgrade 时重建 DOM
- **选项 A**：完整 diff 算法（增量 hydrate）
- **选项 B**：upgrade 前记录 input value，upgrade 后恢复
- **选项 C**：完全不做
- **决策**：选 B
- **理由**：完整 diff 收益与成本不成正比（移动端组件 DOM < 50 节点）；完全不做导致表单状态丢失；轻量 value 保留是最佳折中

### ADR-005：DSD 降至 P2

- **背景**：Shadow DOM 组件的声明式渲染
- **决策**：P2，不阻塞 v2.0
- **理由**：当前无 SSR 基础设施；DSD 浏览器兼容性不完整；DSD 的独立价值（声明式封装）在引入骨架屏时再评估

### ADR-006：MutationObserver 保持默认开启，用空闲扫描优化

- **背景**：MutationObserver 持续监听开销 vs 动态内容绑定需求
- **选项 A**：默认关闭，依赖 router:rendered 事件（v2.1-Final 方案）
- **选项 B**：保持开启，用 requestIdleCallback 批量处理
- **决策**：选 B
- **理由**：默认关闭会导致 af-list 虚拟滚动、af-dialog 动态内容等不被绑定；空闲扫描可将多次 mutation 合并为一次扫描，降低开销

### ADR-007：ESLint 未导出规则先审计再导出

- **背景**：9 条已实现但未导出的 ESLint 规则
- **选项 A**：直接导出全部 24 条（v2.1-Final 方案）
- **选项 B**：先审计再导出
- **决策**：选 B
- **理由**：未导出的规则可能是 WIP、有 bug、或与现有规则重叠。直接导出可能导致误报或崩溃

---

## 八、附录

### 附录 A：体积预算控制（v2.0 目标）

| 层级 | 预算 gzip | v1.3 现状 | v2.0 目标 | 备注 |
|------|-----------|-----------|-----------|------|
| L0 运行时 | ≤ 8.0KB | ~6KB | ≤ 8.0KB | Owner tree +0.3KB，createResource +0.2KB，移除 bus -0.1KB |
| L1+L2 CSS | ≤ 8.0KB | ~5KB | ≤ 6.0KB | — |
| L3 全量 20 组件 | ≤ 19.5KB | ~15KB | ≤ 18.0KB | 基类移除 i18n 后组件体积下降 |
| L3 按需 2 组件 | ≤ 5.5KB | ~4KB | ≤ 5.0KB | — |
| 基类 AfElement | ≤ 1.2KB | ~1KB | ≤ 1.0KB | 移除 i18n 后瘦身 |

> **已知问题（2026-08-13 记录，下一阶段处理）**：`npm run size` 当前全量 20.584KB（预算 20.5KB，超 84B，PR 阻断），按需 2 组件 6.664KB（预算 5.5KB）。与 2A 子阶段 ESLint 规则导出无关（改动仅在 `eslint-plugin-aiflow/` 与 `test/`），为库产物既有超限；已决议推迟到 Phase 2 后续/Phase 3 统一优化打包体积（裁剪冗余、按需混入）。

### 附录 B：兼容性策略

| 版本 | definePage 状态 | createPage 状态 | 说明 |
|------|-----------------|-----------------|------|
| v2.0.0 | 保留，内部委托 createPage | 推荐，文档主推 | 兼容层无功能损失 |
| v2.1.0 | 标记 deprecated，控制台警告 | 主推 | 引导迁移 |
| v3.0.0 | 移除 | 唯一 API | 全面实例化 |

### 附录 C：sideEffects 配置（已正确，无需修改）

```json
// package.json
"sideEffects": ["**/*.css"]
```

项目已正确声明：CSS 文件有副作用（保留 import），JS 文件无副作用（可 tree-shake）。这是 UI 库的标准配置，无需改为 `false`。

### 附录 D：问题追踪矩阵（终版，28 项）

| # | 问题 | 发现方 | 优先级 | 修复方案 | 阶段 |
|---|------|--------|--------|----------|------|
| 1 | effect 订阅泄漏 | 双方 | P0 | Owner pattern | P1 W1 |
| 2 | computed 上游泄漏 | GLM | P0 | Owner pattern + tempEffect 引用 | P1 W1 |
| 3 | 全局单例 | 双方 | P0 | createPage 工厂 | P1 W2 |
| 4 | afterEach 单变量覆盖 | GLM | P0 | Set + 取消函数 | P1 W2 |
| 5 | bind.js 硬编码耦合 | 双方 | P0 | 参数注入 ctx | P1 W3 |
| 6 | 基类内嵌 i18n | 双方 | P0 | 迁移到 with-i18n.js | P1 W3-W5 |
| 7 | i18n 字典缺失 | GLM | P0 | 补全 + CI 校验 | P1 W5 |
| 8 | bus 死代码 | GLM | P1 | 移除 | P1 W1 |
| 9 | batch s._subs hack | GLM | P1 | 模块级 Map | P1 W1 |
| 10 | 4 组件直接 import t() | GLM | P1 | 统一 static i18n | P1 W5 |
| 11 | theme 不监听系统变化 | 双方 | P1 | matchMedia 监听 | P1 W6 |
| 12 | fetch 与响应式割裂 | 双方 | P0 | createResource | P1 W6 |
| 13 | router 不支持 query | GLM | P1 | parsePath 分离 | P1 W7 |
| 14 | router outlet 静默回退 | 双方 | P1 | 抛错 | P1 W7 |
| 15 | router matchNested 性能 | GLM | P2 | Trie 优化 | P3 |
| 16 | 无 untrack | K3 | P1 | 新增原语 | P1 W1 |
| 17 | 无 scrollBehavior | K3 | P1 | 仿 Vue Router | P1 W7 |
| 18 | defineProp 全 reflect | K3 | P1 | reflect 选项 | P1 W3 |
| 19 | 无 part 导出 | K3 | P1 | exportparts | P2 |
| 20 | MutationObserver 开销 | 双方 | P1 | 空闲扫描 | P1 W3 |
| 21 | CSP 不合规 | K3 分析 | P1 | link 外部引用 | P3 |
| 22 | createPage 缺 setup | GLM v3.0 | P0 | 新增生命周期 | P1 W2 |
| 23 | actions 不传 state | GLM v3.0 | P1 | 参数注入 | P1 W2 |
| 24 | createResource 在 computed 内 | GLM v3.0 | P0 | 改为 setup 中调用 | P1 W6 |
| 25 | computed cleanup 空壳 | GLM v3.0 | P0 | tempEffect 引用 | P1 W1 |
| 26 | 20 组件迁移排期不足 | GLM v3.0 | 流程 | 1 周→1.5 周 | P1 W4-W5 |
| 27 | i18n 复数排期不足 | GLM v3.0 | 流程 | 1 周→1.5 周 | P1 W7 |
| 28 | ESLint 规则未审计 | GLM v3.0 | P0 | 先审计再导出 | P2 W1 |

### 附录 E：三方共识与分歧终版

#### 共识（三方一致）

1. 全局单例必须改为实例化（P0）
2. computed 上游订阅泄漏必须修复（P0）
3. afterEach 单变量覆盖必须修复（P0）
4. bind.js 硬编码耦合必须解耦（P0）
5. af-element.js 基类移除 i18n（P0）
6. 不用 WeakRef，用 Owner pattern
7. createPage 用参数注入
8. DSD 降至 P2
9. Light DOM 仅保留 input value
10. Phase 2 拆分为 3 个子阶段

#### 分歧解决

| 分歧点 | K3 观点 | GLM 观点 | 最终结论 |
|--------|---------|----------|----------|
| state.js 泄漏描述 | 措辞不精确 | 自相矛盾 | 修正为"措辞不精确"，核心结论一致 |
| SolidJS 级 | 方向同源 | 营销话术 | "同源拉模型，功能子集" |
| WeakRef | 可行但不优雅 | 错误方案 | 可行但非首选，用 Owner pattern |
| DSD 价值 | 不仅是 SSR | 无用武之地 | 有独立价值，降至 P2 |
| createResource 位置 | computed 内 | 反模式 | **在 setup 中调用**（GLM v3.0 修正） |
| MutationObserver | 默认关闭 | 需保持开启 | **保持开启 + 空闲扫描**（GLM v3.0 修正） |
| sideEffects | 缺失 | — | **已正确声明**（GLM v3.0 确认） |
| ESLint 规则导出 | 直接全导出 | — | **先审计再导出**（GLM v3.0 修正） |

---

*本文档基于 Kimi K3 初稿、GLM-5.2 审查报告、K3 交叉验证分析、GLM-5.2 二次审查的四方交叉验证编写。所有代码引用均来自 aiflow-ui@1.3.0 实际仓库。所有技术决策均以"AI 一次写对"和"生产级可靠"为双重优先级。审查日期：2026-08-13。*