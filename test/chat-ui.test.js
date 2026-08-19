import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bubbleHTML, updateBubble, cardNode, chipsHTML, toolCallMap } from '../src/chat/lib/render.js';
import { AfChat } from '../src/chat/components/af-chat.js';
import { createMessage } from '../src/chat/message.js';
// ct.* 字典在 chat 子库入口注册（不占主库核心运行时），测试直接导入组件文件需显式注册
import '../src/chat/i18n.js';

customElements.define('af-chat', AfChat);

const msg = (role, content, id = role) => createMessage({ role, id, content });

function makeChat(props = {}) {
  const el = new AfChat();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

function mockSession(overrides = {}) {
  const listeners = new Set();
  return {
    messages: [],
    state: 'idle',
    send: vi.fn(async () => {}),
    abort: vi.fn(),
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    notify: () => listeners.forEach((fn) => fn()),
    ...overrides,
  };
}

describe('chat render 纯函数', () => {
  it('toolCallMap 从 assistant 消息收集 id→name', () => {
    const msgs = [
      msg('assistant', [{ type: 'tool_call', id: 't1', name: 'get_weather', args: {} }]),
    ];
    expect(toolCallMap(msgs)).toEqual({ t1: 'get_weather' });
  });

  it('bubbleHTML：user 气泡含转义文本', () => {
    const h = bubbleHTML(msg('user', [{ type: 'text', text: '<b>hi</b>' }]), {});
    // eslint-disable-next-line af-mobile/token-whitelist -- 断言 shadow 内部结构 class（组件私有，非消费端白名单域）
    expect(h).toContain('class="m u"');
    expect(h).toContain('&lt;b&gt;hi&lt;/b&gt;');
    expect(h).not.toContain('<b>hi</b>');
  });

  it('bubbleHTML：assistant 气泡含 text 区/光标/卡片投影 slot', () => {
    const h = bubbleHTML(msg('assistant', []), {});
    // eslint-disable-next-line af-mobile/token-whitelist -- 断言 shadow 内部结构 class（组件私有，非消费端白名单域）
    expect(h).toContain('class="m a"');
    // eslint-disable-next-line af-mobile/token-whitelist -- 断言 shadow 内部结构 class（组件私有，非消费端白名单域）
    expect(h).toContain('<span class="x"');
    expect(h).toContain('<slot name="card-assistant"');
  });

  it('bubbleHTML：tool 消息渲染完成态芯片（查 callMap 取名）', () => {
    const h = bubbleHTML(msg('tool', [{ type: 'tool_result', id: 't1', result: 1 }]), { t1: 'get_weather' });
    expect(h).toContain('c done');
    expect(h).toContain('get_weather');
  });

  it('updateBubble：流式文本用 textContent（防 XSS）+ aria-hidden 时序', () => {
    const el = document.createElement('div');
    el.innerHTML = bubbleHTML(msg('assistant', []), {});
    const m = msg('assistant', [{ type: 'text', text: '<img onerror=alert(1)>' }]);
    updateBubble(el, m, {}, true);
    expect(el.querySelector('.x').textContent).toBe('<img onerror=alert(1)>');
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.x').getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('.cu').hidden).toBe(false);
    // 完成：移除 aria-hidden，sr-only 播报节点出现全文
    updateBubble(el, m, {}, false);
    expect(el.querySelector('.x').getAttribute('aria-hidden')).toBeNull();
    expect(el.querySelector('.sr').textContent).toBe('<img onerror=alert(1)>');
    expect(el.querySelector('.cu').hidden).toBe(true);
  });

  it('updateBubble：assistant 内 tool_call 块渲染进行中芯片', () => {
    const el = document.createElement('div');
    el.innerHTML = bubbleHTML(msg('assistant', []), {});
    const m = msg('assistant', [
      { type: 'tool_call', id: 't1', name: 'calc', args: {} },
      { type: 'text', text: 'ok' },
    ]);
    updateBubble(el, m, {}, true);
    expect(el.querySelector('.tw .c.run').textContent).toContain('calc');
  });

  it('cardNode confirm：card fc g-2 p-3 + actions 按钮排 + danger 样式', () => {
    const block = { type: 'card', id: 'c1', card: { kind: 'confirm', title: '删除确认', rows: [{ label: '文件', value: 'a.txt' }], danger: true, confirmText: '删除', cancelText: '取消' } };
    const node = cardNode('m1', block, () => '确定');
    expect(node.slot).toBe('card-m1');
    expect(node.className).toBe('card fc g-2 p-3');
    expect(node.querySelector('.title').textContent).toBe('删除确认');
    expect(node.querySelector('button[data-confirm]').className).toBe('btn btn-danger');
    expect(node.querySelector('button[data-cancel]').className).toBe('btn btn-ghost');
  });

  it('cardNode confirm：confirmText/cancelText 缺省走 i18n', () => {
    const block = { type: 'card', id: 'c1', card: { kind: 'confirm' } };
    const node = cardNode('m1', block, (k) => (k === 'ct.cf' ? '确认' : '取消'));
    expect(node.querySelector('button[data-confirm]').textContent).toBe('确认');
    expect(node.querySelector('button[data-cancel]').textContent).toBe('取消');
  });

  it('cardNode list：list 容器 + list-item 行', () => {
    const block = { type: 'card', id: 'c1', card: { kind: 'list', title: '结果', items: [{ title: '上海', desc: '晴 25℃' }] } };
    const node = cardNode('m1', block, () => '');
    expect(node.querySelector('.list .list-item .body').textContent).toBe('上海');
    expect(node.querySelector('.list .list-item .caption').textContent).toBe('晴 25℃');
  });

  it('cardNode 未知 kind：兜底文本卡不崩', () => {
    const block = { type: 'card', id: 'c1', card: { kind: 'magic', title: 'X' } };
    const node = cardNode('m1', block, () => '');
    expect(node.className).toBe('card fc g-2 p-3');
    expect(node.querySelector('.body')).not.toBeNull();
  });

  it('cardNode XSS：title 含 <img onerror> 被转义', () => {
    const block = { type: 'card', id: 'c1', card: { kind: 'list', title: '<img onerror=alert(1)>', items: [{ title: '<script>' }] } };
    const node = cardNode('m1', block, () => '');
    expect(node.querySelector('img')).toBeNull();
    expect(node.querySelector('script')).toBeNull();
  });

  it('chipsHTML：actions options 渲染为按钮（value 转义）', () => {
    const h = chipsHTML({ kind: 'actions', options: [{ label: '今天天气', value: 'today' }] });
    expect(h).toContain('data-value="today"');
    expect(h).toContain('今天天气');
  });
});

describe('af-chat 组件骨架', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('Shadow DOM 挂载：log 容器 role=log + aria-live=polite + tabindex', () => {
    const el = makeChat();
    expect(el.shadowRoot).not.toBeNull();
    const log = el.$('.lg');
    expect(log.getAttribute('role')).toBe('log');
    expect(log.getAttribute('aria-live')).toBe('polite');
    expect(log.getAttribute('tabindex')).toBe('0');
  });

  it('CSS：输入字号走 --t-input（16px 防缩放）+ prefers-reduced-motion 覆盖', () => {
    const el = makeChat();
    const css = el.shadowRoot.querySelector('style').textContent;
    expect(css).toContain('font-size:var(--t-input)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
  });

  it('受控模式：messages setter 渲染 user/ai 气泡', () => {
    const el = makeChat();
    el.messages = [
      createMessage({ role: 'user', id: 'u1', content: [{ type: 'text', text: '你好' }] }),
      createMessage({ role: 'assistant', id: 'a1', content: [{ type: 'text', text: '在的' }] }),
    ];
    expect(el.$$('.ms .m').length).toBe(2);
    expect(el.$('.m.u').textContent).toBe('你好');
    expect(el.$('.m.a .x').textContent).toBe('在的');
  });

  it('受控模式：card 块渲染为 host light DOM 子节点（slot 投影）', () => {
    const el = makeChat();
    el.messages = [createMessage({ role: 'assistant', id: 'a1', content: [
      { type: 'text', text: '查到了' },
      { type: 'card', id: 'c1', card: { kind: 'list', title: '结果', items: [{ title: '上海' }] } },
    ] })];
    const node = el.querySelector('[data-card-id="c1"]');
    expect(node).not.toBeNull();
    expect(node.slot).toBe('card-a1');
    expect(node.querySelector('.list-item .body').textContent).toBe('上海');
  });

  it('受控模式重设 messages：旧卡片节点被清理', () => {
    const el = makeChat();
    el.messages = [createMessage({ role: 'assistant', id: 'a1', content: [{ type: 'card', id: 'c1', card: { kind: 'list' } }] })];
    expect(el.querySelectorAll('[data-card-id]').length).toBe(1);
    el.messages = [createMessage({ role: 'user', id: 'u1', content: [{ type: 'text', text: 'hi' }] })];
    expect(el.querySelectorAll('[data-card-id]').length).toBe(0);
  });

  it('绑定模式：session setter 订阅 + 增量渲染新消息', async () => {
    const el = makeChat();
    const s = mockSession();
    el.session = s;
    s.messages.push(createMessage({ role: 'user', id: 'u1', content: [{ type: 'text', text: 'hi' }] }));
    s.notify();
    expect(el.$$('.ms .m').length).toBe(1);
    // 流式更新最后一条 assistant：节点复用（引用不变）
    const ai = createMessage({ role: 'assistant', id: 'a1', content: [] });
    s.messages.push(ai);
    s.state = 'streaming';
    s.notify();
    const node1 = el.$('.m.a');
    ai.content.push({ type: 'text', text: '你' });
    s.notify();
    const node2 = el.$('.m.a');
    expect(node2).toBe(node1);
    expect(node2.querySelector('.x').textContent).toBe('你');
    s.state = 'idle';
    s.notify();
    expect(node2.querySelector('.x').getAttribute('aria-hidden')).toBeNull();
  });

  it('绑定模式：messages 外部赋值被忽略（session 为真相源）', () => {
    const el = makeChat();
    el.session = mockSession();
    el.messages = [createMessage({ role: 'user', id: 'u1', content: [{ type: 'text', text: 'x' }] })];
    expect(el.$$('.ms .m').length).toBe(0);
  });

  it('session 解绑：重新置 null 后受控模式恢复', () => {
    const el = makeChat();
    const s = mockSession();
    el.session = s;
    el.session = null;
    el.messages = [createMessage({ role: 'user', id: 'u1', content: [{ type: 'text', text: 'x' }] })];
    expect(el.$$('.ms .m').length).toBe(1);
  });
});

describe('af-chat composer 与事件', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('Enter 发送（af-chat:send）并清空输入；Shift+Enter 换行不发送', () => {
    const el = makeChat();
    const handler = vi.fn();
    el.addEventListener('af-chat:send', handler);
    const ta = el.$('.in');
    ta.value = '你好';
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { text: '你好' } }));
    expect(ta.value).toBe('');
    ta.value = '二行';
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('空文本不发送', () => {
    const el = makeChat();
    const handler = vi.fn();
    el.addEventListener('af-chat:send', handler);
    el.$('.in').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('绑定模式：发送按钮点击调 session.send；流式中按钮变停止且点击调 abort', async () => {
    const el = makeChat();
    const s = mockSession();
    el.session = s;
    el.$('.in').value = 'hi';
    el.$('.sd').click();
    expect(s.send).toHaveBeenCalledWith('hi');
    // 模拟流式
    s.state = 'streaming';
    s.notify();
    expect(el.busy).toBe(true);
    expect(el.$('.sd').textContent).toBe('停止');
    el.$('.sd').click();
    expect(s.abort).toHaveBeenCalled();
    expect(el.busy).toBe(true); // abort 后由 session 状态机复位，此处仅验证事件
    const abortHandler = vi.fn();
    el.addEventListener('af-chat:abort', abortHandler);
    el.$('.sd').click();
    expect(abortHandler).toHaveBeenCalled();
  });

  it('受控模式：点击发送只发事件不调 session', () => {
    const el = makeChat();
    const handler = vi.fn();
    el.addEventListener('af-chat:send', handler);
    el.$('.in').value = 'x';
    el.$('.sd').click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('actions chip：发 af-chat:action + 绑定模式内部 send', () => {
    const el = makeChat();
    const s = mockSession();
    el.session = s;
    s.messages.push(createMessage({ role: 'assistant', id: 'a1', content: [
      { type: 'card', id: 'c9', card: { kind: 'actions', options: [{ label: '今天', value: 'today' }] } },
    ] }));
    s.notify();
    expect(el.$('.cs').hidden).toBe(false);
    const handler = vi.fn();
    el.addEventListener('af-chat:action', handler);
    el.$('.cb').click();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { cardId: 'c9', value: 'today' } }));
    expect(s.send).toHaveBeenCalledWith('today');
  });

  it('confirm 卡片按钮：发 af-chat:confirm（accepted true/false）', () => {
    const el = makeChat();
    el.messages = [createMessage({ role: 'assistant', id: 'a1', content: [
      { type: 'card', id: 'c1', card: { kind: 'confirm', title: '确认删除' } },
    ] })];
    const handler = vi.fn();
    el.addEventListener('af-chat:confirm', handler);
    el.querySelector('[data-card-id="c1"] [data-confirm]').click();
    el.querySelector('[data-card-id="c1"] [data-cancel]').click();
    expect(handler.mock.calls[0][0].detail).toEqual({ cardId: 'c1', accepted: true });
    expect(handler.mock.calls[1][0].detail).toEqual({ cardId: 'c1', accepted: false });
  });

  it('绑定模式错误：session.send reject → af-chat:error + 错误条 + 重试重发', async () => {
    const el = makeChat();
    const s = mockSession({ send: vi.fn()
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce() });
    el.session = s;
    const errHandler = vi.fn();
    el.addEventListener('af-chat:error', errHandler);
    el.$('.in').value = 'hi';
    el.$('.sd').click();
    await vi.waitFor(() => expect(errHandler).toHaveBeenCalled());
    const bar = el.$('.eb');
    expect(bar).not.toBeNull();
    expect(bar.textContent).toContain('网络错误');
    bar.querySelector('.rt').click();
    expect(s.send).toHaveBeenCalledTimes(2);
    expect(s.send).toHaveBeenLastCalledWith('hi');
  });
});
