// AIFlow UI —— definePage 页面运行时
// 8 原语：state / computed / effects / transform / actions / onError / transition / keepAlive
// 复用 state.js 的 signal/computed/effect/batch，复用 router.js 的路由钩子
// SSR 安全：顶层无副作用，DOM/window 访问都在 effect 处理器内延迟到浏览器环境

import { signal, computed, effect, batch, createRoot } from './state.js';
import * as router from './router.js';
import { initBind } from './bind.js';

// 模块级响应式容器（单例，跨页面共享，definePage 调用时填充字段）
const _signals = new Map();    // state key → signal
const _computeds = new Map();  // computed key → computed()
const _cleanups = [];          // effects 清理函数
let _transitionCfg = null;
let _keepAliveCfg = null;

// 暴露给 AI 的 state 对象：state.tab 读 / state.tab = x 写（自动追踪依赖）
export const state = {};
// computed 暴露对象（避免与 computed 函数重名）
export const derived = {};
export const actions = {};

function defineStateField(key, val) {
  if (_signals.has(key)) { _signals.get(key).set(val); return; }
  const sig = signal(val);
  _signals.set(key, sig);
  Object.defineProperty(state, key, {
    get: () => sig(),
    set: (v) => sig.set(v),
    enumerable: true,
    configurable: true,
  });
}

function defineComputedField(key, fn) {
  if (_computeds.has(key)) return;
  const c = computed(fn);
  _computeds.set(key, c);
  Object.defineProperty(derived, key, {
    get: () => c(),
    enumerable: true,
    configurable: true,
  });
}

// effects 白名单处理器：每个 key 对应一个 EventTarget 订阅
function subscribe(target, event, handler, ctx, extraCleanup) {
  if (typeof target?.addEventListener !== 'function') return;
  target.addEventListener(event, handler);
  ctx.cleanups.push(() => target.removeEventListener(event, handler));
  if (extraCleanup) ctx.cleanups.push(extraCleanup);
}

const EFFECT_HANDLERS = {
  mount: (fn, ctx) => { queueMicrotask(fn); },
  unmount: (fn, ctx) => { ctx.cleanups.push(fn); },
  route: (fn, ctx) => {
    // 复用 router.afterEach，路由变化时触发；返回取消函数注册到 ctx，unmount 时清理
    const cancel = router.afterEach((route, params, path) => fn(params));
    ctx.cleanups.push(cancel);
  },
  online:  (fn, ctx) => subscribe(window, 'online',  () => fn({ online: true }),  ctx),
  offline: (fn, ctx) => subscribe(window, 'offline', () => fn({ online: false }), ctx),
  visible: (fn, ctx) => subscribe(document, 'visibilitychange', () => !document.hidden && fn({ hidden: false }), ctx),
  hidden:  (fn, ctx) => subscribe(document, 'visibilitychange', () =>  document.hidden && fn({ hidden: true }),  ctx),
  storage: (fn, ctx) => {
    const isArr = Array.isArray(fn);
    const key = isArr ? fn[0] : null;
    const cb = isArr ? fn[1] : fn;
    subscribe(window, 'storage', (e) => (!key || e.key === key) && cb(e.newValue), ctx);
  },
  interval: (fn, ctx) => {
    if (!Array.isArray(fn)) return;
    const [ms, cb] = fn;
    const id = setInterval(cb, ms);
    ctx.cleanups.push(() => clearInterval(id));
  },
  resize: (fn, ctx) => {
    let raf = 0;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => fn({ width: innerWidth, height: innerHeight }));
    };
    subscribe(window, 'resize', handler, ctx, () => cancelAnimationFrame(raf));
  },
  themechange:  (fn, ctx) => subscribe(document.documentElement, 'themechange',  (e) => fn(e.detail), ctx),
  localechange: (fn, ctx) => subscribe(document.documentElement, 'localechange', (e) => fn(e.detail), ctx),
};

/**
 * createPage 页面运行时工厂（v3.0 新增，实例化，参数注入）
 * 9 原语：state / computed / setup / effects / transform / actions / onError / transition / keepAlive
 * 在 createRoot 内初始化，unmount() 级联清理所有 effect/computed/上游订阅
 * @param {Object} config - 页面配置
 * @returns {{ state:Object, derived:Object, actions:Object, refs:Object, transform:Function|null,
 *   transition:*, keepAlive:*, mount:Function, unmount:Function }}
 */
export function createPage(config = {}) {
  const refs = {};
  const state = {};
  const derived = {};
  const actions = {};
  const cleanups = [];

  const dispose = createRoot((rootDispose) => {
    // 1. state：字段转 signal，读写走响应式
    if (config.state) {
      for (const key in config.state) {
        const sig = signal(config.state[key]);
        Object.defineProperty(state, key, {
          get: () => sig(), set: (v) => sig.set(v),
          enumerable: true, configurable: true,
        });
      }
    }

    // 2. computed：参数注入 (s) => ...，自动依赖追踪
    if (config.computed) {
      for (const key in config.computed) {
        const c = computed(() => config.computed[key](state));
        Object.defineProperty(derived, key, {
          get: () => c(), enumerable: true, configurable: true,
        });
      }
    }

    // 3. setup：命令式初始化（createResource 等），在 state/computed 之后、effects 之前调用；返回值挂 refs
    if (config.setup) {
      Object.assign(refs, config.setup(state) || {});
    }

    // 4. effects：白名单 key 订阅，cleanup 注册到页面 cleanups
    if (config.effects) {
      const ctx = { cleanups };
      for (const key in config.effects) EFFECT_HANDLERS[key]?.(config.effects[key], ctx);
    }

    // 5. actions：参数注入 state，batch 合并多次变更
    if (config.actions) {
      for (const key in config.actions) {
        actions[key] = (...args) => batch(() => config.actions[key](state, ...args));
      }
    }

    // 6. onError：错误边界，捕获 window error + unhandledrejection
    if (typeof config.onError === 'function') {
      const ctx = { cleanups };
      subscribe(window, 'error', config.onError, ctx);
      subscribe(window, 'unhandledrejection', (e) => config.onError(e.reason), ctx);
    }

    return rootDispose;   // createRoot 返回回调返回值，此处返回 dispose 供 unmount 级联清理
  });

  return {
    state, derived, actions, refs,
    transform: typeof config.transform === 'function' ? config.transform : null,
    transition: config.transition || null,
    keepAlive: config.keepAlive || null,
    mount(root) {
      initBind(root, this);   // bind.js 接收 page 实例，绑定到实例的 state/derived
    },
    unmount() {
      while (cleanups.length) { try { cleanups.pop()(); } catch { /* 清理失败忽略 */ } }
      dispose();
    },
  };
}

/**
 * definePage 页面运行时入口
 * @param {Object} config - 8 原语配置
 * @param {Object} [config.state] - 状态声明，字段转 signal
 * @param {Object} [config.computed] - 派生计算，纯函数自动依赖追踪
 * @param {Object} [config.effects] - 副作用，白名单 key
 * @param {Function} [config.transform] - 数据变换纯函数
 * @param {Object} [config.actions] - 状态变更纯函数（仅允许赋值 state.*）
 * @param {Function} [config.onError] - 错误边界
 * @param {*} [config.transition] - 页面过渡配置
 * @param {*} [config.keepAlive] - 缓存策略
 */
export function definePage(config = {}) {
  const ctx = { cleanups: _cleanups };

  // 1. state：每个字段转 signal，挂到 state 对象
  if (config.state) {
    for (const key in config.state) defineStateField(key, config.state[key]);
  }

  // 2. computed：用 computed() 自动追踪依赖
  if (config.computed) {
    for (const key in config.computed) defineComputedField(key, config.computed[key]);
  }

  // 3. effects：白名单 key 对应预定义订阅
  if (config.effects) {
    for (const key in config.effects) {
      EFFECT_HANDLERS[key]?.(config.effects[key], ctx);
    }
  }

  // 4. transform：存为特殊 state 字段，供 af-data 调用
  if (typeof config.transform === 'function') {
    defineStateField('__transform__', config.transform);
  }

  // 5. actions：包装 batch，仅允许赋值 state.*（wc-pure-function 规则静态检测）
  if (config.actions) {
    for (const key in config.actions) {
      actions[key] = (...args) => batch(() => config.actions[key](...args));
    }
  }

  // 6. onError：错误边界，捕获 window error + unhandledrejection
  if (typeof config.onError === 'function') {
    subscribe(window, 'error', config.onError, ctx);
    subscribe(window, 'unhandledrejection', (e) => config.onError(e.reason), ctx);
  }

  // 7. transition / 8. keepAlive：路由级配置，存模块变量供 router 读取
  if (config.transition) _transitionCfg = config.transition;
  if (config.keepAlive)  _keepAliveCfg  = config.keepAlive;
}

/** 路由切换时调用：清理 effects 订阅，保留 state/computed（全局共享） */
export function clearPageState() {
  while (_cleanups.length) {
    try { _cleanups.pop()(); } catch { /* 清理函数失败忽略 */ }
  }
}

/** 获取当前 transition 配置（router 集成用） */
export function getTransition() { return _transitionCfg; }

/** 获取当前 keepAlive 配置（router 集成用） */
export function getKeepAlive() { return _keepAliveCfg; }

/** 测试用：重置全部状态（不导出到 index.js） */
export function _resetPage() {
  clearPageState();
  _signals.clear();
  _computeds.clear();
  for (const key of Object.keys(state)) delete state[key];
  for (const key of Object.keys(derived)) delete derived[key];
  for (const key of Object.keys(actions)) delete actions[key];
  _transitionCfg = null;
  _keepAliveCfg = null;
}
