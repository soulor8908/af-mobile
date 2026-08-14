// AIFlow UI —— Vue 3 包装层类型声明
// 数据 prop 通过 property 同步到 Web Component；事件回调接收 e.detail（结构化数据，类型用 unknown 表示不虚构）
import type { DefineComponent } from 'vue';

type P<T extends string> = Partial<Record<T, unknown>>;
type E<T extends string> = Partial<Record<`on${T}`, (detail: unknown) => void>>;

export declare const AfList: DefineComponent<P<'data' | 'pageSize' | 'itemHeight' | 'buffer' | 'mode' | 'refresh' | 'loading' | 'emptyText' | 'height' | 'totalCount'> & E<'Loadmore' | 'Refresh' | 'Itemclick'>>;
export declare const AfSwiper: DefineComponent<P<'activeIndex' | 'autoplay' | 'loop' | 'duration' | 'showDots' | 'disabled'> & E<'Change'>>;
export declare const AfTabs: DefineComponent<P<'tabs' | 'activeIndex' | 'variant' | 'fixed'> & E<'Change'>>;
export declare const AfDialog: DefineComponent<P<'title' | 'closeOnEsc' | 'closeOnBackdrop' | 'variant'> & E<'Open' | 'Close'>>;
export declare const AfToast: DefineComponent<P<'duration'> & E<'Dismiss'>>;
export declare const AfActionSheet: DefineComponent<P<'options' | 'title' | 'showCancel' | 'cancelText'> & E<'Select' | 'Close' | 'Open'>>;
export declare const AfPicker: DefineComponent<P<'columns' | 'values' | 'title' | 'confirmText' | 'cancelText' | 'itemHeight' | 'visibleCount'> & E<'Change' | 'Confirm' | 'Cancel'>>;
export declare const AfCascadePicker: DefineComponent<P<'tree' | 'values' | 'title' | 'confirmText' | 'cancelText' | 'itemHeight' | 'visibleCount'> & E<'Change' | 'Confirm' | 'Cancel'>>;
export declare const AfDropdown: DefineComponent<P<'options' | 'value' | 'placeholder' | 'triggerClass' | 'disabled'> & E<'Select' | 'Close'>>;
export declare const AfImg: DefineComponent<P<'src' | 'alt' | 'placeholderSrc' | 'failSrc' | 'variant' | 'rootMargin' | 'lazy'> & E<'Load' | 'Error'>>;
export declare const AfBacktop: DefineComponent<P<'threshold' | 'target' | 'text' | 'ariaLabelText' | 'position'> & E<'Click'>>;
export declare const AfBadge: DefineComponent<P<'content' | 'max' | 'dot' | 'color'>>;
export declare const AfCalendar: DefineComponent<P<'value' | 'month' | 'min' | 'max'> & E<'Select' | 'Monthchange'>>;
export declare const AfSwitch: DefineComponent<P<'checked' | 'disabled' | 'loading' | 'size'> & E<'Change'>>;
export declare const AfSearchBar: DefineComponent<P<'value' | 'placeholder' | 'clearable' | 'debounce'> & E<'Input' | 'Search' | 'Clear'>>;
export declare const AfSkeletonPage: DefineComponent<P<'variant'>>;
export declare const AfUpload: DefineComponent<P<'accept' | 'multiple' | 'maxSize' | 'maxCount' | 'buttonText' | 'ariaLabelText'> & E<'Change' | 'Error'>>;
export declare const AfNavbar: DefineComponent<P<'title' | 'showBack' | 'backText' | 'backAriaLabel'> & E<'Back'>>;
export declare const AfTabbar: DefineComponent<P<'tabs' | 'activeIndex' | 'fixed' | 'ariaLabel'> & E<'Change'>>;
export declare const AfStepper: DefineComponent<P<'value' | 'min' | 'max' | 'step' | 'disabled' | 'ariaLabel'> & E<'Change'>>;
export declare const AfField: DefineComponent<P<'label' | 'icon' | 'type' | 'inputType' | 'value' | 'placeholder' | 'help' | 'error' | 'disabled' | 'readonly' | 'ariaLabel'> & E<'Input' | 'Change'>>;
export declare const AfPullRefresh: DefineComponent<P<'refreshing'> & E<'Refresh'>>;
export declare const AfSwipeCell: DefineComponent<P<'disabled'> & E<'Action'>>;
export declare const AfRate: DefineComponent<P<'value' | 'max' | 'readonly' | 'size' | 'label'> & E<'Change'>>;
