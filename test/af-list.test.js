import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfList } from '../src/components/af-list.js';
customElements.define('af-list', AfList);

function makeList(props = {}) {
  const el = new AfList();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

function makeData(n) {
  return Array.from({ length: n }, (_, i) => ({ title: `Item ${i}`, subtitle: `sub ${i}` }));
}

describe('af-list 虚拟滚动', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('空数据：渲染 empty 态', () => {
    const el = makeList({ data: [] });
    expect(el.$('.empty')).not.toBeNull();
    expect(el.$('.empty .body').textContent).toContain('暂无数据');
  });

  it('loading=true：渲染骨架屏', () => {
    const el = makeList({ loading: true });
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.$$('.skeleton').length).toBeGreaterThan(0);
  });

  it('数据渲染：viewport 含 list-item', () => {
    const el = makeList({ data: makeData(10), itemHeight: 48 });
    // 默认 bufferSize 让 viewport 容器有内容
    const items = el.$$('.list-item');
    expect(items.length).toBeGreaterThan(0);
    expect(el.totalCount).toBe(10);
  });

  it('aria-label 反映总数', () => {
    const el = makeList({ data: makeData(20) });
    expect(el.getAttribute('aria-label')).toContain('20');
  });

  it('自定义 renderItem 函数被使用', () => {
    const el = makeList({ data: makeData(5) });
    el.renderItem = (item, idx) => `<div class="custom-item" data-idx="${idx}">${item.title}</div>`;
    expect(el.$$('.custom-item').length).toBeGreaterThan(0);
  });

  it('compact 模式用 list-item-compact class', () => {
    const el = makeList({ data: makeData(5), mode: 'compact' });
    expect(el.$$('.list-item-compact').length).toBeGreaterThan(0);
  });

  it('itemclick 事件委托触发 af-list:itemclick', () => {
    const el = makeList({ data: makeData(5) });
    const handler = vi.fn();
    el.addEventListener('af-list:itemclick', handler);
    const item = el.$('.list-item');
    item.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.index).toBe(0);
  });

  it('onAttributeChange：data 属性变化触发重渲染', () => {
    const el = makeList({ data: [] });
    expect(el.$('.empty')).not.toBeNull();
    el.setAttribute('data', JSON.stringify(makeData(3)));
    expect(el.$$('.list-item').length).toBeGreaterThan(0);
  });

  it('endLoadMore：hasMore=false 时显示"没有更多了"', () => {
    const el = makeList({ data: makeData(3) });
    el.endLoadMore(false);
    expect(el.$('[data-role="loadmore"]').textContent).toContain('没有更多了');
  });

  it('unmounted：解绑 scroll 监听不报错', () => {
    const el = makeList({ data: makeData(3) });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });

  it('totalCount 显式设置后覆盖 data.length', () => {
    const el = makeList({ data: makeData(5) });
    el.totalCount = 100;
    expect(el.totalCount).toBe(100);
    expect(el.getAttribute('aria-label')).toContain('100');
  });
});
