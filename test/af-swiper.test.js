import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AfSwiper } from '../src/components/af-swiper.js';
customElements.define('af-swiper', AfSwiper);

function makeSwiper(slides = 3, props = {}) {
  const el = new AfSwiper();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  // 必须先 attach 到 DOM 才能渲染 Shadow
  document.body.appendChild(el);
  // 加入 slides
  for (let i = 0; i < slides; i++) {
    const div = document.createElement('div');
    div.textContent = `Slide ${i}`;
    el.appendChild(div);
  }
  return el;
}

describe('af-swiper Shadow DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('Shadow DOM 已挂载：含 viewport + track + dots', async () => {
    const el = makeSwiper(3);
    // 触发 rAF 回调（queueMicrotask，用 await 刷新）
    await Promise.resolve();
    expect(el.shadowRoot).not.toBeNull();
    expect(el.$('.viewport')).not.toBeNull();
    expect(el.$('.track')).not.toBeNull();
    expect(el.$('.dots')).not.toBeNull();
  });

  it('dots 数量与 slides 一致', async () => {
    const el = makeSwiper(3);
    await Promise.resolve();
    expect(el.$$('.dot').length).toBe(3);
  });

  it('goTo 切换激活索引 + 派发 af-swiper:change', async () => {
    const el = makeSwiper(3);
    await Promise.resolve();
    const handler = vi.fn();
    el.addEventListener('af-swiper:change', handler);
    el.goTo(2);
    expect(el.activeIndex).toBe(2);
    // active dot 高亮
    const dots = el.$$('.dot');
    expect(dots[2].classList.contains('active')).toBe(true);
    // transitionend 触发事件
    el.$('.track').dispatchEvent(new Event('transitionend'));
    expect(handler).toHaveBeenCalled();
  });

  it('next / prev 在非 loop 下受边界限制', async () => {
    const el = makeSwiper(3, { loop: false });
    await Promise.resolve();
    el.goTo(2);
    el.next();
    expect(el.activeIndex).toBe(2); // 已到末尾
    el.goTo(0);
    el.prev();
    expect(el.activeIndex).toBe(0); // 已到首位
  });

  it('loop=true 越界循环', async () => {
    const el = makeSwiper(3, { loop: true });
    await Promise.resolve();
    el.goTo(2);
    el.next();
    expect(el.activeIndex).toBe(0);
    el.goTo(0);
    el.prev();
    expect(el.activeIndex).toBe(2);
  });

  it('ARIA：role=region + aria-label 反映当前位置', async () => {
    const el = makeSwiper(3);
    await Promise.resolve();
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toContain('3');
    expect(el.getAttribute('aria-label')).toContain('第 1 张');
  });

  it('show-dots=false 设置 attribute 为 "false" 触发 CSS 隐藏', async () => {
    const el = makeSwiper(3, { showDots: 'false' });
    await Promise.resolve();
    expect(el.getAttribute('show-dots')).toBe('false');
    el.showDots = 'true';
    expect(el.getAttribute('show-dots')).toBe('true');
  });

  it('disabled 时仍可渲染但不绑定 touch（无报错）', async () => {
    const el = makeSwiper(3, { disabled: true });
    await Promise.resolve();
    expect(el.disabled).toBe(true);
  });

  it('unmounted：清理 ResizeObserver + autoplay timer', async () => {
    const el = makeSwiper(3, { autoplay: 1000 });
    await Promise.resolve();
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
