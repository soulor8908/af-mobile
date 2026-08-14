import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfImg } from '../packages/ui/src/components/af-img.js';
customElements.define('af-img', AfImg);

function makeImg(props = {}) {
  const el = new AfImg();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-img', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('variant=thumb 添加 thumb class', () => {
    const el = makeImg({ variant: 'thumb', src: 'a.jpg' });
    expect(el.classList.contains('thumb')).toBe(true);
  });

  it('宿主 display:block 由 recipes.css af-img 规则提供（P1-4）', () => {
    const el = makeImg({ variant: 'thumb', src: 'a.jpg' });
    // display:block 由 CSS 提供，不再通过 JS style 设置（遵守 wc-light-no-style）
    expect(el.style.display).toBe('');
  });

  it('variant=avatar 添加 avatar class', () => {
    const el = makeImg({ variant: 'avatar', src: 'a.jpg' });
    expect(el.classList.contains('avatar')).toBe(true);
  });

  it('默认渲染 skeleton 占位（无 placeholderSrc）', () => {
    const el = makeImg({ src: 'a.jpg' });
    expect(el.$('.skeleton')).not.toBeNull();
    expect(el.$('img.af-img-inner')).not.toBeNull();
  });

  it('有 placeholderSrc 用图片占位', () => {
    const el = makeImg({ src: 'a.jpg', placeholderSrc: 'ph.jpg' });
    const ph = el.$('img[data-role="placeholder"]');
    expect(ph).not.toBeNull();
    expect(ph.src).toContain('ph.jpg');
  });

  it('lazy=true 默认用 IntersectionObserver 等待', () => {
    const el = makeImg({ src: 'a.jpg' });
    expect(el._observer).toBeDefined();
  });

  it('lazy=false 立即加载', () => {
    const el = makeImg({ src: 'a.jpg', lazy: false });
    expect(el._observer).toBeUndefined();
  });

  it('图片 onload 后隐藏占位 + 派发 af-img:load', () => {
    const el = makeImg({ src: 'a.jpg', lazy: false });
    const handler = vi.fn();
    el.addEventListener('af-img:load', handler);
    // 触发 onload
    el._img.onload();
    expect(el.loaded).toBe(true);
    expect(el.$('.af-img-placeholder')).toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('图片 onerror 派发 af-img:error', () => {
    const el = makeImg({ src: 'bad.jpg', lazy: false });
    const handler = vi.fn();
    el.addEventListener('af-img:error', handler);
    el._img.onerror();
    expect(el.error).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('有 failSrc 时 onerror 切换到 failSrc', () => {
    const el = makeImg({ src: 'bad.jpg', failSrc: 'fail.jpg', lazy: false });
    el._img.onerror();
    expect(el._img.src).toContain('fail.jpg');
  });

  it('无 failSrc 时 onerror 渲染 .empty 错误态', () => {
    const el = makeImg({ src: 'bad.jpg', lazy: false });
    el._img.onerror();
    expect(el.$('[data-role="error"].empty')).not.toBeNull();
  });

  it('observer 触发后开始加载', () => {
    const el = makeImg({ src: 'a.jpg' });
    const spy = vi.spyOn(el, '_load');
    el._observer.trigger(el, true);
    expect(spy).toHaveBeenCalled();
  });

  it('onAttributeChange：src 变化触发重新加载', () => {
    const el = makeImg({ src: 'a.jpg', lazy: false });
    el._loaded = true;
    el.setAttribute('src', 'b.jpg');
    expect(el._img.src).toContain('b.jpg');
  });

  it('onAttributeChange：alt 变化同步到 img', () => {
    const el = makeImg({ src: 'a.jpg', alt: 'old' });
    el.setAttribute('alt', 'new');
    expect(el._img.getAttribute('alt')).toBe('new');
  });

  it('unmounted：断开 observer + 清事件', () => {
    const el = makeImg({ src: 'a.jpg' });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});

describe('af-img variant 动态切换（补充分支）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('variant 属性变化切换 thumb/avatar 类', () => {
    const el = makeImg({ src: 'a.jpg' });
    el.variant = 'avatar';
    expect(el.classList.contains('avatar')).toBe(true);
    expect(el.classList.contains('thumb')).toBe(false);
    el.variant = 'thumb';
    expect(el.classList.contains('thumb')).toBe(true);
    expect(el.classList.contains('avatar')).toBe(false);
    el.variant = 'default';
    expect(el.classList.contains('thumb')).toBe(false);
    expect(el.classList.contains('avatar')).toBe(false);
  });
});
