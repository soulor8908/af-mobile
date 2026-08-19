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

describe('af-upload 基础渲染', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染 trigger + 隐藏 input + 预览容器', () => {
    const el = makeUpload();
    expect(el.$('.upload-tg')).not.toBeNull();
    expect(el.$('.upload-input')).not.toBeNull();
    expect(el.$('.upload-input').hidden).toBe(true);
    expect(el.$('.upload-gd')).not.toBeNull();
    expect(el.$('.btn')).not.toBeNull();
  });

  it('accept / multiple 透传到原生 input', () => {
    const el = makeUpload({ accept: 'image/png', multiple: false });
    expect(el.$('.upload-input').getAttribute('accept')).toBe('image/png');
    expect(el.$('.upload-input').hasAttribute('multiple')).toBe(false);
  });

  it('multiple=true 时 input 带 multiple 属性', () => {
    const el = makeUpload({ multiple: true });
    expect(el.$('.upload-input').hasAttribute('multiple')).toBe(true);
  });

  it('buttonText 传到按钮文案', () => {
    const el = makeUpload({ buttonText: '上传图片' });
    expect(el.$('.btn').textContent).toBe('上传图片');
  });

  it('aria-label 传到按钮', () => {
    const el = makeUpload({ ariaLabelText: '上传头像' });
    expect(el.$('.btn').getAttribute('aria-label')).toBe('上传头像');
  });

  it('upload-gd 初始为空（:empty 不显示）', () => {
    const el = makeUpload();
    expect(el.$('.upload-gd').children.length).toBe(0);
  });
});

describe('af-upload 文件选择', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('点击按钮触发 input.click', () => {
    const el = makeUpload();
    const spy = vi.spyOn(el.$('.upload-input'), 'click');
    el.$('.btn').click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('选择图片文件触发 af-upload:change + 渲染缩略图', () => {
    const el = makeUpload({ accept: 'image/*' });
    const handler = vi.fn();
    el.addEventListener('af-upload:change', handler);

    const file = makeFile('a.jpg', 'image/jpeg', 100);
    const input = el.$('.upload-input');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.files.length).toBe(1);
    expect(detail.files[0].name).toBe('a.jpg');
    expect(detail.files[0].url).toBeTruthy(); // ObjectURL 已生成
    const thumbs = el.$$('.thumb');
    expect(thumbs.length).toBe(1);
    expect(thumbs[0].tagName).toBe('IMG');
    expect(thumbs[0].getAttribute('alt')).toBe('a.jpg');
  });

  it('非图片文件用 div.thumb 文本占位（无 ObjectURL）', () => {
    const el = makeUpload({ accept: '' });
    const file = makeFile('doc.pdf', 'application/pdf', 100);
    const input = el.$('.upload-input');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));

    const thumbs = el.$$('.thumb');
    expect(thumbs.length).toBe(1);
    expect(thumbs[0].tagName).toBe('DIV');
    expect(thumbs[0].textContent).toBe('doc.pdf');
    expect(thumbs[0].getAttribute('role')).toBe('listitem');
  });

  it('类型不匹配触发 af-upload:error（reason:type）', () => {
    const el = makeUpload({ accept: 'image/*' });
    const errHandler = vi.fn();
    el.addEventListener('af-upload:error', errHandler);
    const file = makeFile('a.pdf', 'application/pdf', 100);

    const input = el.$('.upload-input');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));

    expect(errHandler).toHaveBeenCalledTimes(1);
    const detail = errHandler.mock.calls[0][0].detail;
    expect(detail.errors[0].reason).toBe('type');
    expect(detail.errors[0].name).toBe('a.pdf');
    expect(el.$$('.thumb').length).toBe(0);
  });

  it('单文件超 maxSize 触发 af-upload:error（reason:size）', () => {
    const el = makeUpload({ accept: '', maxSize: 50 });
    const errHandler = vi.fn();
    el.addEventListener('af-upload:error', errHandler);
    const big = makeFile('big.jpg', 'image/jpeg', 200);

    const input = el.$('.upload-input');
    Object.defineProperty(input, 'files', { value: [big], configurable: true });
    input.dispatchEvent(new Event('change'));

    expect(errHandler).toHaveBeenCalledTimes(1);
    expect(errHandler.mock.calls[0][0].detail.errors[0].reason).toBe('size');
    expect(el.$$('.thumb').length).toBe(0);
  });

  it('超过 maxCount 截断 + 触发 reason:count', () => {
    const el = makeUpload({ accept: '', maxCount: 2 });
    const changeHandler = vi.fn();
    const errHandler = vi.fn();
    el.addEventListener('af-upload:change', changeHandler);
    el.addEventListener('af-upload:error', errHandler);

    const files = [
      makeFile('a.jpg', 'image/jpeg', 50),
      makeFile('b.jpg', 'image/jpeg', 50),
      makeFile('c.jpg', 'image/jpeg', 50),
    ];
    const input = el.$('.upload-input');
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new Event('change'));

    expect(changeHandler.mock.calls[0][0].detail.files.length).toBe(2);
    expect(errHandler.mock.calls[0][0].detail.errors[0].reason).toBe('count');
    expect(errHandler.mock.calls[0][0].detail.errors[0].name).toBe('c.jpg');
  });

  it('accept 支持扩展名语法 .jpg', () => {
    const el = makeUpload({ accept: '.jpg' });
    const ok = makeFile('a.jpg', 'image/jpeg', 50);
    const bad = makeFile('b.png', 'image/png', 50);
    const input = el.$('.upload-input');
    Object.defineProperty(input, 'files', { value: [ok, bad], configurable: true });
    input.dispatchEvent(new Event('change'));

    const change = el.$$('.thumb');
    expect(change.length).toBe(1); // 只有 a.jpg 通过
  });

  it('重选时旧 ObjectURL 被 revoke（防泄漏）', () => {
    const el = makeUpload({ accept: 'image/*' });
    const file1 = makeFile('a.jpg', 'image/jpeg', 50);
    const input = el.$('.upload-input');
    Object.defineProperty(input, 'files', { value: [file1], configurable: true });
    input.dispatchEvent(new Event('change'));
    const url1 = el._urls[0];

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const file2 = makeFile('b.jpg', 'image/jpeg', 50);
    Object.defineProperty(input, 'files', { value: [file2], configurable: true });
    input.dispatchEvent(new Event('change'));

    expect(revokeSpy).toHaveBeenCalledWith(url1);
  });

  it('clear() 释放 URL + 清空 grid + 触发 change', () => {
    const el = makeUpload({ accept: 'image/*' });
    const file = makeFile('a.jpg', 'image/jpeg', 50);
    const input = el.$('.upload-input');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const handler = vi.fn();
    el.addEventListener('af-upload:change', handler);

    el.clear();
    expect(revokeSpy).toHaveBeenCalled();
    expect(el.$$('.thumb').length).toBe(0);
    expect(el.$('.upload-input').value).toBe('');
    expect(handler.mock.calls[0][0].detail.files).toEqual([]);
  });
});

describe('af-upload 属性变化与清理', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('onAttributeChange：accept 变化更新 input', () => {
    const el = makeUpload();
    el.setAttribute('accept', 'image/png');
    expect(el.$('.upload-input').getAttribute('accept')).toBe('image/png');
  });

  it('onAttributeChange：button-text 变化更新按钮文案', () => {
    const el = makeUpload();
    el.setAttribute('button-text', '上传');
    expect(el.$('.btn').textContent).toBe('上传');
  });

  it('onAttributeChange：multiple=false 移除属性', () => {
    const el = makeUpload({ multiple: true });
    el.setAttribute('multiple', 'false');
    expect(el.$('.upload-input').hasAttribute('multiple')).toBe(false);
  });

  it('unmounted 触发 revokeObjectURL（防泄漏）', () => {
    const el = makeUpload({ accept: 'image/*' });
    const file = makeFile('a.jpg', 'image/jpeg', 50);
    const input = el.$('.upload-input');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    document.body.removeChild(el);
    expect(revokeSpy).toHaveBeenCalled();
  });

  it('XSS：filename 含 HTML 被转义，不创建实际 script 元素', () => {
    const el = makeUpload({ accept: '' });
    const evil = makeFile('<script>alert(1)<\/script>.txt', 'text/plain', 10);
    const input = el.$('.upload-input');
    Object.defineProperty(input, 'files', { value: [evil], configurable: true });
    input.dispatchEvent(new Event('change'));

    expect(el.querySelector('script')).toBeNull();
    expect(el.$('.thumb').textContent).toContain('<script>');
  });

  it('ARIA：grid 有 role=list', () => {
    const el = makeUpload();
    expect(el.$('.upload-gd').getAttribute('role')).toBe('list');
  });
});
