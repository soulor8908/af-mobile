// af-mobile UI —— createPage 页面运行时工厂
// 9 原语：state / computed / setup / effects / transform / actions / onError / transition / keepAlive
// 复用 state.js 的 signal/computed/effect/batch/createRoot，复用 router.js 的路由钩子
// SSR 安全：顶层无副作用，DOM/window 访问都在 effect 处理器内延迟到浏览器环境
// （definePage 全局单例 API 已于本版本移除，迁移见 docs/migration-guide.md）

import { signal, computed, effect, batch, createRoot } from './state.js';
import * as router from './router.js';
import { initBind } from './bind.js';

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
  hidden:  (fn, ctx) => subscribe(document, 'visibilitychange', () =>  document.hidden && fn({ hidden: true }), ctx),
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
 * createPage 页面运行时工厂（实例化，参数注入）
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
          get: () => sig(),
          set: (v) => sig.set(v),
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
      this._unbind = initBind(root, this);   // 保存断开函数，unmount 时清理 observer
    },
    unmount() {
      this._unbind?.();   // 断开 :bind 的 MutationObserver
      this._unbind = null;
      while (cleanups.length) { try { cleanups.pop()(); } catch { /* 清理失败忽略 */ } }
      dispose();
    },
  };
}
