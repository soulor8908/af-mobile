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

  it('渲染按钮 + 添加 af-backtop-fixed class', () => {
    const el = makeBacktop();
    expect(el.$('button')).not.toBeNull();
    expect(el.classList.contains('af-backtop-fixed')).toBe(true);
  });

  it('aria-label 默认"回到顶部"', () => {
    const el = makeBacktop();
    expect(el.$('button').getAttribute('aria-label')).toBe('回到顶部');
  });

  it('threshold=200：滚动 < 200 时隐藏', () => {
    const el = makeBacktop();
    expect(el.visible).toBe(false);
    expect(el.style.display).toBe('none');
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
        expect(el.style.display).toBe('');
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

  it('position=left-bottom 添加 af-backtop-left class', () => {
    const el = makeBacktop({ position: 'left-bottom' });
    expect(el.classList.contains('af-backtop-left')).toBe(true);
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
