import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfUpload } from '../src/components/af-upload.js';
customElements.define('af-upload', AfUpload);

function makeUpload(props = {}) {
  const el = new AfUpload();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

function makeFile(name, type, size = 1024) {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
}

function selectFiles(el, files) {
  const input = el.$('.upload-input');
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new Event('change'));
}

describe('af-upload 基础渲染（T0.2 宫格化）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染隐藏 input + 预览容器（无独立上传按钮）', () => {
    const el = makeUpload();
    expect(el.$('.upload-input')).not.toBeNull();
    expect(el.$('.upload-input').hidden).toBe(true);
    expect(el.$('.upload-gd')).not.toBeNull();
    expect(el.$('.btn')).toBeNull();
  });

  it('网格首项为 80×80 占位块（up-add，+ 号图标）', () => {
    const el = makeUpload();
    const add = el.$('.up-add');
    expect(add).not.toBeNull();
    expect(add.tagName).toBe('BUTTON');
    expect(el.$('.up-ico').textContent).toBe('+');
    // aria-label 由 i18n 字典（up.al）接管，默认中文文案
    expect(el.$('.up-add').getAttribute('aria-label')).toBe('上传文件');
  });

  it('accept / multiple 透传到原生 input', () => {
    const el = makeUpload({ accept: 'image/png', multiple: false });
    expect(el.$('.upload-input').getAttribute('accept')).toBe('image/png');
    expect(el.$('.upload-input').hasAttribute('multiple')).toBe(false);
  });

  it('buttonText 渲染为占位块内文字（up-txt）', () => {
    const el = makeUpload({ buttonText: '上传图片' });
    expect(el.$('.up-txt').textContent).toBe('上传图片');
  });

  it('aria-label 透传到占位块', () => {
    const el = makeUpload({ ariaLabelText: '上传头像' });
    expect(el.$('.up-add').getAttribute('aria-label')).toBe('上传头像');
  });

  it('disabled 态：占位块点击不触发 input.click，删除角标不可删', () => {
    const el = makeUpload({ accept: '', disabled: true });
    const spy = vi.spyOn(el.$('.upload-input'), 'click');
    el.$('.up-add').click();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('af-upload 文件选择', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('点击占位块触发 input.click', () => {
    const el = makeUpload();
    const spy = vi.spyOn(el.$('.upload-input'), 'click');
    el.$('.up-add').click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('选择图片文件触发 af-upload:change + 渲染 up-thumb 缩略图', () => {
    const el = makeUpload({ accept: 'image/*' });
    const handler = vi.fn();
    el.addEventListener('af-upload:change', handler);

    selectFiles(el, [makeFile('a.jpg', 'image/jpeg', 100)]);

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.files.length).toBe(1);
    expect(detail.files[0].name).toBe('a.jpg');
    expect(detail.files[0].url).toBeTruthy(); // ObjectURL 已生成
    const thumbs = el.$$('.up-thumb');
    expect(thumbs.length).toBe(1);
    expect(thumbs[0].tagName).toBe('IMG');
    expect(thumbs[0].getAttribute('alt')).toBe('a.jpg');
  });

  it('非图片文件用 div.up-thumb 文本占位（无 ObjectURL）', () => {
    const el = makeUpload({ accept: '' });
    selectFiles(el, [makeFile('doc.pdf', 'application/pdf', 100)]);

    const thumbs = el.$$('.up-thumb');
    expect(thumbs.length).toBe(1);
    expect(thumbs[0].tagName).toBe('DIV');
    expect(thumbs[0].textContent).toBe('doc.pdf');
    expect(thumbs[0].getAttribute('role')).toBe('listitem');
  });

  it('类型不匹配触发 af-upload:error（reason:type）', () => {
    const el = makeUpload({ accept: 'image/*' });
    const errHandler = vi.fn();
    el.addEventListener('af-upload:error', errHandler);

    selectFiles(el, [makeFile('a.pdf', 'application/pdf', 100)]);

    expect(errHandler).toHaveBeenCalledTimes(1);
    const detail = errHandler.mock.calls[0][0].detail;
    expect(detail.errors[0].reason).toBe('type');
    expect(detail.errors[0].name).toBe('a.pdf');
    expect(el.$$('.up-item').length).toBe(0);
  });

  it('单文件超 maxSize 触发 af-upload:error（reason:size）', () => {
    const el = makeUpload({ accept: '', maxSize: 50 });
    const errHandler = vi.fn();
    el.addEventListener('af-upload:error', errHandler);

    selectFiles(el, [makeFile('big.jpg', 'image/jpeg', 200)]);

    expect(errHandler).toHaveBeenCalledTimes(1);
    expect(errHandler.mock.calls[0][0].detail.errors[0].reason).toBe('size');
    expect(el.$$('.up-item').length).toBe(0);
  });

  it('超过 maxCount 截断 + 触发 reason:count；达上限后隐藏占位块', () => {
    const el = makeUpload({ accept: '', maxCount: 2 });
    const changeHandler = vi.fn();
    const errHandler = vi.fn();
    el.addEventListener('af-upload:change', changeHandler);
    el.addEventListener('af-upload:error', errHandler);

    selectFiles(el, [
      makeFile('a.jpg', 'image/jpeg', 50),
      makeFile('b.jpg', 'image/jpeg', 50),
      makeFile('c.jpg', 'image/jpeg', 50),
    ]);

    expect(changeHandler.mock.calls[0][0].detail.files.length).toBe(2);
    expect(errHandler.mock.calls[0][0].detail.errors[0].reason).toBe('count');
    expect(errHandler.mock.calls[0][0].detail.errors[0].name).toBe('c.jpg');
    expect(el.$$('.up-item').length).toBe(2);
    expect(el.$('.up-add')).toBeNull(); // 达上限隐藏占位块
  });

  it('accept 支持扩展名语法 .jpg', () => {
    const el = makeUpload({ accept: '.jpg' });
    selectFiles(el, [
      makeFile('a.jpg', 'image/jpeg', 50),
      makeFile('b.png', 'image/png', 50),
    ]);
    expect(el.$$('.up-item').length).toBe(1); // 只有 a.jpg 通过
  });

  it('重选时旧 ObjectURL 被 revoke（防泄漏）', () => {
    const el = makeUpload({ accept: 'image/*' });
    selectFiles(el, [makeFile('a.jpg', 'image/jpeg', 50)]);
    const url1 = el._urls[0];

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    selectFiles(el, [makeFile('b.jpg', 'image/jpeg', 50)]);

    expect(revokeSpy).toHaveBeenCalledWith(url1);
  });

  it('clear() 释放 URL + 清空 grid（保留占位块）+ 触发 change', () => {
    const el = makeUpload({ accept: 'image/*' });
    selectFiles(el, [makeFile('a.jpg', 'image/jpeg', 50)]);

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const handler = vi.fn();
    el.addEventListener('af-upload:change', handler);

    el.clear();
    expect(revokeSpy).toHaveBeenCalled();
    expect(el.$$('.up-item').length).toBe(0);
    expect(el.$('.up-add')).not.toBeNull(); // 占位块回归
    expect(el.$('.upload-input').value).toBe('');
    expect(handler.mock.calls[0][0].detail.files).toEqual([]);
  });
});

describe('af-upload 删除角标与状态遮罩（T0.2 新增）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('预览项右上渲染 up-del 黑角标；点击触发 af-upload:delete + revoke + 移除', () => {
    const el = makeUpload({ accept: 'image/*' });
    selectFiles(el, [makeFile('a.jpg', 'image/jpeg', 50), makeFile('b.jpg', 'image/jpeg', 50)]);
    expect(el.$$('.up-del').length).toBe(2);

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const handler = vi.fn();
    el.addEventListener('af-upload:delete', handler);
    el.$$('.up-del')[0].click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.index).toBe(0);
    expect(handler.mock.calls[0][0].detail.file.name).toBe('a.jpg');
    expect(revokeSpy).toHaveBeenCalledWith(expect.stringMatching(/^blob:/));
    expect(el.$$('.up-item').length).toBe(1);
  });

  it('updateStatus(uploading) 渲染上传中遮罩', () => {
    const el = makeUpload({ accept: 'image/*' });
    selectFiles(el, [makeFile('a.jpg', 'image/jpeg', 50)]);
    el.updateStatus(0, 'uploading', '上传中...');
    const mask = el.$('.up-mask');
    expect(mask).not.toBeNull();
    expect(mask.textContent).toBe('上传中...');
  });

  it('updateStatus(failed) 渲染失败遮罩', () => {
    const el = makeUpload({ accept: 'image/*' });
    selectFiles(el, [makeFile('a.jpg', 'image/jpeg', 50)]);
    el.updateStatus(0, 'failed', '上传失败');
    expect(el.$('.up-mask').textContent).toBe('上传失败');
  });

  it('updateStatus(done) 移除遮罩；无效 index 不抛错', () => {
    const el = makeUpload({ accept: 'image/*' });
    selectFiles(el, [makeFile('a.jpg', 'image/jpeg', 50)]);
    el.updateStatus(0, 'uploading', 'x');
    el.updateStatus(0, 'done');
    expect(el.$('.up-mask')).toBeNull();
    expect(() => el.updateStatus(9, 'uploading')).not.toThrow();
  });
});

describe('af-upload 属性变化与清理', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('onAttributeChange：accept 变化更新 input', () => {
    const el = makeUpload();
    el.setAttribute('accept', 'image/png');
    expect(el.$('.upload-input').getAttribute('accept')).toBe('image/png');
  });

  it('onAttributeChange：button-text 变化更新 up-txt 文案', () => {
    const el = makeUpload();
    el.setAttribute('button-text', '上传');
    expect(el.$('.up-txt').textContent).toBe('上传');
  });

  it('onAttributeChange：multiple=false 移除属性', () => {
    const el = makeUpload({ multiple: true });
    el.setAttribute('multiple', 'false');
    expect(el.$('.upload-input').hasAttribute('multiple')).toBe(false);
  });

  it('unmounted 触发 revokeObjectURL（防泄漏）', () => {
    const el = makeUpload({ accept: 'image/*' });
    selectFiles(el, [makeFile('a.jpg', 'image/jpeg', 50)]);

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    document.body.removeChild(el);
    expect(revokeSpy).toHaveBeenCalled();
  });

  it('XSS：filename 含 HTML 被转义，不创建实际 script 元素', () => {
    const el = makeUpload({ accept: '' });
    const evil = makeFile('<script>alert(1)<\/script>.txt', 'text/plain', 10);
    selectFiles(el, [evil]);

    expect(el.querySelector('script')).toBeNull();
    expect(el.$('.up-thumb').textContent).toContain('<script>');
  });

  it('ARIA：grid 有 role=list', () => {
    const el = makeUpload();
    expect(el.$('.upload-gd').getAttribute('role')).toBe('list');
  });
});
