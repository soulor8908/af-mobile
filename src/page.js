// AIFlow UI —— aiflow-ui/page 子包入口
// definePage 页面运行时 + :bind 响应式绑定
// 与核心库解耦：消费端显式 import { definePage, initBind } from 'aiflow-ui/page'
// 不引此子包时，page.js + bind.js 不计入核心运行时预算
//
// 依赖：state.js / router.js（核心运行时，已包含在主包）
// 被依赖：af-data 通过 data-ref.js 注册表与 :bind 通信（无需 import 此子包）

export {
  definePage,
  state,
  derived,
  actions,
  clearPageState,
  getTransition,
  getKeepAlive,
  _resetPage,
} from './lib/page.js';

export {
  initBind,
  registerDataRef,
  unregisterDataRef,
  _resetBind,
} from './lib/bind.js';
