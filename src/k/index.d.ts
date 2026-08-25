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
