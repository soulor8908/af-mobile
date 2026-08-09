// AIFlow UI —— TypeScript 类型声明
// 公开 API：10 组件类 + AfElement 基类 + 主题 API + escapeHtml + register/registerAll

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

// ============================================================
// AfElement 基类（供用户继承自定义组件）
// ============================================================

export class AfElement extends HTMLElement {
  static useShadow?: boolean;
  static observedAttributes?: string[];
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
  /** 定义属性（attribute 与 property 双向同步） */
  static defineProp(
    proto: AfElement,
    name: string,
    opts?: {
      attr?: string;
      type?: 'String' | 'Number' | 'Boolean' | 'Array' | 'Object';
      default?: unknown;
    }
  ): void;
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
// 注册接口
// ============================================================

/** 按需注册单个组件（传入标签名） */
export function register(name: string): void;

/** 全量注册 13 个组件 */
export function registerAll(): void;
