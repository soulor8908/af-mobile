// AIFlow UI —— af-data 数据源组件
// 声明式数据获取：<af-data src="/api/list" ref="ds"></af-data>
// 内部用 fetch.js 获取，通过 :bind 下发数据（refName.field 引用）
// Light DOM（无渲染，仅数据载体），recipes.css 用元素选择器隐藏 display:none
import { AfElement } from '../lib/af-element.js';
import { fetchPage } from '../lib/fetch.js';
import { signal } from '../lib/state.js';
import { registerDataRef, unregisterDataRef } from '../lib/data-ref.js';

export class AfData extends AfElement {
  static useShadow = false;

  mounted() {
    this._dataSignal = signal(null);
    this._loadingSignal = signal(false);
    this._errorSignal = signal(null);

    if (this.ref) {
      registerDataRef(this.ref, () => ({
        data: this._dataSignal(),
        loading: this._loadingSignal(),
        error: this._errorSignal(),
        total: this._dataSignal()?.length ?? 0,
      }));
    }
    if (this.src) this._fetch();
  }

  async _fetch() {
    this._loadingSignal.set(true);
    this._errorSignal.set(null);
    try {
      const data = await fetchPage(this.src, {
        cache: this.cache,
        cacheTtl: this.cacheTtl,
      });
      this._dataSignal.set(data);
      this.emit('af-data:load', { data });
    } catch (err) {
      this._errorSignal.set(err);
      this.emit('af-data:error', { error: err });
    } finally {
      this._loadingSignal.set(false);
    }
  }

  /** 手动重新拉取 */
  refresh() { return this._fetch(); }

  /** 获取当前数据（非响应式读取） */
  getData() { return this._dataSignal(); }
  getLoading() { return this._loadingSignal(); }
  getError() { return this._errorSignal(); }

  onAttributeChange(name) {
    // src 变化时重新拉取（首次 mounted 已处理）
    if (name === 'src' && this._dataSignal) this._fetch();
  }

  unmounted() {
    if (this.ref) unregisterDataRef(this.ref);
  }
}

AfElement.defineProp(AfData.prototype, 'src', { type: String });
AfElement.defineProp(AfData.prototype, 'ref', { type: String });
AfElement.defineProp(AfData.prototype, 'cache', { type: Boolean, default: false });
AfElement.defineProp(AfData.prototype, 'cacheTtl', { attr: 'cache-ttl', type: Number, default: 5000 });
