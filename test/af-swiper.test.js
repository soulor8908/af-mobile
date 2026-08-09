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

describe('af-swiper roving tabindex / 焦点跟随（禁令 #22）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('dots 实现 roving tabindex：仅活跃 dot 为 0，其余 -1', async () => {
    const el = makeSwiper(3);
    await Promise.resolve();
    const dots = el.$$('.dot');
    expect(dots[0].getAttribute('tabindex')).toBe('0');
    expect(dots[1].getAttribute('tabindex')).toBe('-1');
    expect(dots[2].getAttribute('tabindex')).toBe('-1');
  });

  it('goTo 后 tabindex 跟随活跃索引移动', async () => {
    const el = makeSwiper(3);
    await Promise.resolve();
    el.goTo(2);
    const dots = el.$$('.dot');
    expect(dots[0].getAttribute('tabindex')).toBe('-1');
    expect(dots[1].getAttribute('tabindex')).toBe('-1');
    expect(dots[2].getAttribute('tabindex')).toBe('0');
  });

  it('ArrowRight 切换后焦点跟随到新活跃 dot', async () => {
    const el = makeSwiper(3);
    await Promise.resolve();
    const dots = el.$$('.dot');
    dots[0].focus();
    expect(el.shadowRoot.activeElement).toBe(dots[0]);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(el.activeIndex).toBe(1);
    expect(el.shadowRoot.activeElement).toBe(dots[1]);
  });

  it('ArrowLeft 在非 loop 边界不越界，焦点留在当前 dot', async () => {
    const el = makeSwiper(3, { loop: false });
    await Promise.resolve();
    const dots = el.$$('.dot');
    dots[0].focus();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(el.activeIndex).toBe(0);
    expect(el.shadowRoot.activeElement).toBe(dots[0]);
  });

  it('Home/End 跳到首/末并聚焦', async () => {
    const el = makeSwiper(3);
    await Promise.resolve();
    const dots = el.$$('.dot');
    dots[1].focus();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(el.activeIndex).toBe(2);
    expect(el.shadowRoot.activeElement).toBe(dots[2]);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(el.activeIndex).toBe(0);
    expect(el.shadowRoot.activeElement).toBe(dots[0]);
  });

  it('dots 容器有 role=tablist', async () => {
    const el = makeSwiper(3);
    await Promise.resolve();
    expect(el.$('.dots').getAttribute('role')).toBe('tablist');
  });
});
