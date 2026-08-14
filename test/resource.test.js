import { describe, it, expect, vi, afterEach } from 'vitest';
import { signal } from '../packages/ui/src/lib/state.js';
import { createResource } from '../packages/ui/src/lib/resource.js';
import { createPage } from '../packages/ui/src/lib/page.js';

const tick = () => new Promise(r => setTimeout(r, 0));

describe('createResource', () => {
  it('初始加载：isLoading → data 就绪', async () => {
    const fetcher = vi.fn(async (id) => ({ id, name: `u${id}` }));
    const r = createResource(() => 1, fetcher);
    expect(r.isLoading()).toBe(true);
    expect(r.data()).toBeNull();
    await tick();
    expect(fetcher).toHaveBeenCalledWith(1);
    expect(r.isLoading()).toBe(false);
    expect(r.data()).toEqual({ id: 1, name: 'u1' });
    expect(r.isError()).toBe(false);
  });

  it('initialValue 作为初始 data', async () => {
    const r = createResource(() => 1, vi.fn(async () => ({})), { initialValue: { cached: true } });
    expect(r.data()).toEqual({ cached: true });
    await tick();
  });

  it('source（signal）变化自动重新拉取', async () => {
    const fetcher = vi.fn(async (id) => ({ id }));
    const id = signal(1);
    const r = createResource(id, fetcher);
    await tick();
    expect(fetcher).toHaveBeenCalledWith(1);
    id.set(2);
    await tick();
    expect(fetcher).toHaveBeenCalledWith(2);
    expect(r.data()).toEqual({ id: 2 });
  });

  it('source 为 null 时不发起请求', async () => {
    const fetcher = vi.fn(async () => ({ ok: true }));
    const r = createResource(() => null, fetcher);
    await tick();
    expect(fetcher).not.toHaveBeenCalled();
    expect(r.isLoading()).toBe(false);
  });

  it('fetcher 抛错时 error/isError 置位', async () => {
    const fetcher = vi.fn(async () => { throw new Error('boom'); });
    const r = createResource(() => 1, fetcher);
    await tick();
    expect(r.error()).toBeInstanceOf(Error);
    expect(r.isError()).toBe(true);
    expect(r.isLoading()).toBe(false);
  });

  it('竞态：慢响应不覆盖新请求结果', async () => {
    const id = signal(1);
    const fetcher = vi.fn(async (k) => {
      if (k === 1) await new Promise(r => setTimeout(r, 30));  // 慢请求
      return { id: k };
    });
    const r = createResource(id, fetcher);
    await tick();
    id.set(2);  // 新请求先返回
    await new Promise(r => setTimeout(r, 5));
    expect(r.data()).toEqual({ id: 2 });
    await new Promise(r => setTimeout(r, 50));  // 慢请求返回后被丢弃
    expect(r.data()).toEqual({ id: 2 });
    expect(r.isLoading()).toBe(false);
  });

  it('与 createPage.setup 集成：resource 挂到 refs', async () => {
    const fetcher = vi.fn(async (id) => ({ id }));
    const page = createPage({
      state: { uid: 7 },
      setup: (s) => ({ user: createResource(() => s.uid, fetcher) }),
    });
    expect(page.refs.user).toBeDefined();
    expect(page.refs.user.isLoading()).toBe(true);
    await tick();
    expect(page.refs.user.data()).toEqual({ id: 7 });
    page.unmount();
  });
});
