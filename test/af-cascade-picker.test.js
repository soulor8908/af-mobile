import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfCascadePicker } from '../src/components/af-cascade-picker.js';
customElements.define('af-cascade-picker', AfCascadePicker);

const TREE = [
  { label: '广东省', value: 'gd', children: [
    { label: '广州市', value: 'gz', children: [
      { label: '天河区', value: 'th' }, { label: '越秀区', value: 'yx' },
    ] },
    { label: '深圳市', value: 'sz', children: [
      { label: '南山区', value: 'ns' }, { label: '福田区', value: 'ft' },
    ] },
  ] },
  { label: '浙江省', value: 'zj', children: [
    { label: '杭州市', value: 'hz', children: [{ label: '西湖区', value: 'xh' }] },
  ] },
];

function makeCascade(props = {}) {
  const el = new AfCascadePicker();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-cascade-picker（复用 af-picker 内核）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('tree 构建级联列：第 1 列 = 根级', () => {
    const el = makeCascade({ tree: TREE });
    expect(el.shadowRoot).not.toBeNull();
    const col0 = el.$$('.column')[0];
    expect(col0.querySelectorAll('.item').length).toBe(2);
    expect(col0.querySelector('.item').textContent).toBe('广东省');
  });

  it('values 决定每级选中 → 展开完整深度（省/市/区）', () => {
    const el = makeCascade({ tree: TREE, values: ['gd', 'gz', 'th'] });
    const cols = el.$$('.column');
    expect(cols.length).toBe(3);
    expect(cols[1].querySelectorAll('.item').length).toBe(2); // 广州/深圳
    expect(cols[2].querySelectorAll('.item').length).toBe(2); // 天河/越秀
    expect(cols[0].querySelector('.item.active').textContent).toBe('广东省');
    expect(cols[1].querySelector('.item.active').textContent).toBe('广州市');
    expect(cols[2].querySelector('.item.active').textContent).toBe('天河区');
  });

  it('某列值失效时自动回退首项', () => {
    const el = makeCascade({ tree: TREE, values: ['zj', 'gz', 'th'] }); // 广州不属于浙江
    const cols = el.$$('.column');
    expect(cols[1].querySelector('.item.active').textContent).toBe('杭州市');
    expect(cols[2].querySelector('.item.active').textContent).toBe('西湖区');
  });

  it('级联变更：父级变更后其下各列重建并回退首项', () => {
    vi.useFakeTimers();
    const el = makeCascade({ tree: TREE, values: ['gd', 'gz', 'th'] });
    vi.advanceTimersByTime(20); // flush mounted 中的 rAF（_scrollToValues）
    const handler = vi.fn();
    el.addEventListener('af-picker:change', handler);
    // 模拟滚动第 1 列到第 2 项（浙江省 zj），触发 change
    const col0 = el.$$('.column')[0];
    col0.scrollTop = 36;
    col0.dispatchEvent(new Event('scroll', { bubbles: true }));
    vi.advanceTimersByTime(100);
    expect(handler).toHaveBeenCalledTimes(1);
    // 父级变更 → 其下各列重建：gz/th 失效回退首项（杭州/西湖）
    expect(el.values).toEqual(['zj', 'hz', 'xh']);
    expect(el.$$('.column').length).toBe(3);
    expect(el.$$('.column')[1].querySelector('.item.active').textContent).toBe('杭州市');
    expect(el.$$('.column')[2].querySelector('.item.active').textContent).toBe('西湖区');
    vi.useRealTimers();
  });

  it('tree 属性变化后自动重建列', () => {
    const el = makeCascade({ tree: TREE, values: ['gd'] });
    // values 未指定下级 → 逐级回退首项展开到叶子（gd→gz→th，3 列）
    expect(el.$$('.column').length).toBe(3);
    el.tree = [{ label: 'A', value: 'a', children: [{ label: 'A1', value: 'a1' }] }];
    const cols = el.$$('.column');
    expect(cols.length).toBe(2);
    expect(cols[0].querySelectorAll('.item').length).toBe(1);
  });

  it('继承 af-picker 的确认/取消与 open/close 能力', () => {
    const el = makeCascade({ tree: TREE, values: ['gd', 'gz'] });
    expect(typeof el.open).toBe('function');
    expect(typeof el.close).toBe('function');
    expect(typeof el.setColumn).toBe('function');
    const picker = el.$('.picker');
    const showSpy = vi.spyOn(picker, 'showModal');
    el.open();
    expect(showSpy).toHaveBeenCalledTimes(1);
  });

  it('确认触发 af-picker:confirm 携带级联 values', () => {
    const el = makeCascade({ tree: TREE, values: ['gd', 'gz', 'th'] });
    const handler = vi.fn();
    el.addEventListener('af-picker:confirm', handler);
    el.$('.btn-confirm').click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.values).toEqual(['gd', 'gz', 'th']);
  });

  it('unmounted：移除级联监听不报错', () => {
    const el = makeCascade({ tree: TREE, values: ['gd', 'gz'] });
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
