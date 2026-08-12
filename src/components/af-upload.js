// AIFlow UI —— af-upload：文件上传
// Light DOM，原生 <input type="file"> + 缩略图预览，复用 L2 .btn / .thumb / .upload-trigger / .upload-grid
// 职责：文件选择 + 大小/数量/类型校验 + 图片预览（URL.createObjectURL）+ revokeObjectURL 防泄漏
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

export class AfUpload extends AfElement {
  static useShadow = false;
  static i18n = {
    '.upload-grid':           ['aria-label', 'up.pv'],
    'button.btn':             ['',           'up.btn', 'buttonText'],
    '.upload-trigger button': ['aria-label', 'up.al', 'ariaLabelText'],
  };

  constructor() {
    super();
    // ObjectURL 句柄：卸载 / 重选 / clear() 时统一 revoke，防内存泄漏
    this._urls = [];
  }

  mounted() {
    this.innerHTML = `
      <div class="upload-trigger">
        <button class="btn btn-ghost" type="button"></button>
        <input class="upload-input" type="file" accept="${esc(this.accept)}"${this.multiple ? ' multiple' : ''} hidden>
      </div>
      <div class="upload-grid" role="list"></div>
    `;
    this._input = this.$('.upload-input');
    this._grid = this.$('.upload-grid');
    this._bindClick();
    this._bindChange();
  }

  _bindClick() {
    this._onClick = () => this._input.click();
    this.$('.btn').addEventListener('click', this._onClick);
  }

  _bindChange() {
    this._onChange = () => this._handleFiles([...this._input.files]);
    this._input.addEventListener('change', this._onChange);
  }

  _handleFiles(files) {
    const errors = [];
    // 类型校验：accept 支持 image/*、.jpg、image/png 三类语法
    if (this.accept) {
      const acceptList = this.accept.split(',').map(s => s.trim()).filter(Boolean);
      files = files.filter((f) => {
        const ok = acceptList.some((t) => {
          if (t.startsWith('.')) return f.name.toLowerCase().endsWith(t.toLowerCase());
          if (t.endsWith('/*')) return f.type.startsWith(t.slice(0, -1));
          return f.type === t;
        });
        if (!ok) errors.push({ name: f.name, size: f.size, reason: 'type' });
        return ok;
      });
    }
    // 大小校验（maxSize=0 不限）
    if (this.maxSize > 0) {
      files = files.filter((f) => {
        const ok = f.size <= this.maxSize;
        if (!ok) errors.push({ name: f.name, size: f.size, reason: 'size' });
        return ok;
      });
    }
    // 数量校验（maxCount=0 不限）：超出部分整批丢弃并报错
    if (this.maxCount > 0 && files.length > this.maxCount) {
      for (const f of files.slice(this.maxCount)) {
        errors.push({ name: f.name, size: f.size, reason: 'count' });
      }
      files = files.slice(0, this.maxCount);
    }

    // 释放旧 URL（重选场景）
    this._revokeAll();
    this._urls = [];

    // 生成预览（图片用 ObjectURL + .thumb，其他文件用 .thumb 文本占位）
    const previews = files.map((f) => {
      const isImg = f.type.startsWith('image/');
      const url = isImg ? URL.createObjectURL(f) : '';
      if (url) this._urls.push(url);
      return { file: f, url, name: f.name, size: f.size };
    });
    this._renderGrid(previews);
    this.emit('af-upload:change', { files: previews, errors });
    if (errors.length) this.emit('af-upload:error', { errors });
  }

  _renderGrid(previews) {
    if (!this._grid) return;
    if (!previews.length) { this._grid.innerHTML = ''; return; }
    this._grid.innerHTML = previews.map((p) => {
      if (p.url) {
        return `<img class="thumb" role="listitem" src="${esc(p.url)}" alt="${esc(p.name)}">`;
      }
      return `<div class="thumb" role="listitem" aria-label="${esc(p.name)}">${esc(p.name)}</div>`;
    }).join('');
  }

  _revokeAll() {
    for (const u of this._urls) URL.revokeObjectURL(u);
  }

  clear() {
    this._revokeAll();
    this._urls = [];
    if (this._input) this._input.value = '';
    if (this._grid) this._grid.innerHTML = '';
    this.emit('af-upload:change', { files: [], errors: [] });
  }

  onAttributeChange(name, oldVal, newVal) {
    if (!this._input) return;
    if (name === 'accept') this._input.setAttribute('accept', newVal);
    else if (name === 'multiple') {
      if (this.multiple) this._input.setAttribute('multiple', '');
      else this._input.removeAttribute('multiple');
    } else if (name === 'button-text' || name === 'aria-label') {
      this._applyI18n();
    }
  }

  unmounted() {
    this._revokeAll();
    this.$('.btn')?.removeEventListener('click', this._onClick);
    this._input?.removeEventListener('change', this._onChange);
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfUpload.prototype, 'accept', { type: String, default: 'image/*' });
AfElement.defineProp(AfUpload.prototype, 'multiple', { type: Boolean, default: true });
AfElement.defineProp(AfUpload.prototype, 'maxSize', { attr: 'max-size', type: Number, default: 0 });
AfElement.defineProp(AfUpload.prototype, 'maxCount', { attr: 'max-count', type: Number, default: 0 });
AfElement.defineProp(AfUpload.prototype, 'buttonText', { attr: 'button-text', type: String, default: null });
AfElement.defineProp(AfUpload.prototype, 'ariaLabelText', { attr: 'aria-label', type: String, default: null });
