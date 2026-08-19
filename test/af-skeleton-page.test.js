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

  it('渲染 sk-pg 容器', () => {
    const el = makeSkeleton();
    expect(el.$('.sk-pg')).not.toBeNull();
  });

  it('默认 variant=list 渲染 6 条 sk-ln', () => {
    const el = makeSkeleton();
    expect(el.$$('.sk-ln').length).toBe(6);
  });

  it('variant=detail 含 sk-blk', () => {
    const el = makeSkeleton({ variant: 'detail' });
    expect(el.$$('.sk-blk').length).toBeGreaterThan(0);
    expect(el.$$('.sk-ln').length).toBeGreaterThanOrEqual(2);
  });

  it('variant=profile 含圆形占位', () => {
    const el = makeSkeleton({ variant: 'profile' });
    expect(el.$$('.sk-blk').length).toBeGreaterThan(0);
  });

  it('variant=card 含多个 block', () => {
    const el = makeSkeleton({ variant: 'card' });
    expect(el.$$('.sk-blk').length).toBeGreaterThanOrEqual(2);
  });

  it('variant=article 含标题行 + 图片块', () => {
    const el = makeSkeleton({ variant: 'article' });
    expect(el.$$('.sk-ln').length).toBeGreaterThanOrEqual(3);
    expect(el.$$('.sk-blk').length).toBeGreaterThanOrEqual(2);
  });

  it('list 骨架所有元素都带 sk 基类（可见性：无基类则无 shimmer 背景）', () => {
    const el = makeSkeleton({ variant: 'list' });
    const lines = el.$$('.sk-ln');
    expect(lines.length).toBe(6);
    for (const node of lines) {
      expect(node.classList.contains('sk')).toBe(true);
    }
  });

  it('所有 sk 元素都有 sk class', () => {
    const el = makeSkeleton({ variant: 'detail' });
    const all = el.$$('.sk');
    expect(all.length).toBeGreaterThan(0);
    for (const node of all) {
      expect(node.classList.contains('sk')).toBe(true);
    }
  });
});

describe('af-skeleton-page ARIA', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('根容器有 role=status', () => {
    const el = makeSkeleton();
    expect(el.$('.sk-pg').getAttribute('role')).toBe('status');
  });

  it('根容器有 aria-live=polite', () => {
    const el = makeSkeleton();
    expect(el.$('.sk-pg').getAttribute('aria-live')).toBe('polite');
  });

  it('根容器有 aria-label=加载中', () => {
    const el = makeSkeleton();
    expect(el.$('.sk-pg').getAttribute('aria-label')).toBe('加载中');
  });
});

describe('af-skeleton-page 属性变化', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('variant 属性变化重新渲染', () => {
    const el = makeSkeleton({ variant: 'list' });
    expect(el.$$('.sk-ln').length).toBe(6);
    el.setAttribute('variant', 'detail');
    expect(el.$$('.sk-blk').length).toBeGreaterThan(0);
  });

  it('无效 variant 回退到 list', () => {
    const el = makeSkeleton({ variant: 'invalid' });
    expect(el.$$('.sk-ln').length).toBe(6);
  });

  it('unmounted 不报错', () => {
    const el = makeSkeleton();
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
