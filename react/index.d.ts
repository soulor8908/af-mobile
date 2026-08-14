// AIFlow UI —— React 18 包装层类型声明
// 数据 prop 通过 property 同步到 Web Component；事件回调接收 e.detail（结构化数据，类型用 unknown 表示不虚构）
// 非组件 prop（className/id/style/data-*/aria-*）透传为 attribute
import type { ReactElement, HTMLAttributes } from 'react';

type P<T extends string> = Partial<Record<T, unknown>>;
type E<T extends string> = Partial<Record<`on${T}`, (detail: unknown) => void>>;
type Attrs = HTMLAttributes<HTMLElement> & { className?: string };

export declare const AfList: (props: P<'data' | 'pageSize' | 'itemHeight' | 'buffer' | 'mode' | 'refresh' | 'loading' | 'emptyText' | 'height' | 'totalCount'> & E<'Loadmore' | 'Refresh' | 'Itemclick'> & Attrs) => ReactElement;
export declare const AfSwiper: (props: P<'activeIndex' | 'autoplay' | 'loop' | 'duration' | 'showDots' | 'disabled'> & E<'Change'> & Attrs) => ReactElement;
export declare const AfTabs: (props: P<'tabs' | 'activeIndex' | 'variant' | 'fixed'> & E<'Change'> & Attrs) => ReactElement;
export declare const AfDialog: (props: P<'title' | 'closeOnEsc' | 'closeOnBackdrop' | 'variant'> & E<'Open' | 'Close'> & Attrs) => ReactElement;
export declare const AfToast: (props: P<'duration'> & E<'Dismiss'> & Attrs) => ReactElement;
export declare const AfActionSheet: (props: P<'options' | 'title' | 'showCancel' | 'cancelText'> & E<'Select' | 'Close' | 'Open'> & Attrs) => ReactElement;
export declare const AfPicker: (props: P<'columns' | 'values' | 'title' | 'confirmText' | 'cancelText' | 'itemHeight' | 'visibleCount'> & E<'Change' | 'Confirm' | 'Cancel'> & Attrs) => ReactElement;
export declare const AfCascadePicker: (props: P<'tree' | 'values' | 'title' | 'confirmText' | 'cancelText' | 'itemHeight' | 'visibleCount'> & E<'Change' | 'Confirm' | 'Cancel'> & Attrs) => ReactElement;
export declare const AfDropdown: (props: P<'options' | 'value' | 'placeholder' | 'triggerClass' | 'disabled'> & E<'Select' | 'Close'> & Attrs) => ReactElement;
export declare const AfImg: (props: P<'src' | 'alt' | 'placeholderSrc' | 'failSrc' | 'variant' | 'rootMargin' | 'lazy'> & E<'Load' | 'Error'> & Attrs) => ReactElement;
export declare const AfBacktop: (props: P<'threshold' | 'target' | 'text' | 'ariaLabelText' | 'position'> & E<'Click'> & Attrs) => ReactElement;
export declare const AfBadge: (props: P<'content' | 'max' | 'dot' | 'color'> & Attrs) => ReactElement;
export declare const AfCalendar: (props: P<'value' | 'month' | 'min' | 'max'> & E<'Select' | 'Monthchange'> & Attrs) => ReactElement;
export declare const AfSwitch: (props: P<'checked' | 'disabled' | 'loading' | 'size'> & E<'Change'> & Attrs) => ReactElement;
export declare const AfSearchBar: (props: P<'value' | 'placeholder' | 'clearable' | 'debounce'> & E<'Input' | 'Search' | 'Clear'> & Attrs) => ReactElement;
export declare const AfSkeletonPage: (props: P<'variant'> & Attrs) => ReactElement;
export declare const AfUpload: (props: P<'accept' | 'multiple' | 'maxSize' | 'maxCount' | 'buttonText' | 'ariaLabelText'> & E<'Change' | 'Error'> & Attrs) => ReactElement;
export declare const AfNavbar: (props: P<'title' | 'showBack' | 'backText' | 'backAriaLabel'> & E<'Back'> & Attrs) => ReactElement;
export declare const AfTabbar: (props: P<'tabs' | 'activeIndex' | 'fixed' | 'ariaLabel'> & E<'Change'> & Attrs) => ReactElement;
export declare const AfStepper: (props: P<'value' | 'min' | 'max' | 'step' | 'disabled' | 'ariaLabel'> & E<'Change'> & Attrs) => ReactElement;
export declare const AfField: (props: P<'label' | 'icon' | 'type' | 'inputType' | 'value' | 'placeholder' | 'help' | 'error' | 'disabled' | 'readonly' | 'ariaLabel'> & E<'Input' | 'Change'> & Attrs) => ReactElement;
export declare const AfPullRefresh: (props: P<'refreshing'> & E<'Refresh'> & Attrs) => ReactElement;
export declare const AfSwipeCell: (props: P<'disabled'> & E<'Action'> & Attrs) => ReactElement;
export declare const AfRate: (props: P<'value' | 'max' | 'readonly' | 'size' | 'label'> & E<'Change'> & Attrs) => ReactElement;
export declare const AfNoticeBar: (props: P<'text' | 'scroll'> & Attrs) => ReactElement;
