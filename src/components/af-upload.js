// af-mobile UI —— af-upload：文件上传（T0.2 Vant 对齐宫格化）
// Light DOM，80×80 占位块进网格首项 + 右上 14px 黑角标删除 + loading/失败遮罩
// 职责：文件选择 + 大小/数量/类型校验 + 图片预览（URL.createObjectURL）+ revokeObjectURL 防泄漏
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';
import { withI18n } from '../lib/with-i18n.js';

export class AfUpload extends withI18n(AfElement) {
  static useShadow = false;
  static i18n = {
    '.upload-gd': ['aria-label', 'up.pv'],
    '.up-add':    ['aria-label', 'up.al', 'ariaLabelText'],
    '.up-txt':    ['',           'up.btn', 'buttonText'],
  };

  constructor() {
    super();
    // ObjectURL 句柄：卸载 / 重选 / clear() 时统一 revoke，防内存泄漏
    this._urls = [];
    // 文件状态列表：{file,url,name,size,status?('uploading'|'failed'),message?}
    this._files = [];
  }

  mounted() {
    this.innerHTML = `
      <div class="upload-gd" role="list"></div>
      <input class="upload-input" type="file" accept="${esc(this.accept)}"${this.multiple ? ' multiple' : ''} hidden>
    `;
    this._input = this.$('.upload-input');
    this._grid = this.$('.upload-gd');
    this._bindClick();
    this._bindChange();
    this._bindDelete();
    this._renderGrid(); // 网格首项占位块
  }

  _bindClick() {
    this._onClick = () => {
      if (this.disabled) return;
      this._input.click();
    };
    this._listen(this._grid, 'click', (e) => {
      if (e.target.closest('.up-add')) this._onClick();
    });
  }

  _bindChange() {
    this._onChange = () => this._handleFiles([...this._input.files]);
    this._listen(this._input, 'change', this._onChange);
  }

  // 删除角标：事件委托（重渲染无需重绑）
  _bindDelete() {
    this._onDelete = (e) => {
      const btn = e.target.closest('.up-del');
      if (!btn || this.disabled) return;
      e.stopPropagation();
      const idx = Number(btn.dataset.idx);
      const file = this._files[idx];
      if (!file) return;
      if (file.url) URL.revokeObjectURL(file.url);
      this._urls = this._urls.filter((u) => u !== file.url);
      this._files.splice(idx, 1);
      this._renderGrid();
      this.emit('af-upload:delete', { index: idx, file });
    };
    this._listen(this._grid, 'click', this._onDelete);
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
    // 数量校验（maxCount=0 不限；Vant 语义：占位块不占名额，达上限后隐藏占位块）
    if (this.maxCount > 0 && files.length > this.maxCount) {
      for (const f of files.slice(this.maxCount)) {
        errors.push({ name: f.name, size: f.size, reason: 'count' });
      }
      files = files.slice(0, this.maxCount);
    }

    // 释放旧 URL（重选场景）
    this._revokeAll();
    this._urls = [];

    // 生成预览（图片用 ObjectURL，其他文件用文本占位）
    this._files = files.map((f) => {
      const isImg = f.type.startsWith('image/');
      const url = isImg ? URL.createObjectURL(f) : '';
      if (url) this._urls.push(url);
      return { file: f, url, name: f.name, size: f.size };
    });
    this._renderGrid();
    this.emit('af-upload:change', { files: [...this._files], errors });
    if (errors.length) this.emit('af-upload:error', { errors });
  }

  // 消费端通道：更新第 idx 个文件的上传状态（'uploading' | 'failed' | 'done'）并渲染遮罩
  updateStatus(index, status, message = '') {
    const file = this._files[index];
    if (!file) return;
    file.status = status;
    file.message = message;
    this._renderGrid();
  }

  _renderGrid() {
    if (!this._grid) return;
    // 网格首项为占位块（Vant：+ 号 + 可选文字；达 maxCount 上限后隐藏；disabled 态样式由 CSS 控制）
    const full = this.maxCount > 0 && this._files.length >= this.maxCount;
    const addHtml = full ? '' : `<button class="up-add" type="button" aria-label="添加"><span class="up-ico" aria-hidden="true">+</span>${this.buttonText ? `<span class="up-txt">${esc(this.buttonText)}</span>` : ''}</button>`;
    const itemsHtml = this._files.map((p, i) => {
      const media = p.url
        ? `<img class="up-thumb" role="listitem" src="${esc(p.url)}" alt="${esc(p.name)}">`
        : `<div class="up-thumb" role="listitem" aria-label="${esc(p.name)}">${esc(p.name)}</div>`;
      const mask = p.status === 'uploading'
        ? `<div class="up-mask">${esc(p.message || '...')}</div>`
        : p.status === 'failed'
          ? `<div class="up-mask">${esc(p.message || '失败')}</div>`
          : '';
      return `<div class="up-item">${media}${mask}<button class="up-del" type="button" data-idx="${i}" aria-label="删除">×</button></div>`;
    }).join('');
    this._grid.innerHTML = addHtml + itemsHtml;
  }

  _revokeAll() {
    for (const u of this._urls) URL.revokeObjectURL(u);
  }

  clear() {
    this._revokeAll();
    this._urls = [];
    this._files = [];
    if (this._input) this._input.value = '';
    if (this._grid) this._renderGrid();
    this.emit('af-upload:change', { files: [], errors: [] });
  }

  onAttributeChange(name, oldVal, newVal) {
    if (!this._input) return;
    if (name === 'accept') this._input.setAttribute('accept', newVal);
    else if (name === 'multiple') {
      if (this.multiple) this._input.setAttribute('multiple', '');
      else this._input.removeAttribute('multiple');
    } else if (name === 'button-text' || name === 'aria-label') {
      // disabled 态样式由 CSS 选择器 af-upload[disabled] 控制，无需 JS 重渲染
      this._applyI18n();
      this._renderGrid();
    }
  }

  unmounted() {
    this._revokeAll();
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfUpload.prototype, 'accept', 'image/*');
AfElement.defineProp(AfUpload.prototype, 'multiple', true);
AfElement.defineProp(AfUpload.prototype, 'maxSize', 0);
AfElement.defineProp(AfUpload.prototype, 'maxCount', 0);
AfElement.defineProp(AfUpload.prototype, 'disabled', false);
AfElement.defineProp(AfUpload.prototype, 'buttonText', null);
AfElement.defineProp(AfUpload.prototype, 'ariaLabelText', { attr: 'aria-label', type: String, default: null });
