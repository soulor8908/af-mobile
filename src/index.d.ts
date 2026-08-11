// AIFlow UI —— TypeScript 类型声明
// 公开 API：20 组件类 + AfElement 基类 + 主题 API + escapeHtml + register/registerAll
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

// —— af-data ——
export interface AfDataLoadDetail extends AfEventDetail {
  data: unknown;
}
export interface AfDataErrorDetail extends AfEventDetail {
  error: Error;
}
export class AfData extends AfElement {
  static useShadow: false;
  src: string;
  ref: string;
  cache: boolean;
  cacheTtl: number;
  refresh(): Promise<void>;
  getData(): unknown;
  getLoading(): boolean;
  getError(): Error | null;
  addEventListener(type: 'af-data:load', listener: (e: CustomEvent<AfDataLoadDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-data:error', listener: (e: CustomEvent<AfDataErrorDetail>) => void, options?: boolean | AddEventListenerOptions): void;
}

// ============================================================
// 注册接口
// ============================================================

/** 按需注册单个组件（传入标签名） */
export function register(name: string): void;

/** 全量注册 21 个组件 */
export function registerAll(): void;

// ============================================================
// L3.5 Block 层（复合组件，AI 优先使用）
// ============================================================

/** 设置项 schema */
export interface SettingItem {
  label?: string;
  icon?: string;
  value?: string;
  action?: 'arrow';
  checked?: boolean;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface SettingGroupItemClickDetail extends AfEventDetail {
  index: number;
  item: SettingItem;
}

export interface SettingGroupChangeDetail extends AfEventDetail {
  index: number;
  checked: boolean;
  item: SettingItem;
}

/** af-setting-group：设置分组（含五态/键盘导航/移动端适配） */
export class AfSettingGroup extends AfElement {
  static useShadow: false;
  /** 变体：default（箭头）/ with-switch（开关）/ with-value（值+箭头） */
  variant: 'default' | 'with-switch' | 'with-value';
  /** 分组标题（空则不渲染标题行） */
  title: string;
  /** 设置项列表 */
  items: SettingItem[];
  /** 加载态（显示骨架屏） */
  loading: boolean;
  /** 触发错误态（如 fetch 失败） */
  setError(err: unknown): void;
  addEventListener(type: 'af-setting-group:itemclick', listener: (e: CustomEvent<SettingGroupItemClickDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-setting-group:change', listener: (e: CustomEvent<SettingGroupChangeDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-setting-group:retry', listener: (e: CustomEvent) => void, options?: boolean | AddEventListenerOptions): void;
}


/** af-product-card item schema */
export interface ProductCardItem {
  label?: string;
  value?: string;
  action?: 'arrow';
  checked?: boolean;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface ProductCardClickDetail extends AfEventDetail {
  index: number;
  item: ProductCardItem;
}

/** af-product-card：商品卡片（含五态/键盘导航/移动端适配） */
export class AfProductCard extends AfElement {
  static useShadow: false;
  title: string;
  price: string;
  items: ProductCardItem[];
  loading: boolean;
  /** 触发错误态（如 fetch 失败） */
  setError(err: unknown): void;
  addEventListener(type: 'af-product-card:itemclick', listener: (e: CustomEvent<ProductCardClickDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'af-product-card:retry', listener: (e: CustomEvent) => void, options?: boolean | AddEventListenerOptions): void;
}

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

/** 跨组件事件总线（原生 EventTarget） */
export const bus: EventTarget;

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

/** 添加全局拦截器：返回 opts 继续，返回 Response 短路 */
export function addInterceptor(fn: (url: string, opts: any) => Promise<any> | any): void;
/** 移除拦截器 */
export function removeInterceptor(fn: (url: string, opts: any) => any): void;
/** 失效指定 URL 的缓存 */
export function invalidateCache(url: string): void;
/** 清空所有缓存 */
export function clearCache(): void;

// ============================================================
// 核心运行时：router（SPA 路由）
// ============================================================

/** 路由 handler 上下文 */
export interface RouteContext {
  outlet: HTMLElement;
  signal: AbortSignal;
  go: (path: string, options?: { replace?: boolean; transition?: boolean }) => Promise<void>;
}

/** 路由 handler：可返回子 outlet 选择器（用于嵌套） */
export type RouteHandler = (
  params: Record<string, string>,
  ctx: RouteContext
) => void | Promise<void | string>;

/** 路由注册选项 */
export interface RouteOptions {
  children?: Array<{ path: string; handler: RouteHandler }>;
  keepAlive?: boolean;
  scroll?: boolean;
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

/** 全局后置钩子 */
export function afterEach(
  hook: (route: any, params: Record<string, string>, path: string) => void
): void;

/** 404 处理 */
export function notFound(handler: (path: string) => void): void;

/** 获取当前路由信息 */
export function current(): { path: string; params: Record<string, string>; route: any; outlet: HTMLElement } | null;

/** 启动路由 */
export function start(options?: {
  outlet?: string;
  scrollRestoration?: boolean;
  keepAliveMax?: number;
  base?: string;
}): void;

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

/** 注册/覆盖语言包（浅合并） */
export function addMessages(locale: Locale, dict: Record<string, string>): void;

/** 全部语言字典 */
export const messages: Record<Locale, Record<string, string>>;

// ============================================================
// L3.5 definePage 页面运行时 + :bind 响应式绑定
// ============================================================

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
