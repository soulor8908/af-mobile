import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSessions, sessionsHTML, bindSessions } from '../src/chat/sessions.js';
// cs.* 字典随 chat 入口注册；直测 sessions.js 需显式导入
import '../src/chat/i18n.js';

/** DONE-only 请求（不产生内容，仅驱动状态机） */
const doneReq = () => async () => ({
  ok: true,
  status: 200,
  body: new ReadableStream({
    start(c) { c.enqueue(new TextEncoder().encode('data: [DONE]\n\n')); c.close(); },
  }),
});

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

describe('createSessions 仓库', () => {
  it('内存模式（缺省）：create 自动激活 + 默认标题取 cs.new', () => {
    const store = createSessions();
    const rec = store.create();
    expect(store.records).toHaveLength(1);
    expect(store.activeId).toBe(rec.id);
    expect(rec.title).toBe('新对话');
    expect(rec.messages).toEqual([]);
    expect(store.active()).not.toBeNull();
    expect(store.create().id).not.toBe(rec.id);   // uuid 唯一
  });

  it('select 切换并通知；无效 id 不通知', () => {
    const store = createSessions();
    const a = store.create(), b = store.create();
    const fn = vi.fn();
    store.subscribe(fn);
    store.select(a.id);
    expect(store.activeId).toBe(a.id);
    expect(fn).toHaveBeenCalledTimes(1);
    store.select('nope');
    expect(store.activeId).toBe(a.id);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(b).toBeDefined();
  });

  it('remove：删 active 自动切最近一条；删空后 activeId 为 null', () => {
    const store = createSessions();
    const a = store.create(), b = store.create();
    store.remove(b.id);
    expect(store.records).toHaveLength(1);
    expect(store.activeId).toBe(a.id);
    store.remove(a.id);
    expect(store.records).toHaveLength(0);
    expect(store.activeId).toBeNull();
    expect(store.active()).toBeNull();
    store.remove('nope');   // 不抛
  });

  it('持久化：结构性操作同步落盘；流式通知防抖 300ms', async () => {
    vi.useFakeTimers();
    const store = createSessions({
      storage: 'k1',
      requestFn: async () => ({
        ok: true,
        status: 200,
        body: new ReadableStream({
          start(c) { c.enqueue(new TextEncoder().encode('data: ' + JSON.stringify({ choices: [{ delta: { content: '好' } }] }) + '\n\ndata: [DONE]\n\n')); c.close(); },
        }),
      }),
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    store.create();
    expect(setItem).toHaveBeenCalledTimes(1);   // 结构性操作同步 flush
    const session = store.active();
    await session.send('hi');                    // 流式 push 逐次 notify（防抖中）
    expect(setItem).toHaveBeenCalledTimes(1);   // 未落盘
    vi.advanceTimersByTime(300);
    expect(setItem).toHaveBeenCalledTimes(2);
    const saved = JSON.parse(localStorage.getItem('k1'));
    expect(saved[0].messages.map((m) => m.role)).toEqual(['user', 'assistant']);
  });

  it('恢复：localStorage records 重建仓库，messages 经 initialMessages 还原', () => {
    localStorage.setItem('k2', JSON.stringify([
      { id: 'a', title: '旧会话', createdAt: 1, messages: [{ role: 'user', id: 'u1', content: [{ type: 'text', text: '旧话' }] }] },
      { id: 'b', title: '新会话', createdAt: 2, messages: [] },
    ]));
    const store = createSessions({ storage: 'k2' });
    expect(store.records.map((r) => r.title)).toEqual(['旧会话', '新会话']);
    expect(store.activeId).toBe('b');   // 最近一条为 active
    store.select('a');
    expect(store.active().messages[0].content[0].text).toBe('旧话');   // initialMessages 还原上下文
    expect(store.active().messages).toHaveLength(1);
  });

  it('损坏 JSON 降级空列表不抛', () => {
    localStorage.setItem('k3', '{oops');
    const store = createSessions({ storage: 'k3' });
    expect(store.records).toEqual([]);
    expect(store.activeId).toBeNull();
  });

  it('subscribe 退订后不再通知', () => {
    const store = createSessions();
    const fn = vi.fn();
    const unsub = store.subscribe(fn);
    unsub();
    store.create();
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('sessionsHTML 渲染', () => {
  it('新对话钮 + items（active aria-current）+ 删除钮 aria-label', () => {
    const store = createSessions();
    store.create();
    store.create();
    const h = sessionsHTML(store);
    expect(h).toContain('data-new="1"');
    expect(h).toContain('>新对话</button>');
    expect(h).toContain('role="list"');
    expect(h).toContain('role="listitem"');
    expect(h).toContain('aria-current="true"');   // 仅 active 项
    expect(h).toContain('aria-label="删除"');
    expect(h.match(/aria-current="true"/g)).toHaveLength(1);
  });

  it('标题 XSS 转义', () => {
    const store = createSessions();
    store.create();
    store.records[0].title = '<img onerror=alert(1)>';
    const h = sessionsHTML(store);
    expect(h).not.toContain('<img');
    expect(h).toContain('&lt;img onerror=alert(1)&gt;');
  });
});

describe('bindSessions 绑定器', () => {
  it('初次渲染 + 委托（新建/选择/删除）+ target 自动换绑', () => {
    const store = createSessions();
    const el = document.createElement('div');
    const target = { session: null };
    bindSessions(el, store, target);
    expect(target.session).toBeNull();   // 空仓库初次换绑为 null
    el.querySelector('[data-new]').click();
    expect(store.records).toHaveLength(1);
    expect(target.session).toBe(store.active());   // create → paint → 换绑
    el.querySelector('[data-new]').click();
    const firstId = store.records[0].id;
    el.querySelector(`[data-id="${firstId}"]`).click();
    expect(store.activeId).toBe(firstId);
    expect(target.session).toBe(store.active());
    el.querySelector('[data-id] [data-rm]').click();
    expect(store.records).toHaveLength(1);
    expect(store.activeId).not.toBe(firstId);
  });

  it('空点击与容器外冒泡不误触', () => {
    const store = createSessions();
    const el = document.createElement('div');
    const fn = vi.fn();
    store.subscribe(fn);
    bindSessions(el, store);
    el.click();
    el.querySelector('[data-new]').click();
    const calls = fn.mock.calls.length;
    el.querySelector('.list').click();   // 列表容器空白处：不触发 select/remove
    expect(fn.mock.calls.length).toBe(calls);
  });
});
