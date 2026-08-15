import { describe, it, expect, beforeEach } from 'vitest';
import { AfSkeletonPage } from '../src/components/af-skeleton-page.js';
customElements.define('af-skeleton-page', AfSkeletonPage);

function makeSkeleton(props = {}) {
  const el = new AfSkeletonPage();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-skeleton-page 基础渲染', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染 skeleton-page 容器', () => {
    const el = makeSkeleton();
    expect(el.$('.skeleton-page')).not.toBeNull();
  });

  it('默认 variant=list 渲染 6 条 skeleton-line', () => {
    const el = makeSkeleton();
    expect(el.$$('.skeleton-line').length).toBe(6);
  });

  it('variant=detail 含 skeleton-block', () => {
    const el = makeSkeleton({ variant: 'detail' });
    expect(el.$$('.skeleton-block').length).toBeGreaterThan(0);
    expect(el.$$('.skeleton-line').length).toBeGreaterThanOrEqual(2);
  });

  it('variant=profile 含圆形占位', () => {
    const el = makeSkeleton({ variant: 'profile' });
    expect(el.$$('.skeleton-block').length).toBeGreaterThan(0);
  });

  it('variant=card 含多个 block', () => {
    const el = makeSkeleton({ variant: 'card' });
    expect(el.$$('.skeleton-block').length).toBeGreaterThanOrEqual(2);
  });

  it('所有 skeleton 元素都有 skeleton class', () => {
    const el = makeSkeleton({ variant: 'detail' });
    const all = el.$$('.skeleton');
    expect(all.length).toBeGreaterThan(0);
    for (const node of all) {
      expect(node.classList.contains('skeleton')).toBe(true);
    }
  });
});

describe('af-skeleton-page ARIA', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('根容器有 role=status', () => {
    const el = makeSkeleton();
    expect(el.$('.skeleton-page').getAttribute('role')).toBe('status');
  });

  it('根容器有 aria-live=polite', () => {
    const el = makeSkeleton();
    expect(el.$('.skeleton-page').getAttribute('aria-live')).toBe('polite');
  });

  it('根容器有 aria-label=加载中', () => {
    const el = makeSkeleton();
    expect(el.$('.skeleton-page').getAttribute('aria-label')).toBe('加载中');
  });
});

describe('af-skeleton-page 属性变化', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('variant 属性变化重新渲染', () => {
    const el = makeSkeleton({ variant: 'list' });
    expect(el.$$('.skeleton-line').length).toBe(6);
    el.setAttribute('variant', 'detail');
    expect(el.$$('.skeleton-block').length).toBeGreaterThan(0);
  });

  it('无效 variant 回退到 list', () => {
    const el = makeSkeleton({ variant: 'invalid' });
    expect(el.$$('.skeleton-line').length).toBe(6);
  });

  it('unmounted 不报错', () => {
    const el = makeSkeleton();
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
