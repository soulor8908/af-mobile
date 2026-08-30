// af-mobile UI —— 测试环境预设（@af-mobile/ui/test）
// 一个 import 注入 jsdom 缺失的全部浏览器 API 桩，省掉每个项目手抄一遍：
//
//   // vite.config.js
//   test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.js'] }
//
//   // test/setup.js
//   import '@af-mobile/ui/test';   // ← 只这一行
//
// 覆盖：matchMedia / <dialog> showModal·close / popover API + ToggleEvent /
//       IntersectionObserver / ResizeObserver / requestAnimationFrame / 滚动 /
//       slot assignedElements / URL.createObjectURL / TouchEvent·Touch
//
// 副作用模块（package.json sideEffects 已登记，防打包器把 bare import 摇除），不导出任何东西。
// 桩都是「够用即可」的空实现：组件只依赖 API 存在与回调形状，不依赖真实布局计算。

// === matchMedia（theme.js 依赖） ===
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// === <dialog> showModal / close（af-dialog 依赖） ===
// 仅置 open 标志，不移动 DOM（真实浏览器走 top-layer，jsdom 无需移动节点）
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function (returnValue) {
    this.open = false;
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.dispatchEvent(new Event('close'));
  };
}

// === popover API（af-action-sheet / af-dropdown / af-picker 依赖） ===
if (!HTMLElement.prototype.showPopover) {
  HTMLElement.prototype.showPopover = function () {
    this.dataset.popoverOpen = 'true';
    this.dispatchEvent(new ToggleEvent({ newState: 'open', oldState: 'closed' }));
  };
}
if (!HTMLElement.prototype.hidePopover) {
  HTMLElement.prototype.hidePopover = function () {
    this.dataset.popoverOpen = 'false';
    this.dispatchEvent(new ToggleEvent({ newState: 'closed', oldState: 'open' }));
  };
}

// ToggleEvent polyfill（jsdom 26+ 自带，老版本补一个）
if (typeof ToggleEvent === 'undefined') {
  window.ToggleEvent = class ToggleEvent extends Event {
    constructor(init = {}) {
      super('toggle', { bubbles: false });
      this.newState = init.newState || 'open';
      this.oldState = init.oldState || 'closed';
    }
  };
}

// === IntersectionObserver（af-img 依赖） ===
// trigger() 供测试主动触发交叉回调（jsdom 无布局，不会自动触发）
class MockIntersectionObserver {
  constructor(callback) { this.callback = callback; this.observables = []; }
  observe(target) { this.observables.push(target); }
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  trigger(target, isIntersecting = true) {
    this.callback([{ target, isIntersecting, intersectionRatio: 1 }], this);
  }
}
window.IntersectionObserver = MockIntersectionObserver;
global.IntersectionObserver = MockIntersectionObserver;

// === ResizeObserver（af-swiper 依赖） ===
class MockResizeObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver;
global.ResizeObserver = MockResizeObserver;

// === requestAnimationFrame ===
// 用 queueMicrotask 实现，使 vi.runAllTicks() 能 flush rAF 回调（fake timers 不影响 microtask）
const _rafPending = new Map();
let _rafId = 0;
global.requestAnimationFrame = (cb) => {
  const id = ++_rafId;
  _rafPending.set(id, cb);
  queueMicrotask(() => {
    if (_rafPending.has(id)) {
      _rafPending.delete(id);
      cb(performance.now());
    }
  });
  return id;
};
global.cancelAnimationFrame = (id) => { _rafPending.delete(id); };

// === 滚动行为：jsdom 不模拟实际滚动，scrollTop 设值即生效（这正是测试需要的） ===
// jsdom 的 window.scrollTo 是 not-implemented 桩（调用会打 jsdomError 噪音），统一替换为静默 no-op
window.scrollTo = () => {};

// === HTMLSlotElement.assignedElements（jsdom 未实现 slot 分配，af-swiper 依赖） ===
// jsdom 不模拟 shadow slot 分配，返回 host children 作为 assigned 节点（够测试用）
if (!HTMLSlotElement.prototype.assignedElements) {
  HTMLSlotElement.prototype.assignedElements = function () {
    const slot = this;
    const host = slot.getRootNode()?.host;
    return host ? [...host.children] : [];
  };
}

// === URL.createObjectURL / revokeObjectURL（af-upload 依赖；jsdom 未实现） ===
// 仅返回伪 URL 字符串，够组件追踪句柄与 revoke 匹配；不模拟真实 Blob URL
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:mock://' + Math.random().toString(36).slice(2);
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => {};
}

// === TouchEvent / Touch（af-pull-refresh / af-swipe-cell 依赖；jsdom 未实现）===
// jsdom 不支持触摸 API，补一个最小实现：TouchEvent 继承 Event，touches 为构造参数中的数组
if (typeof global.Touch === 'undefined') {
  global.Touch = class Touch {
    constructor(init = {}) {
      Object.assign(this, init);
    }
  };
}
if (typeof global.TouchEvent === 'undefined') {
  global.TouchEvent = class TouchEvent extends Event {
    constructor(type, init = {}) {
      super(type, { bubbles: init.bubbles ?? false, cancelable: init.cancelable ?? false });
      this.touches = init.touches || [];
      this.targetTouches = init.targetTouches || [];
      this.changedTouches = init.changedTouches || [];
    }
  };
}
