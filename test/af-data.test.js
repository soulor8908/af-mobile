import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AfData } from '../src/components/af-data.js';
import { initBind, _resetBind } from '../src/lib/bind.js';
import { createPage } from '../src/lib/page.js';

customElements.define('af-data', AfData);

// mock fetch.js
vi.mock('../src/lib/fetch.js', () => ({
  fetchPage: vi.fn(),
}));

function makeData(props = {}) {
  const el = new AfData();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

// :bind 需绑定到 createPage 实例（definePage 全局单例已移除）
let _stopBind = null;

beforeEach(() => {
  document.body.innerHTML = '';
  _resetBind();
  vi.clearAllMocks();
});

afterEach(() => {
  _stopBind?.();
  _stopBind = null;
});

describe('af-data 基础', () => {
  it('connectedCallback 触发 fetch', async () => {
    const { fetchPage } = await import('../src/lib/fetch.js');
    fetchPage.mockResolvedValue({ list: [1, 2] });
    const el = makeData({ src: '/api/list', ref: 'ds' });
    await vi.waitFor(() => expect(el.getData()).toEqual({ list: [1, 2] }));
    expect(el.getLoading()).toBe(false);
    expect(el.getError()).toBeNull();
  });

  it('fetch 失败时设置 error', async () => {
    const { fetchPage } = await import('../src/lib/fetch.js');
    fetchPage.mockRejectedValue(new Error('network'));
    const el = makeData({ src: '/api/x' });
    await vi.waitFor(() => expect(el.getError()).not.toBeNull());
    expect(el.getError().message).toBe('network');
    expect(el.getLoading()).toBe(false);
  });

  it('refresh 重新拉取', async () => {
    const { fetchPage } = await import('../src/lib/fetch.js');
    fetchPage.mockResolvedValue({ a: 1 });
    const el = makeData({ src: '/api/x' });
    await vi.waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));
    el.refresh();
    await vi.waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2));
  });

  it('af-data:load 事件触发', async () => {
    const { fetchPage } = await import('../src/lib/fetch.js');
    fetchPage.mockResolvedValue({ ok: 1 });
    const el = makeData({ src: '/api/x' });
    const handler = vi.fn();
    el.addEventListener('af-data:load', handler);
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    expect(handler.mock.calls[0][0].detail).toEqual({ data: { ok: 1 } });
  });
});

describe('af-data ref 集成 :bind', () => {
  it('通过 ref 暴露 data 给 :bind', async () => {
    const { fetchPage } = await import('../src/lib/fetch.js');
    fetchPage.mockResolvedValue([1, 2, 3]);
    document.body.innerHTML = `
      <af-data src="/api/list" ref="ds"></af-data>
      <div :data-len="ds.data"></div>
    `;
    _stopBind = initBind(document.body, createPage({ state: {} }));
    const afData = document.querySelector('af-data');
    await vi.waitFor(() => expect(afData.getData()).toEqual([1, 2, 3]));
    // af-data signal 变化触发 bind effect
    await vi.waitFor(() => {
      expect(document.querySelector('div').getAttribute('data-len')).toBe('[1,2,3]');
    });
  });

  it('loading 状态通过 ref 暴露', async () => {
    const { fetchPage } = await import('../src/lib/fetch.js');
    fetchPage.mockResolvedValue([]);
    document.body.innerHTML = `
      <af-data src="/api/x" ref="ds"></af-data>
      <div :data-loading="ds.loading"></div>
    `;
    _stopBind = initBind(document.body, createPage({ state: {} }));
    // fetch 完成后 loading=false，bind 移除 loading 属性
    await vi.waitFor(() => {
      expect(document.querySelector('div').hasAttribute('data-loading')).toBe(false);
    });
  });
});
