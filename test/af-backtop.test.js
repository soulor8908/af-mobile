import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfBacktop } from '../src/components/af-backtop.js';
customElements.define('af-backtop', AfBacktop);

function makeBacktop(props = {}) {
  const el = new AfBacktop();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-backtop', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // 重置 window 滚动位置
    window.scrollY = 0;
  });

  it('渲染按钮（不再添加未登记白名单的标记类）', () => {
    const el = makeBacktop();
    expect(el.$('button')).not.toBeNull();
    expect(el.classList.contains('af-backtop-fixed')).toBe(false);
  });

  it('aria-label 默认"回到顶部"', () => {
    const el = makeBacktop();
    expect(el.$('button').getAttribute('aria-label')).toBe('回到顶部');
  });

  it('threshold=200：滚动 < 200 时隐藏', () => {
    const el = makeBacktop();
    expect(el.visible).toBe(false);
    expect(el.hasAttribute('hidden')).toBe(true);
  });

  it('scroll > threshold 时显示并派发 af-backtop:show', () => {
    const el = makeBacktop();
    const handler = vi.fn();
    el.addEventListener('af-backtop:show', handler);
    window.scrollY = 300;
    // 触发防抖后回调
    el._onScroll();
    return new Promise(resolve => {
      setTimeout(() => {
        expect(el.visible).toBe(true);
        expect(el.hasAttribute('hidden')).toBe(false);
        expect(handler).toHaveBeenCalledTimes(1);
        resolve();
      }, 150);
    });
  });

  it('点击按钮 scrollToTop + 派发 af-backtop:click', () => {
    const el = makeBacktop();
    const handler = vi.fn();
    el.addEventListener('af-backtop:click', handler);
    const spy = vi.spyOn(window, 'scrollTo');
    el.$('button').click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('position=left-bottom 由 position 属性驱动（非标记类）', () => {
    const el = makeBacktop({ position: 'left-bottom' });
    expect(el.classList.contains('af-backtop-left')).toBe(false);
    expect(el.getAttribute('position')).toBe('left-bottom');
  });

  it('内置 fixed 定位由 recipes.css af-backtop 规则提供（不依赖 JS setProperty）', () => {
    const el = makeBacktop();
    // fixed/z-index/bottom/right 由 CSS 提供，不再通过 JS style 设置（遵守 wc-light-no-style）
    expect(el.style.position).toBe('');
    expect(el.style.zIndex).toBe('');
    expect(el.style.bottom).toBe('');
  });

  it('position=left-bottom 时定位到左侧（由 CSS 属性选择器驱动）', () => {
    const el = makeBacktop({ position: 'left-bottom' });
    expect(el.style.left).toBe('');
    expect(el.style.right).toBe('');
    expect(el.getAttribute('position')).toBe('left-bottom');
  });

  it('target 可指定具体元素作为滚动容器', () => {
    const scroller = document.createElement('div');
    scroller.id = 'scroll-area';
    scroller.style.overflow = 'auto';
    document.body.appendChild(scroller);
    const el = makeBacktop({ target: '#scroll-area' });
    expect(el._scrollTarget).toBe(scroller);
  });

  it('onAttributeChange：threshold 变化重新计算显隐', () => {
    const el = makeBacktop({ threshold: 100 });
    window.scrollY = 150;
    el._onScroll();
    return new Promise(resolve => {
      setTimeout(() => {
        expect(el.visible).toBe(true);
        // 改 threshold 后再回 0
        el.setAttribute('threshold', '500');
        expect(el.threshold).toBe(500);
        resolve();
      }, 150);
    });
  });

  it('onAttributeChange：text 变化更新按钮文案', () => {
    const el = makeBacktop({ text: '↑' });
    el.setAttribute('text', 'TOP');
    expect(el.$('button').textContent).toBe('TOP');
  });

  it('unmounted：移除 scroll 监听不报错', () => {
    const el = makeBacktop();
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});

describe('af-backtop 属性变更（补充分支）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.scrollY = 0;
  });

  it('target 属性变化重绑滚动监听到新容器', () => {
    const scroller = document.createElement('div');
    scroller.id = 'scroll-area-2';
    document.body.appendChild(scroller);
    const el = makeBacktop({ target: '#scroll-area-2' });
    const other = document.createElement('div');
    other.id = 'scroll-area-3';
    document.body.appendChild(other);
    el.target = '#scroll-area-3';
    expect(el._scrollTarget).toBe(other);
  });

  it('aria-label-text 属性变化更新按钮 aria-label', () => {
    const el = makeBacktop();
    el.setAttribute('aria-label-text', '回到顶部啦');
    expect(el.$('button').getAttribute('aria-label')).toBe('回到顶部啦');
  });

  it('target 为非 window 元素时 scrollToTop 调用该元素 scrollTo', () => {
    const scroller = document.createElement('div');
    scroller.id = 'scroll-area-4';
    document.body.appendChild(scroller);
    const el = makeBacktop({ target: '#scroll-area-4' });
    const spy = vi.fn();
    scroller.scrollTo = spy;
    el.$('button').click();
    expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
