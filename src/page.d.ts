// AIFlow UI —— aiflow-ui/page 子包类型声明
// definePage 页面运行时 + :bind 响应式绑定
// 与核心库解耦：消费端显式 import { definePage, initBind } from 'aiflow-ui/page'

/// <reference lib="dom" />

/** definePage 配置：8 原语 */
export interface DefinePageConfig {
  state?: Record<string, unknown>;
  computed?: Record<string, () => unknown>;
  effects?: {
    mount?: () => void;
    unmount?: () => void;
    route?: (params: Record<string, string>) => void;
    online?: (e: { online: boolean }) => void;
    offline?: (e: { online: boolean }) => void;
    visible?: (e: { hidden: boolean }) => void;
    hidden?: (e: { hidden: boolean }) => void;
    storage?: [string, (value: string | null) => void] | ((e: StorageEvent) => void);
    interval?: [number, () => void];
    resize?: (e: { width: number; height: number }) => void;
    themechange?: (theme: string) => void;
    localechange?: (locale: string) => void;
  };
  transform?: (raw: unknown) => unknown;
  actions?: Record<string, (...args: unknown[]) => void>;
  onError?: (err: unknown) => void;
  transition?: unknown;
  keepAlive?: unknown;
}

/** 页面运行时入口：声明 8 原语，自动建立响应式管道 */
export function definePage(config: DefinePageConfig): void;

/** 响应式 state 对象：state.key 读 / state.key = val 写 */
export const state: Record<string, unknown>;

/** 派生计算对象：derived.key 读取 computed 值 */
export const derived: Record<string, unknown>;

/** actions 对象：actions.fnName(args) 触发批量状态变更 */
export const actions: Record<string, (...args: unknown[]) => void>;

/** 路由切换时清理 effects 订阅（保留 state/computed 全局共享） */
export function clearPageState(): void;

/** 获取当前页面 transition 配置 */
export function getTransition(): unknown;

/** 获取当前页面 keepAlive 配置 */
export function getKeepAlive(): unknown;

/** 初始化 :bind 扫描（应用启动时调用一次），返回取消观察函数 */
export function initBind(root?: Document | Element): () => void;

/** 注册 af-data ref（供 :bind 引用 refName.field） */
export function registerDataRef(name: string, getData: () => unknown): void;

/** 取消注册 af-data ref */
export function unregisterDataRef(name: string): void;
