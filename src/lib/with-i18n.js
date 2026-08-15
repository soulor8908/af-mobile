// AIFlow UI —— withI18n mixin：i18n 能力按需混入
// 用 i18n 的组件：class AfDialog extends withI18n(AfElement) {}
// 不用 i18n 的组件：class AfToast extends AfElement {}（不拉入 i18n.js，体积更小）
// 收益：基类 AfElement 不再含 i18n 逻辑（base -0.6KB），不用 i18n 的组件零成本
import { t as _t } from './i18n.js';

export function withI18n(Base) {
  return class extends Base {
    /** t() 代理：组件内部 this.t('dg.cl') 等价 t('dg.cl')，避免直接 import i18n.js */
    t(key, vars) { return _t(key, vars); }

    connectedCallback() {
      super.connectedCallback();
      // localechange 订阅（与 themechange 对称）：语言切换时 onLocaleChange → _applyI18n
      if (!this._localeHandler) {
        this._localeHandler = (e) => this.onLocaleChange?.(e.detail);
        document.documentElement.addEventListener('localechange', this._localeHandler);
      }
      this._applyI18n();
    }

    disconnectedCallback() {
      if (this._localeHandler) {
        document.documentElement.removeEventListener('localechange', this._localeHandler);
        this._localeHandler = null;
      }
      super.disconnectedCallback();
    }

    /** 语言切换回调（默认重新应用 i18n 映射表，子类可重写） */
    onLocaleChange() { this._applyI18n(); }

    /** 应用 static i18n 映射表（初次渲染 + 语言切换时调用）
     *  映射表格式：{ selector: [attr, keyOrFn, fallbackProp?, skipIfAttr?] }
     *  - selector '@' 指向 host 自身（querySelector 不支持 :host）
     *  - attr 空串 '' 表示设置 textContent
     *  - keyOrFn 为字符串时用 t(key)，为函数时调 fn(host, t, el, index)
     *  - fallbackProp 仅静态形式：host[fallbackProp] 为 truthy 时优先用 host 属性值
     *  - skipIfAttr 仅静态形式：host 有该属性时跳过
     */
    _applyI18n() {
      const map = this.constructor.i18n;
      if (!map) return;
      for (const sel in map) {
        const [attr, keyOrFn, fallback, skipIf] = map[sel];
        if (skipIf && this.hasAttribute(skipIf)) continue;
        const cv = (el, i) => typeof keyOrFn === 'function'
          ? keyOrFn(this, _t, el, i)
          : (fallback && this[fallback] ? this[fallback] : _t(keyOrFn));
        const apply = (el, i) => attr ? el.setAttribute(attr, cv(el, i)) : (el.textContent = cv(el, i));
        if (sel === '@') { apply(this, 0); continue; }
        this.$root.querySelectorAll(sel).forEach(apply);
      }
    }
  };
}
