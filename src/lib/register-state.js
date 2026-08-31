// af-mobile UI —— 组件注册状态中心（零依赖：register() 与 router 的协作点）
//
// 背景（P0 事故 · 静默空白）：register() 走动态 import() 按需分包。Vite/Rollup 生产分包会把
// 「入口与组件 chunk 共用的模块」（典型是 lib/html.js —— 入口经 index.js 再导出 escapeHtml，
// 组件又从 lib/af-element.js 引入同一个模块）划入**入口 chunk**，于是组件 chunk 反向静态
// import 入口 chunk。此时若入口写顶层 `await register(...)`（TLA）：入口求值被自己 await 的
// chunk 卡住，chunk 又等着入口求值完成 —— entry ↔ chunk 互等，chunk 永不 resolve、
// 组件永不注册、**应用全白且控制台零报错**（dev 原生 ESM 不复现，只在生产构建暴露）。
//
// 结构解：入口不再需要 TLA。register() 把进行中的 promise 登记在此，router 渲染前统一
// whenReady() 等待 —— 入口模块正常求值完毕，动态 chunk 再静态 import 入口时入口已求值完成，
// 环自然解开。详见 docs/incidents.md「register 生产分包死锁」。
const _p = new Set();

/**
 * 登记一次进行中的组件注册（settle 后自动移除）
 * @template T
 * @param {Promise<T>} p
 * @returns {Promise<T>}
 */
export function trackRegistration(p) {
  _p.add(p);
  // 双向 then：① settle 即从待办集合移除；② 把 promise 标记为已处理，
  // 避免「调用方不 await register()」时产生 unhandledrejection 噪音
  const d = () => _p.delete(p);
  p.then(d, d);
  return p;
}

/** 是否有待办注册（router 渲染前快速短路：无待办时零额外 await，保持原有渲染时序） */
export function hasPending() {
  return _p.size > 0;
}

/**
 * 等待所有已发起的组件注册完成（router 首次渲染前调用）
 * 无待办时立即 resolve；等待期间新发起的注册会在下一轮继续等待。
 * @returns {Promise<void>}
 */
export async function whenReady() {
  while (_p.size) await Promise.all([..._p]);
}

/** 测试用：清空待办集合（不影响已发出的 promise） */
export function _resetRegistrations() {
  _p.clear();
}
