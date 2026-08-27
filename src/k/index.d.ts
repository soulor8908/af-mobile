// @af-mobile/ui/k —— k 渲染层类型声明
// html`` 返回 DocumentFragment；插值支持值 / getter（signal）/ DOM 节点 / 数组

/// <reference lib="dom" />

export type Bindable = string | number | boolean | null | undefined | Node | (() => unknown) | Bindable[];

/** 模板标签：返回带响应式绑定的 DocumentFragment */
export function html(strings: TemplateStringsArray, ...vals: Bindable[]): DocumentFragment;

/** 条件渲染：when() 真值渲染 kids() */
export function Show(opts: { when: () => unknown; kids: () => DocumentFragment }): DocumentFragment;

/** keyed 列表渲染：each() 为数组，key 为唯一字段名（省略则以项为键），kids(item) 返回条目模板 */
export function For<T>(opts: { each: () => readonly T[]; key?: string; kids: (item: T) => DocumentFragment }): DocumentFragment;

/** 多路分支：when() 命中 cases 同名分支，否则 def */
export function Switch(opts: {
  when: () => string | number;
  cases: Record<string, () => DocumentFragment>;
  def?: () => DocumentFragment;
}): DocumentFragment;

/** 渲染进容器（元素或选择器），返回卸载函数（清理全部 effect 与 clean 注册项） */
export function render(app: DocumentFragment | (() => DocumentFragment), target: Element | string): () => void;

/** 注册清理函数到最近一次 render() 的作用域 */
export function clean(fn: () => void): void;

// 响应式核心（重导出自主库 lib/state.js）
export declare function signal<T>(v: T): {
  (): T;
  set(val: T | ((prev: T) => T)): void;
};
export declare function computed<T>(fn: () => T): { (): T; readonly [computedMarker]: true };
declare const computedMarker: unique symbol;
export declare function effect(fn: () => void): () => void;
export declare function batch(fn: () => void): void;
export declare function createRoot<T>(fn: () => T): T;
export declare function untrack<T>(fn: () => T): T;

// ============================================================
// 应用原语（D-001=B：res/route 从 k 入口直达；签名与主包 index.d.ts 一致）
// ============================================================

/** createResource 返回的资源句柄（signal，函数式读取） */
export interface Resource<T = unknown> {
  data: () => T;
  isLoading: () => boolean;
  error: () => Error | null;
  isError: () => boolean;
}

/** 创建响应式资源：source 变化自动重新拉取，effect 注册到当前 owner */
export function createResource<T = unknown>(
  source: (() => unknown) | unknown,
  fetcher: (key: unknown) => Promise<T>,
  options?: { initialValue?: T }
): Resource<T>;

/** 路由 handler 上下文 */
export interface RouteContext {
  outlet: HTMLElement;
  signal: AbortSignal;
  go: (path: string, options?: { replace?: boolean; transition?: boolean }) => Promise<void>;
}

/** 路由懒加载模块：default 为渲染函数，可选 meta 并入路由 */
export interface RouteModule {
  default: RouteHandler;
  meta?: Record<string, unknown>;
}

/** 路由 handler：可返回子 outlet 选择器（嵌套）或懒加载模块（() => import(...)） */
export type RouteHandler = (
  params: Record<string, string>,
  ctx: RouteContext
) => void | string | RouteModule | Promise<void | string | RouteModule>;

/** 路由注册选项 */
export interface RouteOptions {
  children?: Array<{ path: string; handler: RouteHandler }>;
  keepAlive?: boolean;
  scroll?: boolean;
  meta?: Record<string, unknown>;
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

/** 全局后置钩子：返回取消函数，可注册到 owner 在页面卸载时清理 */
export function afterEach(
  hook: (route: any, params: Record<string, string>, path: string) => void
): () => void;

/** 404 处理 */
export function notFound(handler: (path: string) => void): void;

/** 获取当前路由信息 */
export function current(): { path: string; params: Record<string, string>; route: any; outlet: HTMLElement; meta: Record<string, unknown> } | null;

/** start() 选项 */
export interface RouterStartOptions {
  outlet?: string;
  scrollRestoration?: boolean;
  keepAliveMax?: number;
  base?: string;
  hash?: boolean;
  scrollBehavior?: (
    to: { path: string; params: Record<string, string>; query: Record<string, string>; meta: Record<string, unknown> },
    from: { path: string; params: Record<string, string>; query: Record<string, string>; meta: Record<string, unknown> } | null,
    savedPosition: { x: number; y: number } | null
  ) => ({ x?: number; y?: number } | { el: string | Element; top?: number } | false | null)
    | Promise<{ x?: number; y?: number } | { el: string | Element; top?: number } | false | null>;
}

/** 启动路由（options 为字符串时视为 outlet 选择器） */
export function start(options?: string | RouterStartOptions, extra?: RouterStartOptions): void;

/** 路由错误：outlet 选择器未命中时抛出 */
export class RouterError extends Error {}
