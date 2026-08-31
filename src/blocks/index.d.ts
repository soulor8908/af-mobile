// @af-mobile/ui/blocks —— L3.5 Block 子库：业务积木（列表型五态块）的类型声明

/// <reference lib="dom" />

// af-product-card（P0 · 商品卡片）
export interface ProductItem {
  label: string;
  action?: 'arrow';
  disabled?: boolean;
}

export class AfProductCard extends HTMLElement {
  title: string;
  price: string;
  items: ProductItem[];
  loading: boolean;
  setError(err: unknown): void;
  addEventListener<K extends keyof AfProductCardEventMap>(
    type: K, listener: (this: AfProductCard, ev: AfProductCardEventMap[K]) => void, options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

export interface AfProductCardEventMap {
  'af-product-card:itemclick': CustomEvent<{ index: number; item: ProductItem }>;
  'af-product-card:retry': CustomEvent<Record<string, never>>;
}

// af-setting-group（P0 · 设置分组）
export interface SettingItem {
  label: string;
  icon?: string;
  value?: string;
  action?: 'arrow';
  checked?: boolean;
  disabled?: boolean;
}

export class AfSettingGroup extends HTMLElement {
  variant: 'default' | 'with-switch' | 'with-value';
  title: string;
  items: SettingItem[];
  loading: boolean;
  setError(err: unknown): void;
  addEventListener<K extends keyof AfSettingGroupEventMap>(
    type: K, listener: (this: AfSettingGroup, ev: AfSettingGroupEventMap[K]) => void, options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

export interface AfSettingGroupEventMap {
  'af-setting-group:itemclick': CustomEvent<{ index: number; item: SettingItem }>;
  'af-setting-group:change': CustomEvent<{ index: number; checked: boolean; item: SettingItem }>;
  'af-setting-group:retry': CustomEvent<Record<string, never>>;
}

// af-product-grid（P0 · 商品网格）
export interface ProductGridItem {
  img?: string;
  title: string;
  subtitle?: string;
  price?: string;
  priceDel?: string;
  disabled?: boolean;
}

export class AfProductGrid extends HTMLElement {
  variant: 'one-column' | 'two-column';
  title: string;
  items: ProductGridItem[];
  loading: boolean;
  setError(err: unknown): void;
  addEventListener<K extends keyof AfProductGridEventMap>(
    type: K, listener: (this: AfProductGrid, ev: AfProductGridEventMap[K]) => void, options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

export interface AfProductGridEventMap {
  'af-product-grid:itemclick': CustomEvent<{ index: number; item: ProductGridItem }>;
  'af-product-grid:retry': CustomEvent<Record<string, never>>;
}

// af-order-list（P0 · 订单列表）
export interface OrderItem {
  no: string;
  time?: string;
  status?: string;
  tone?: 'ok' | 'warn' | 'danger';
  amount?: string;
  thumbs?: string[];
  disabled?: boolean;
}

export class AfOrderList extends HTMLElement {
  variant: 'simple' | 'detailed';
  title: string;
  items: OrderItem[];
  loading: boolean;
  setError(err: unknown): void;
  addEventListener<K extends keyof AfOrderListEventMap>(
    type: K, listener: (this: AfOrderList, ev: AfOrderListEventMap[K]) => void, options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

export interface AfOrderListEventMap {
  'af-order-list:itemclick': CustomEvent<{ index: number; item: OrderItem }>;
  'af-order-list:retry': CustomEvent<Record<string, never>>;
}

// af-auth-form（P0 · 登录/注册表单）
export class AfAuthForm extends HTMLElement {
  variant: 'phone-code' | 'password';
  title: string;
  subtitle: string;
  submitText: string;
  loading: boolean;
  setError(err: unknown): void;
  addEventListener<K extends keyof AfAuthFormEventMap>(
    type: K, listener: (this: AfAuthForm, ev: AfAuthFormEventMap[K]) => void, options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

export interface AfAuthFormEventMap {
  'af-auth-form:sendcode': CustomEvent<{ phone: string }>;
  'af-auth-form:submit': CustomEvent<{ phone: string; code?: string; password?: string; confirm?: string }>;
}

export declare const BLOCK_TAGS: {
  'af-product-card': CustomElementConstructor;
  'af-setting-group': CustomElementConstructor;
  'af-product-grid': CustomElementConstructor;
  'af-order-list': CustomElementConstructor;
  'af-auth-form': CustomElementConstructor;
};
/** 注册 blocks 组件（变参，与主库 register(...tags) 语义一致）；无参注册全部 */
export declare function registerBlocks(...tags: Array<keyof typeof BLOCK_TAGS>): void;
