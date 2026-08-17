// AIFlow UI —— TypeScript 类型声明
// 公开 API：28 组件类 + AfElement 基类 + 主题 API + escapeHtml + register/registerAll
// ⚠️ 手工维护：新增组件时须同步追加 class 声明，CI 的 types-sync 检查会校验一致

/// <reference lib="dom" />

// ============================================================
// 公共类型
// ============================================================

/** 组件事件 detail 基类 */
export interface AfEventDetail {
  [key: string]: unknown;
}

/** 主题名称 */
export type ThemeName = 'light' | 'dark';

/** 渲染监控事件（AfElement.onPerf 全局订阅者收到） */
export interface PerfEvent {
  /** 事件类型：render=首次挂载渲染，update=属性变化更新处理 */
  type: 'render' | 'update';
  /** 组件标签名（如 af-list） */
  tagName: string;
  /** 触发更新的属性名（仅 update 类型有值） */
  attr?: string;
  /** 渲染/更新处理耗时（ms，与 performance.now() 同一时间基准） */
  duration: number;
}

/** DTCG token 值：字符串（含别名 {group.name}）/ 数值 / cubic-bezier 对象 */
export type DesignTokenValue = string | number | { x1: number; y1: number; x2: number; y2: number };

/** 单个 DTCG token（W3C Design Tokens Format 1.1） */
export interface DesignToken {
  $type: 'color' | 'dimension' | 'number' | 'duration' | 'cubicBezier' | 'shadow' | 'string' | 'other';
  $value: DesignTokenValue;
}

/** L1 设计 Token 树（src/tokens.json，由 tokens.css 生成） */
export type DesignTokens = {
  [group: string]: DesignToken | DesignTokens;
};

// ============================================================
// L1 主题 API
// ============================================================

/** 从 localStorage 恢复主题（应在入口尽早调用，先于组件挂载） */
export function initTheme(): void;

/** 设置主题并持久化到 localStorage */
export function setTheme(theme: ThemeName): void;

/** 切换主题（light <-> dark） */
export function toggleTheme(): void;

/** 获取当前主题（优先 localStorage，回退 prefers-color-scheme） */
export function getTheme(): ThemeName;

// ============================================================
// 工具函数
// ============================================================

/** HTML 转义：注入数据到 innerHTML 前使用，防 XSS */
export function escapeHtml(s: unknown): string;

/** 可信 HTML 包装（用于 html 标签内显式声明不转义） */
export interface TrustedHtml {
  raw: string;
}

/**
 * 安全 HTML 模板标签：${value} 插值自动转义，${{ raw: '<b>html</b>' }} 标记可信 HTML
 * @example html`<div class="body">${item.title}</div>` // title 自动转义
 * @example html`<div>${{ raw: '<b>加粗</b>' }}</div>` // 显式可信 HTML 不转义
 */
export function html(strings: TemplateStringsArray, ...values: Array<unknown | TrustedHtml>): string;

// ============================================================
// AfElement 基类（供用户继承自定义组件）
// ============================================================

export class AfElement extends HTMLElement {
  static useShadow?: boolean;
  static observedAttributes?: string[];
  /** 样式注入模式：'inline'（默认，零请求）| 'external'（CSP 合规，<link> 引用） */
  static cssMode?: 'inline' | 'external';
  /** 外部样式表 URL（仅 cssMode='external' 时生效） */
  static cssBaseUrl?: string;
  /** 生成组件样式标签：inline 返回 <style>，external 返回 <link> */
  static cssTag(css: string, id: string): string;
  /** 生成 DSD 声明式模板（<template shadowrootmode>），供 SSR/SSG 置于组件标签内；非 Shadow 或未实现 shadowHTML 时返回空串 */
  dsdTemplate(): string;
  /** 检测 shadow root 是否由 DSD 预填充（有子元素） */
  _dsdPrepopulated(): boolean;
  /** Shadow DOM 组件完整 shadow 模板（DSD 声明式封装 + mounted 动态渲染共用） */
  protected shadowHTML?(): string;
  /** 统一查询根：Shadow 组件返回 shadowRoot，Light 组件返回 this */
  readonly $root: ShadowRoot | HTMLElement;
  /** 在 $root 内查询首个匹配元素 */
  $(selector: string): Element | null;
  /** 在 $root 内查询所有匹配元素 */
  $$(selector: string): Element[];
  /** 派发自定义事件（bubbles + composed） */
  emit(name: string, detail?: AfEventDetail): void;
  /** 生命周期：挂载后 */
  protected mounted?(): void;
  /** 生命周期：卸载前 */
  protected unmounted?(): void;
  /** 属性变化回调 */
  protected onAttributeChange?(name: string, oldVal: string, newVal: string): void;
  /** 主题切换回调 */
  protected onThemeChange?(theme: ThemeName): void;
  /** 语言切换回调（默认调用 _applyI18n） */
  protected onLocaleChange?(locale: string): void;
  /** i18n 映射表：{ selector: [attr, keyOrFn, fallbackProp?, skipIfAttr?] } */
  static i18n?: Record<string, [string, string | ((host: AfElement, t: (key: string, vars?: TranslateVars) => string, el: Element, index: number) => string), string?, string?]>;
  /** 定义属性（attribute 与 property 双向同步）
   *  紧凑形式：defineProp(proto, 'confirmText', '确定') —— type 从 default 推断（null 视为 String），attr 自动 kebab-case */
  static defineProp(
    proto: AfElement,
    name: string,
    opts?: {
      attr?: string;
      type?: 'String' | 'Number' | 'Boolean' | 'Array' | 'Object';
      default?: unknown;
    } | unknown
  ): void;
  /** 注册全局渲染事件订阅者（DevTools/性能分析），返回取消函数；默认零开销 */
  static onPerf(cb: (event: PerfEvent) => void): () => void;
  /** 生命周期：首次渲染后（子类重写，无监听器时不触发） */
  protected onRender?(): void;
  /** 生命周期：属性变化更新处理后（子类重写，无监听器时不触发） */
  protected onUpdate?(attrname: string): void;
}

// ============================================================
// af-list（P0 · 长列表虚拟滚动）
// ============================================================

export interface ListItem {
  title: string;
  subtitle?: string;
  [key: string]: unknown;
}

export interface ListItemClickDetail extends AfEventDetail {
  index: number;
  item: unknown;
}

export interface ListLoadMoreDetail extends AfEventDetail {
  page: number;
}

export class AfList extends AfElement {
  static useShadow: false;
  /** 列表数据 */
  data: unknown[];
  /** 总数（用于分页终止；未设置时为 Infinity） */
  totalCount: number;
  /** 每项固定高度（px） */
  itemHeight: number;
  /** 显式高度（如 '400px'，使虚拟滚动生效） */
  height: string;
  /** 页大小（loadmore page 步长） */
  pageSize: number;
  /** 缓冲项数 */
  buffer: number;
  /** 模式：normal 用 .list-item，compact 用 .list-item-compact */
  mode: 'normal' | 'compact';
  /** 是否启用下拉刷新 */
  refresh: boolean;
  /** 加载中状态（显示骨架屏） */
  loading: boolean;
  /** 空状态文案 */
  emptyText: string;
  /** 自定义渲染函数（返回 HTML 字符串） */
  renderItem?: (item: unknown, index: number) => string;
  /** 当前滚动位置（只读） */
  readonly scrollTop: number;
  /** 结束上拉加载（传入 hasMore=false 显示"没有更多了"） */
  endLoadMore(hasMore: boolean): void;
  /** 结束下拉刷新（收起刷新指示器） */
  endRefresh(): void;
  addEventListener(type: 'af-list:itemclick', listener: (e: CustomEvent<ListItemClickDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-list:loadmore', listener: (e: CustomEvent<ListLoadMoreDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-list:refresh', listener: (e: CustomEvent) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-swiper（P0 · 轮播/滑动卡片）
// ============================================================

export interface SwiperChangeDetail extends AfEventDetail {
  index: number;
}

export class AfSwiper extends AfElement {
  static useShadow: true;
  /** 当前激活索引 */
  activeIndex: number;
  /** 自动播放间隔（ms，0 禁用） */
  autoplay: number;
  /** 无缝循环 */
  loop: boolean;
  /** 过渡时长（ms） */
  duration: number;
  /** 是否显示指示点 */
  showDots: boolean;
  /** 禁用触摸拖拽（仍允许程序控制） */
  disabled: boolean;
  /** slide 总数（只读） */
  readonly slideCount: number;
  /** 跳转到指定索引 */
  goTo(index: number): void;
  /** 下一张 */
  next(): void;
  /** 上一张 */
  prev(): void;
  addEventListener(type: 'af-swiper:change', listener: (e: CustomEvent<SwiperChangeDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-tabs（P0 · 标签页切换）
// ============================================================

export interface TabItem {
  label: string;
  value?: string | number;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface TabsChangeDetail extends AfEventDetail {
  index: number;
  value: string | number;
}

export class AfTabs extends AfElement {
  static useShadow: false;
  /** 标签配置 */
  tabs: TabItem[];
  /** 当前激活索引 */
  activeIndex: number;
  /** 变体 */
  variant: string;
  /** 固定 tabbar */
  fixed: boolean;
  /** 自定义面板渲染函数 */
  renderPanel?: (tab: TabItem, index: number) => string;
  /** 设置激活标签 */
  setActive(index: number, silent?: boolean): void;
  addEventListener(type: 'af-tabs:change', listener: (e: CustomEvent<TabsChangeDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-dialog（P0 · 模态框）
// ============================================================

export interface DialogCloseDetail extends AfEventDetail {
  action: 'confirm' | 'cancel' | 'close' | 'esc' | 'backdrop' | 'external' | null;
}

export class AfDialog extends AfElement {
  static useShadow: true;
  /** 是否打开 */
  open: boolean;
  /** 标题 */
  title: string;
  /** Esc 关闭 */
  closeOnEsc: boolean;
  /** 点击遮罩关闭 */
  closeOnBackdrop: boolean;
  /** 变体（default/center/bottom） */
  variant: string;
  /** 返回值（close 时设置） */
  returnValue: string | null;
  /** 是否已打开（只读） */
  readonly isOpen: boolean;
  /** 打开对话框 */
  open(): void;
  /** 关闭对话框 */
  close(action?: string): void;
  addEventListener(type: 'af-dialog:open', listener: (e: CustomEvent) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-dialog:close', listener: (e: CustomEvent<DialogCloseDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-toast（P1 · 轻提示）
// ============================================================

export interface ToastDismissDetail extends AfEventDetail {
  message: string;
}

export class AfToast extends AfElement {
  static useShadow: false;
  /** 显示时长（ms） */
  duration: number;
  /** 当前消息（只读） */
  readonly message: string;
  /** 显示提示 */
  show(message: string, duration?: number): void;
  /** 关闭提示 */
  dismiss(): void;
  addEventListener(type: 'af-toast:dismiss', listener: (e: CustomEvent<ToastDismissDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-action-sheet（P1 · 底部操作面板）
// ============================================================

export interface ActionSheetOption {
  label: string;
  value: string | number;
  danger?: boolean;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface ActionSheetSelectDetail extends AfEventDetail {
  index: number;
  value: string | number;
}

export class AfActionSheet extends AfElement {
  static useShadow: false;
  /** 选项列表 */
  options: ActionSheetOption[];
  /** 标题 */
  title: string;
  /** 显示取消按钮 */
  showCancel: boolean;
  /** 取消按钮文案 */
  cancelText: string;
  /** 显示面板 */
  showPopover(): void;
  /** 隐藏面板 */
  hidePopover(): void;
  addEventListener(type: 'af-action-sheet:select', listener: (e: CustomEvent<ActionSheetSelectDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-action-sheet:open' | 'af-action-sheet:close', listener: (e: CustomEvent) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-picker（P1 · 滚轮选择器）
// ============================================================

export interface PickerItem {
  label: string;
  value: string | number;
  [key: string]: unknown;
}

export interface PickerChangeDetail extends AfEventDetail {
  column: number;
  value: string | number;
  index: number;
}

export interface PickerConfirmDetail extends AfEventDetail {
  values: (string | number)[];
}

export class AfPicker extends AfElement {
  static useShadow: true;
  /** 多列数据 */
  columns: PickerItem[][];
  /** 各列选中值 */
  values: (string | number)[];
  /** 标题 */
  title: string;
  /** 确认按钮文案 */
  confirmText: string;
  /** 取消按钮文案 */
  cancelText: string;
  /** 每项高度（px） */
  itemHeight: number;
  /** 可见项数 */
  visibleCount: number;
  /** 打开选择器 */
  open(): void;
  /** 关闭选择器 */
  close(): void;
  /** 联动：更新某列数据 */
  setColumn(colIdx: number, items: PickerItem[], value?: string | number): void;
  addEventListener(type: 'af-picker:change', listener: (e: CustomEvent<PickerChangeDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-picker:confirm', listener: (e: CustomEvent<PickerConfirmDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-picker:cancel', listener: (e: CustomEvent) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-cascade-picker（v1.3.0 · 级联选择器，复用 af-picker 滚轮内核）
// ============================================================

export interface CascadeNode extends PickerItem {
  /** 子级节点（叶节点缺省） */
  children?: CascadeNode[];
}

export class AfCascadePicker extends AfPicker {
  /** 树形级联数据 */
  tree: CascadeNode[];
}

// ============================================================
// af-dropdown（P2 · 下拉菜单）
// ============================================================

export interface DropdownOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface DropdownSelectDetail extends AfEventDetail {
  index: number;
  value: string | number;
}

export class AfDropdown extends AfElement {
  static useShadow: false;
  /** 选项列表 */
  options: DropdownOption[];
  /** 当前值 */
  value: string;
  /** 占位文案 */
  placeholder: string;
  /** 触发器 class（默认 input） */
  triggerClass: string;
  /** 禁用 */
  disabled: boolean;
  /** 选中项 label（只读） */
  readonly selectedLabel: string;
  /** 打开下拉 */
  open(): void;
  /** 关闭下拉 */
  close(): void;
  addEventListener(type: 'af-dropdown:select', listener: (e: CustomEvent<DropdownSelectDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-dropdown:close', listener: (e: CustomEvent) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-img（P2 · 懒加载图片）
// ============================================================

export class AfImg extends AfElement {
  static useShadow: false;
  /** 图片地址 */
  src: string;
  /** alt 文本 */
  alt: string;
  /** 占位图地址 */
  placeholderSrc: string;
  /** 失败回退图地址 */
  failSrc: string;
  /** 变体（default/thumb/avatar） */
  variant: 'default' | 'thumb' | 'avatar';
  /** IntersectionObserver rootMargin */
  rootMargin: string;
  /** 是否懒加载 */
  lazy: boolean;
  /** 是否已加载（只读） */
  readonly loaded: boolean;
  /** 是否加载失败（只读） */
  readonly error: boolean;
  addEventListener(type: 'af-img:load' | 'af-img:error', listener: (e: CustomEvent) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-backtop（P2 · 回到顶部）
// ============================================================

export class AfBacktop extends AfElement {
  static useShadow: false;
  /** 出现阈值（scroll 距离 px） */
  threshold: number;
  /** 滚动目标选择器（默认 window） */
  target: string;
  /** 按钮文案 */
  text: string;
  /** aria-label 文案 */
  ariaLabelText: string;
  /** 位置（left-bottom/right-bottom） */
  position: 'left-bottom' | 'right-bottom';
  /** 是否可见（只读） */
  readonly visible: boolean;
  /** 平滑滚动到顶部 */
  scrollToTop(): void;
  addEventListener(type: 'af-backtop:click' | 'af-backtop:show' | 'af-backtop:hide', listener: (e: CustomEvent) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-badge（v1.3.0 · 徽标角标）
// ============================================================

export class AfBadge extends AfElement {
  static useShadow: false;
  /** 徽标内容（数值超过 max 显示 max+） */
  content: string;
  /** 数值上限，超限显示 max+ */
  max: number;
  /** 点状徽标（隐藏文字） */
  dot: boolean;
  /** 颜色变体（danger/warn/ok/muted） */
  color: 'danger' | 'warn' | 'ok' | 'muted';
}

// ============================================================
// af-calendar（v1.3.0 · 日历）
// ============================================================

export interface CalendarSelectDetail extends AfEventDetail {
  date: string;
}

export interface CalendarMonthChangeDetail extends AfEventDetail {
  month: string;
}

export class AfCalendar extends AfElement {
  static useShadow: true;
  /** 选中日期（YYYY-MM-DD） */
  value: string;
  /** 展示月份（YYYY-MM，缺省为当前月） */
  month: string;
  /** 可选区间下限（YYYY-MM-DD） */
  min: string;
  /** 可选区间上限（YYYY-MM-DD） */
  max: string;
  addEventListener(type: 'af-calendar:select', listener: (e: CustomEvent<CalendarSelectDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-calendar:monthchange', listener: (e: CustomEvent<CalendarMonthChangeDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-switch（v1.2.0 · 开关切换）
// ============================================================

export interface SwitchChangeDetail extends AfEventDetail {
  checked: boolean;
}

export class AfSwitch extends AfElement {
  static useShadow: false;
  /** 开关状态 */
  checked: boolean;
  /** 禁用 */
  disabled: boolean;
  /** 加载中（显示 spinner，禁用交互） */
  loading: boolean;
  /** 尺寸变体 */
  size: 'sm' | 'md';
  /** 切换开关（传参则强制设为该值） */
  toggle(force?: boolean): void;
  addEventListener(type: 'af-switch:change', listener: (e: CustomEvent<SwitchChangeDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-search-bar（v1.2.0 · 搜索栏）
// ============================================================

export interface SearchBarInputDetail extends AfEventDetail {
  value: string;
}

export class AfSearchBar extends AfElement {
  static useShadow: false;
  /** 输入值 */
  value: string;
  /** 占位文案 */
  placeholder: string;
  /** 是否显示清除按钮 */
  clearable: boolean;
  /** 防抖时间（ms，0 表示不防抖） */
  debounce: number;
  /** 聚焦输入框 */
  focus(): void;
  addEventListener(type: 'af-search-bar:input', listener: (e: CustomEvent<SearchBarInputDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-search-bar:search', listener: (e: CustomEvent<SearchBarInputDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-search-bar:clear', listener: (e: CustomEvent<SearchBarInputDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-skeleton-page（v1.2.0 · 整页骨架屏）
// ============================================================

export class AfSkeletonPage extends AfElement {
  static useShadow: false;
  /** 布局变体 */
  variant: 'list' | 'detail' | 'profile' | 'card';
}

// ============================================================
// af-upload（v1.4.0 · 文件上传）
// ============================================================

export interface UploadPreview {
  file: File;
  url: string;
  name: string;
  size: number;
  [key: string]: unknown;
}

export interface UploadError {
  name: string;
  size: number;
  reason: 'type' | 'size' | 'count';
  [key: string]: unknown;
}

export interface UploadChangeDetail extends AfEventDetail {
  files: UploadPreview[];
  errors: UploadError[];
}

export interface UploadErrorDetail extends AfEventDetail {
  errors: UploadError[];
}

export class AfUpload extends AfElement {
  static useShadow: false;
  /** accept 文件类型（透传到原生 input） */
  accept: string;
  /** 是否多选 */
  multiple: boolean;
  /** 单文件大小上限（字节，0=不限） */
  maxSize: number;
  /** 文件数量上限（0=不限） */
  maxCount: number;
  /** 触发按钮文案 */
  buttonText: string;
  /** 触发按钮 aria-label */
  ariaLabelText: string;
  /** 清空已选文件 */
  clear(): void;
  addEventListener(type: 'af-upload:change', listener: (e: CustomEvent<UploadChangeDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-upload:error', listener: (e: CustomEvent<UploadErrorDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-navbar（v1.5.0 · 顶部导航栏）
// ============================================================

export class AfNavbar extends AfElement {
  static useShadow: false;
  /** 标题 */
  title: string;
  /** 显示返回按钮 */
  showBack: boolean;
  /** 返回按钮文案 */
  backText: string;
  /** 返回按钮 aria-label */
  backAriaLabel: string;
  addEventListener(type: 'af-navbar:back', listener: (e: CustomEvent) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-tabbar（v1.5.0 · 底部标签栏）
// ============================================================

export interface TabbarItem {
  label?: string;
  value?: string | number;
  icon?: string;
  badge?: string | number;
  [key: string]: unknown;
}

export interface TabbarChangeDetail extends AfEventDetail {
  index: number;
  value: string | number;
}

export class AfTabbar extends AfElement {
  static useShadow: false;
  /** 标签配置 */
  tabs: TabbarItem[];
  /** 当前激活索引 */
  activeIndex: number;
  /** 固定在底部 */
  fixed: boolean;
  /** aria-label 文案 */
  ariaLabel: string;
  /** 设置激活标签 */
  setActive(index: number, silent?: boolean): void;
  addEventListener(type: 'af-tabbar:change', listener: (e: CustomEvent<TabbarChangeDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-stepper（v1.5.0 · 数量选择器）
// ============================================================

export interface StepperChangeDetail extends AfEventDetail {
  value: number;
}

export class AfStepper extends AfElement {
  static useShadow: false;
  /** 当前值 */
  value: number;
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 步长 */
  step: number;
  /** 禁用 */
  disabled: boolean;
  /** aria-label 文案 */
  ariaLabel: string;
  /** 设置值（自动 clamp 到 min/max） */
  setValue(value: number, silent?: boolean): void;
  addEventListener(type: 'af-stepper:change', listener: (e: CustomEvent<StepperChangeDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-field（v1.5.0 · 结构化表单字段）
// ============================================================

export interface FieldInputDetail extends AfEventDetail {
  value: string;
}

export class AfField extends AfElement {
  static useShadow: false;
  /** 标签 */
  label: string;
  /** 前置图标 */
  icon: string;
  /** 控件类型（input/textarea） */
  type: 'input' | 'textarea';
  /** input 元素 type 属性（text/password/email...） */
  inputType: string;
  /** 当前值 */
  value: string;
  /** 占位文案 */
  placeholder: string;
  /** 帮助文本 */
  help: string;
  /** 校验错误消息 */
  error: string;
  /** 禁用 */
  disabled: boolean;
  /** 只读 */
  readonly: boolean;
  /** aria-label 文案 */
  ariaLabel: string;
  /** 设置校验错误（空字符串清除） */
  setError(msg: string): void;
  /** 聚焦输入框 */
  focus(): void;
  addEventListener(type: 'af-field:input', listener: (e: CustomEvent<FieldInputDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-field:change', listener: (e: CustomEvent<FieldInputDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-pull-refresh（v1.5.0 · 下拉刷新容器）
// ============================================================

export class AfPullRefresh extends AfElement {
  static useShadow: false;
  /** 加载中状态 */
  refreshing: boolean;
  /** 结束刷新（收起指示器） */
  endRefresh(): void;
  addEventListener(type: 'af-pull-refresh:refresh', listener: (e: CustomEvent) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-swipe-cell（v1.5.0 · 滑动单元格）
// ============================================================

export interface SwipeCellActionDetail extends AfEventDetail {
  action: string;
}

export class AfSwipeCell extends AfElement {
  static useShadow: false;
  /** 禁用滑动 */
  disabled: boolean;
  /** 打开右侧操作区 */
  open(): void;
  /** 关闭右侧操作区 */
  close(): void;
  addEventListener(type: 'af-swipe-cell:action', listener: (e: CustomEvent<SwipeCellActionDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-rate（v1.3.0 · 评分）
// ============================================================

export interface RateChangeDetail extends AfEventDetail {
  value: number;
}

export class AfRate extends AfElement {
  static useShadow: false;
  /** 当前评分（0-max） */
  value: number;
  /** 星数上限 */
  max: number;
  /** 只读（不可交互） */
  readonly: boolean;
  /** 尺寸变体（sm/md/lg） */
  size: 'sm' | 'md' | 'lg';
  /** radiogroup 无障碍标签 */
  label: string;
  addEventListener(type: 'af-rate:change', listener: (e: CustomEvent<RateChangeDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// af-notice-bar（v1.3.0 · 公告通知栏）
// ============================================================

export class AfNoticeBar extends AfElement {
  static useShadow: false;
  /** 公告文本 */
  text: string;
  /** 横向滚动模式（marquee）而非 ellipsis 截断 */
  scroll: boolean;
}

// ============================================================
// af-progress（v1.3.0 · 进度条）
// ============================================================

export class AfProgress extends AfElement {
  static useShadow: false;
  /** 当前值 */
  value: number;
  /** 最大值 */
  max: number;
  /** 颜色变体（brand/success/danger） */
  color: 'brand' | 'success' | 'danger';
}

// ============================================================
// af-steps（v1.3.0 · 步骤条）
// ============================================================

export class AfSteps extends AfElement {
  static useShadow: false;
  /** 步骤项（字符串或 { label }） */
  steps: Array<string | { label: string }>;
  /** 当前步骤索引（0 起） */
  current: number;
}

// ============================================================
// af-countdown（v1.3.0 · 倒计时）
// ============================================================

/** af-countdown:change 事件 detail */
export interface CountdownChangeDetail {
  /** 剩余秒数 */
  remaining: number;
  /** 总秒数 */
  total: number;
}

/** af-countdown:end 事件 detail（空） */
export interface CountdownEndDetail {
  [key: string]: unknown;
}

export class AfCountdown extends AfElement {
  static useShadow: false;
  /** 总时长（秒） */
  time: number;
  /** 挂载后自动开始 */
  autostart: boolean;
  /** 开始倒计时 */
  start(): void;
  /** 暂停（保留剩余时间） */
  pause(): void;
  /** 重置到 time 初始值 */
  reset(): void;
  addEventListener(type: 'af-countdown:change', listener: (e: CustomEvent<CountdownChangeDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-countdown:end', listener: (e: CustomEvent<CountdownEndDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// 注册接口
// ============================================================

/** 按需注册组件（变参，传入一个或多个标签名，与 no-register-all 规则推荐用法一致） */
export function register(...names: string[]): void;

/** 全量注册 28 个组件 */
export function registerAll(): void;

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

/** Owner 作用域：fn 内创建的 effect/computed 自动注册到 owner，dispose 时级联清理 */
export function createRoot<T>(fn: (dispose: () => void) => T): T;

/** 获取当前 owner（createRoot 内部用，外部调试用） */
export function getOwner(): { disposers: Array<() => void>; parent: object | null } | null;

/** 在 fn 内读取 signal 不建立依赖（写入仍生效） */
export function untrack<T>(fn: () => T): T;

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

/** 添加全局拦截器：request 返回 opts 继续 / Response 短路；response 变换数据；error 返回数据恢复 / undefined 继续 */
export function addInterceptor(
  fnOrPhase: ((url: string, opts: any) => Promise<any> | any) | 'request' | 'response' | 'error',
  fn?: (url: string, arg: any) => Promise<any> | any
): void;
/** 移除拦截器 */
export function removeInterceptor(fn: (url: string, opts: any) => any): void;

/** 后端 scheme 适配器：fetchPage 遇到 `scheme://...` URL 时分发给它（如 @af-mobile/adapters 的 supabaseAdapter） */
export type BackendAdapter = (url: string, opts: any) => Promise<{ data: any; total?: number }>;
/** 注册后端 scheme 适配器（主包仅分发机制，零具体实现） */
export function registerBackend(scheme: string, adapter: BackendAdapter): void;
/** 注销后端 scheme 适配器 */
export function unregisterBackend(scheme: string): void;
/** 失效指定 URL 的缓存 */
export function invalidateCache(url: string): void;
/** 清空所有缓存 */
export function clearCache(): void;

/** 缓存后端接口（与 Map 同构：get/set/delete/clear） */
export interface CacheAdapter {
  get(url: string): { data: unknown; expiry: number } | undefined;
  set(url: string, entry: { data: unknown; expiry: number }): void;
  delete(url: string): void;
  clear(): void;
}

/** 创建 localStorage 持久化缓存后端（仅缓存 JSON 可序列化数据，Blob/Response/ArrayBuffer 自动跳过） */
export function localStorageAdapter(options?: { prefix?: string }): CacheAdapter;

/** 切换缓存后端（默认内存 Map；传 localStorageAdapter() 启用持久化缓存） */
export function setCacheAdapter(adapter: CacheAdapter): void;

/** createResource 返回的资源句柄（signal，函数式读取） */
export interface Resource<T = unknown> {
  data: () => T;
  isLoading: () => boolean;
  error: () => Error | null;
  isError: () => boolean;
}

/** 创建响应式资源：source 变化自动重新拉取，effect 注册到当前 owner（在 createPage.setup 中调用） */
export function createResource<T = unknown>(
  source: (() => unknown) | unknown,
  fetcher: (key: unknown) => Promise<T>,
  options?: { initialValue?: T }
): Resource<T>;

// ============================================================
// 核心运行时：router（SPA 路由）
// ============================================================

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
  /** 路由元信息，透出到 current()/守卫/afterEach/scrollBehavior */
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

/** 启动路由
 *  options 为字符串时视为 outlet 选择器（等价 { outlet }），兼容 start('#app') 调用形式；
 *  其余选项走对象形式 start({ hash: true }) */
export function start(options?: string | {
  outlet?: string;
  scrollRestoration?: boolean;
  keepAliveMax?: number;
  base?: string;
  /** hash 路由模式：路径取自 location.hash（#/path），零服务端配置；默认 false 走 History 模式 */
  hash?: boolean;
  /** 滚动位置：{x,y} 坐标 | {el,top} 元素 | false 禁止滚动（仿 Vue Router） */
  scrollBehavior?: (
    to: { path: string; params: Record<string, string>; query: Record<string, string>; meta: Record<string, unknown> },
    from: { path: string; params: Record<string, string>; query: Record<string, string>; meta: Record<string, unknown> } | null,
    savedPosition: { x: number; y: number } | null
  ) => ({ x?: number; y?: number } | { el: string | Element; top?: number } | false | null)
    | Promise<{ x?: number; y?: number } | { el: string | Element; top?: number } | false | null>;
}): void;

/** 路由错误：outlet 选择器未命中时抛出 */
export class RouterError extends Error {}

// ============================================================
// 核心运行时：page（页面运行时工厂）
// ============================================================

/** createPage 页面配置 */
export interface PageConfig {
  state?: Record<string, unknown>;
  computed?: Record<string, (s: Record<string, unknown>) => unknown>;
  /** 命令式初始化（createResource 等），在 state/computed 之后、effects 之前调用；返回值挂 refs */
  setup?: (s: Record<string, unknown>) => Record<string, unknown>;
  effects?: Record<string, unknown>;
  transform?: (data: unknown) => unknown;
  actions?: Record<string, (s: Record<string, unknown>, ...args: unknown[]) => void>;
  onError?: (err: unknown) => void;
  transition?: unknown;
  keepAlive?: boolean;
}

/** createPage 返回的页面实例 */
export interface PageInstance {
  state: Record<string, unknown>;
  derived: Record<string, unknown>;
  actions: Record<string, (...args: unknown[]) => void>;
  /** setup 返回值 */
  refs: Record<string, unknown>;
  transform: ((data: unknown) => unknown) | null;
  transition: unknown;
  keepAlive: boolean;
  mount(root: HTMLElement): void;
  /** 级联清理所有 effect/computed/上游订阅 */
  unmount(): void;
}

/** 页面运行时工厂（实例化，参数注入 state） */
export function createPage(config?: PageConfig): PageInstance;

// ============================================================
// 核心运行时：i18n（国际化）
// ============================================================

/** 语言代码 */
export type Locale = string;

/** 翻译变量映射 */
export type TranslateVars = Record<string, string | number>;

/** 翻译函数：回退链 当前 locale → zh-CN → key 自身 */
export function t(key: string, vars?: TranslateVars): string;

/** 获取当前语言（默认 'zh-CN'） */
export function getLocale(): Locale;

/** 设置语言 + 持久化到 localStorage + dispatch 'localechange' 事件 */
export function setLocale(locale: Locale): void;

/** 从 localStorage 恢复语言（入口尽早调用） */
export function initLocale(): void;

/** 注册/覆盖语言包（浅合并）；dictOrLoader 为函数时支持懒加载（如 () => import(...)），返回加载 Promise */
export function addMessages(
  locale: Locale,
  dictOrLoader: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>)
): void | Promise<Record<string, string>>;

/** 全部语言字典 */
export const messages: Record<Locale, Record<string, string>>;
