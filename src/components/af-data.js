// af-mobile UI —— af-data 数据源组件
// 声明式数据获取：<af-data src="/api/list" ref="ds"></af-data>
// 内部用 fetch.js 获取，通过 :bind 下发数据（refName.field 引用）
// data-path / total-field：适配对象形响应（如 { data: [...], total: 100 } 或 { list: [...], meta: {...} }）
// Light DOM（无渲染，仅数据载体），recipes.css 用元素选择器隐藏 display:none
import { AfElement } from '../lib/af-element.js';
import { fetchPage } from '../lib/fetch.js';
import { signal } from '../lib/state.js';
import { registerDataRef, unregisterDataRef } from '../lib/data-ref.js';

// 按点分路径取嵌套值：getPath(obj, 'a.b.c')；path 为空返回 obj 本身
function getPath(obj, path) {
  if (!path) return obj;
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

export class AfData extends AfElement {
  static useShadow = false;

  mounted() {
    this._dataSignal = signal(null);
    this._totalSignal = signal(0);
    this._loadingSignal = signal(false);
    this._errorSignal = signal(null);

    if (this.ref) {
      registerDataRef(this.ref, () => ({
        data: this._dataSignal(),
        loading: this._loadingSignal(),
        error: this._errorSignal(),
        total: this._totalSignal(),
      }));
    }
    if (this.src) this._fetch();
  }

  async _fetch() {
    this._loadingSignal.set(true);
    this._errorSignal.set(null);
    try {
      const raw = await fetchPage(this.src, {
        cache: this.cache,
        cacheTtl: this.cacheTtl,
      });
      const data = getPath(raw, this.dataPath);
      this._dataSignal.set(data);
      this._totalSignal.set(this._resolveTotal(raw, data));
      this.emit('af-data:load', { data });
    } catch (err) {
      this._errorSignal.set(err);
      this.emit('af-data:error', { error: err });
    } finally {
      this._loadingSignal.set(false);
    }
  }

  // total 优先级：total-field 指向的数值 > 数组长度 > 0
  _resolveTotal(raw, data) {
    if (this.totalField) {
      const t = getPath(raw, this.totalField);
      if (typeof t === 'number') return t;
    }
    return Array.isArray(data) ? data.length : 0;
  }

  /** 手动重新拉取 */
  refresh() { return this._fetch(); }

  /** 获取当前数据（非响应式读取） */
  getData() { return this._dataSignal(); }
  getTotal() { return this._totalSignal(); }
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

AfElement.defineProp(AfData.prototype, 'src', null);
AfElement.defineProp(AfData.prototype, 'ref', null);
AfElement.defineProp(AfData.prototype, 'dataPath', null);
AfElement.defineProp(AfData.prototype, 'totalField', null);
AfElement.defineProp(AfData.prototype, 'cache', false);
AfElement.defineProp(AfData.prototype, 'cacheTtl', 5000);
