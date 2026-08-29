import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSession } from '../src/chat/session.js';
import { defineTool } from '../src/chat/tool.js';

function mockFetch({ ok = true, status = 200, chunks = [] } = {}) {
  return vi.fn(async () => {
    if (!ok) return { ok: false, status };
    return {
      ok: true,
      status,
      body: new ReadableStream({
        start(c) {
          for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch));
          c.close();
        },
      }),
    };
  });
}

/** OpenAI 标准 SSE 帧 */
function sse(data) { return `data: ${JSON.stringify(data)}\n\n`; }
function content(delta) { return sse({ choices: [{ delta: { content: delta } }] }); }
function toolCall(index, part) { return sse({ choices: [{ delta: { tool_calls: [{ index, ...part }] } }] }); }

/** 每轮返回固定内容：第一轮返回 first，其后各轮返回 rest（模拟工具执行后模型收敛为文本） */
function stagedFetch({ first, rest = ['data: [DONE]\n\n'] }) {
  let call = 0;
  return vi.fn(async () => {
    const chunks = call++ === 0 ? first : rest;
    return {
      ok: true,
      status: 200,
      body: new ReadableStream({
        start(c) {
          for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch));
          c.close();
        },
      }),
    };
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('createSession', () => {
  it('POST OpenAI SSE 流式累积 assistant 文本', async () => {
    const fetchMock = mockFetch({ chunks: [content('你'), content('好'), 'data: [DONE]\n\n'] });
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({ endpoint: '/api/chat' });
    await session.send('hi');
    expect(session.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(session.messages[1].content).toEqual([{ type: 'text', text: '你好' }]);
    expect(session.state).toBe('idle');
    expect(fetchMock).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.stream).toBe(true);
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('tool_call 分片聚合触发工具执行并插入 tool 消息', async () => {
    const execute = vi.fn(async () => 42);
    const fetchMock = stagedFetch({
      first: [
        toolCall(0, { id: 't1', type: 'function', function: { name: 'calc' } }),
        toolCall(0, { function: { arguments: '{"a":1}' } }),
        'data: [DONE]\n\n',
      ],
    });
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({ endpoint: '/api/chat', tools: [defineTool({ name: 'calc', execute })] });
    await session.send('计算');
    expect(execute).toHaveBeenCalledWith({ a: 1 });
    expect(session.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool']);
    expect(session.messages[1].content).toContainEqual({ type: 'tool_call', id: 't1', name: 'calc', args: { a: 1 } });
    expect(session.messages[2].content[0]).toMatchObject({ type: 'tool_result', id: 't1', result: 42 });
  });

  it('function calling 循环：工具执行后第二轮返回文本', async () => {
    const execute = vi.fn(async () => 42);
    const fetchMock = stagedFetch({
      first: [
        toolCall(0, { id: 't1', type: 'function', function: { name: 'calc', arguments: '{"a":1}' } }),
        'data: [DONE]\n\n',
      ],
    });
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({ endpoint: '/api/chat', tools: [defineTool({ name: 'calc', execute })] });
    await session.send('计算');
    // 第二轮请求体应包含 assistant(tool_calls) + tool 结果
    const body2 = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body2.messages).toContainEqual({
      role: 'assistant', content: null,
      tool_calls: [{ id: 't1', type: 'function', function: { name: 'calc', arguments: '{"a":1}' } }],
    });
    expect(body2.messages).toContainEqual({ role: 'tool', tool_call_id: 't1', content: '42' });
  });

  it('未知工具返回 error 结果', async () => {
    vi.stubGlobal('fetch', stagedFetch({ first: [toolCall(0, { id: 't1', type: 'function', function: { name: 'nope', arguments: '{}' } }), 'data: [DONE]\n\n'] }));
    const session = createSession({ endpoint: '/api/chat' });
    await session.send('x');
    expect(session.messages[2].content[0]).toMatchObject({ type: 'tool_result', result: { error: 'unknown tool: nope' } });
  });

  it('非 2xx 置 error 并抛出', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: false, status: 500 }));
    const session = createSession({ endpoint: '/api/chat' });
    await expect(session.send('hi')).rejects.toThrow(/500/);
    expect(session.state).toBe('error');
  });

  it('retry 失败重发：不重复 push user 消息（回归：UI 重试曾产生两条相同 user）', async () => {
    let call = 0;
    const fetchMock = vi.fn(async () => {
      call += 1;
      if (call === 1) return { ok: false, status: 500 };
      return {
        ok: true,
        status: 200,
        body: new ReadableStream({
          start(c) { c.enqueue(new TextEncoder().encode(content('好了') + 'data: [DONE]\n\n')); c.close(); },
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({ endpoint: '/api/chat' });
    await expect(session.send('加一个待办')).rejects.toThrow(/500/);
    await session.retry();
    const users = session.messages.filter((m) => m.role === 'user');
    expect(users).toHaveLength(1);
    expect(users[0].content[0].text).toBe('加一个待办');
    expect(call).toBe(2);
  });

  it('retry 丢弃失败轮的 assistant/tool 残片（tool_calls 无对应结果会 400）', async () => {
    let call = 0;
    const fetchMock = vi.fn(async () => {
      call += 1;
      const chunks = call === 1
        ? [content('思考中'), toolCall(0, { id: 't1', function: { name: 'noop', arguments: '{}' } }), 'data: [DONE]\n\n']
        : ['data: [DONE]\n\n'];
      return {
        ok: true,
        status: 200,
        body: new ReadableStream({
          start(c) { for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch)); c.close(); },
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({
      endpoint: '/api/chat',
      tools: [defineTool({ name: 'noop', async execute() { throw new Error('工具炸了'); } })],
    });
    await expect(session.send('跑一下')).rejects.toThrow(/工具炸了/);
    expect(session.messages.map((m) => m.role)).toContain('assistant');   // 失败轮留下了残片
    await session.retry();
    // 重试后只剩 user（残片已清理，且第二轮无内容不生成空 assistant）
    expect(session.messages.map((m) => m.role)).toEqual(['user']);
  });

  it('clear 清空会话：通知订阅者且数组引用不变（外部直接改 length 不会通知）', async () => {
    vi.stubGlobal('fetch', mockFetch({ chunks: [content('hi'), 'data: [DONE]\n\n'] }));
    const session = createSession({ endpoint: '/api/chat' });
    await session.send('x');
    const ref = session.messages;
    const fn = vi.fn();
    session.subscribe(fn);
    session.clear();
    expect(session.messages).toHaveLength(0);
    expect(session.messages).toBe(ref);   // 原地清空：外部持有的引用持续有效
    expect(fn).toHaveBeenCalled();        // 通知 UI 重渲染
  });

  it('tool_call 携带 label：UI 显示人类可读名，发往 API 的仍是 name', async () => {
    const sent = [];
    const requestFn = vi.fn(async (url, init) => {
      sent.push(JSON.parse(init.body));
      return {
        ok: true, status: 200,
        body: new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode(toolCall(0, { id: 't1', function: { name: 'get_stats', arguments: '{}' } }) + 'data: [DONE]\n\n'));
            c.close();
          },
        }),
      };
    });
    const session = createSession({
      endpoint: '/api/chat',
      requestFn,
      tools: [defineTool({ name: 'get_stats', label: '统计待办', description: 'd', async execute() { return 1; } })],
    });
    await session.send('统计');
    const call = session.messages[1].content[0];
    expect(call.label).toBe('统计待办');   // 给 UI
    expect(call.name).toBe('get_stats');   // 给模型协议
    const asst = sent[1].messages.find((m) => m.role === 'assistant');
    expect(asst.tool_calls[0].function.name).toBe('get_stats');   // 回传模型的仍是 name，不掺 label
  });

  it('abort 中止流式：复位 idle 且不向上抛错', async () => {
    const fetchMock = vi.fn((url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        reject(err);
      });
    }));
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({ endpoint: '/api/chat' });
    const p = session.send('hi');
    session.abort();
    await expect(p).resolves.toBeUndefined();
    expect(session.state).toBe('idle');
  });

  it('非法 JSON 帧被忽略不崩溃', async () => {
    const fetchMock = mockFetch({ chunks: ['data: not-json\n\n', 'data: [DONE]\n\n'] });
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({ endpoint: '/api/chat' });
    await session.send('hi');
    // 无有效帧：不生成空 assistant 消息
    expect(session.messages.map((m) => m.role)).toEqual(['user']);
  });

  it('subscribe 在消息变更时收到通知', async () => {
    vi.stubGlobal('fetch', mockFetch({ chunks: ['data: [DONE]\n\n'] }));
    const session = createSession({ endpoint: '/api/chat' });
    const fn = vi.fn();
    session.subscribe(fn);
    await session.send('hi');
    expect(fn).toHaveBeenCalled();
  });

  it('requestFn 自定义请求：注入 header 与 systemPrompt', async () => {
    const requestFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: new ReadableStream({
        start(c) { c.enqueue(new TextEncoder().encode('data: [DONE]\n\n')); c.close(); },
      }),
    }));
    const session = createSession({ endpoint: '/api/chat', systemPrompt: '你是会计助手', requestFn });
    await session.send('hi');
    const [url, init] = requestFn.mock.calls[0];
    expect(url).toBe('/api/chat');
    const body = JSON.parse(init.body);
    expect(body.messages[0]).toEqual({ role: 'system', content: '你是会计助手' });
  });
});

describe('createSession 富内容（D-013）', () => {
  it('reasoning_content 聚合为独立 think 块（相邻帧合并，与 text 块共存）', async () => {
    const think = (d) => sse({ choices: [{ delta: { reasoning_content: d } }] });
    const fetchMock = mockFetch({ chunks: [think('先'), think('想'), content('答'), 'data: [DONE]\n\n'] });
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({ endpoint: '/api/chat' });
    await session.send('hi');
    expect(session.messages[1].content).toEqual([
      { type: 'think', text: '先想' },
      { type: 'text', text: '答' },
    ]);
  });

  it('think 块不回传 API（toAPIMessages 忽略 think，无 text 时 content 为 null）', async () => {
    const sent = [];
    const think = (d) => sse({ choices: [{ delta: { reasoning_content: d } }] });
    const requestFn = vi.fn(async (url, init) => {
      sent.push(JSON.parse(init.body));
      const chunks = sent.length === 1
        ? [think('思考'), toolCall(0, { id: 't1', type: 'function', function: { name: 'noop', arguments: '{}' } }), 'data: [DONE]\n\n']
        : ['data: [DONE]\n\n'];
      return {
        ok: true, status: 200,
        body: new ReadableStream({
          start(c) { for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch)); c.close(); },
        }),
      };
    });
    const session = createSession({
      endpoint: '/api/chat', requestFn,
      tools: [defineTool({ name: 'noop', async execute() { return 1; } })],
    });
    await session.send('hi');
    const body2 = sent[1];   // 第二轮请求体（工具结果回传轮）
    const asst = body2.messages.find((m) => m.role === 'assistant');
    expect(asst.content).toBeNull();   // 无 text 块 → null（think 不拼接）
    expect(JSON.stringify(body2)).not.toContain('思考');
  });

  it('regenerate：丢弃末条 user 之后的残片重新流式，不重复 push user', async () => {
    let call = 0;
    const fetchMock = vi.fn(async () => {
      call += 1;
      // 第一轮 toolCall（留下残片）→ 工具执行后第二轮完成首次回答；regenerate 后第三轮重答
      const chunks = call === 1
        ? [toolCall(0, { id: 't1', type: 'function', function: { name: 'calc', arguments: '{}' } }), 'data: [DONE]\n\n']
        : [content('重答'), 'data: [DONE]\n\n'];
      return {
        ok: true, status: 200,
        body: new ReadableStream({
          start(c) { for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch)); c.close(); },
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({ endpoint: '/api/chat', tools: [defineTool({ name: 'calc', async execute() { return 42; } })] });
    await session.send('算');
    expect(session.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);
    await session.regenerate();
    // 残片（assistant+tool+旧回答）被清理，只剩 user + 新回答
    expect(session.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    const users = session.messages.filter((m) => m.role === 'user');
    expect(users).toHaveLength(1);
    expect(session.messages[1].content[0].text).toBe('重答');
  });

  it('regenerate 守卫：流式中 / 无 user 消息时空操作', async () => {
    const fetchMock = mockFetch({ chunks: [content('x'), 'data: [DONE]\n\n'] });
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({ endpoint: '/api/chat' });
    await expect(session.regenerate()).resolves.toBeUndefined();   // 无 user 消息
    expect(session.messages).toHaveLength(0);
    const p = session.send('hi');
    await expect(session.regenerate()).resolves.toBeUndefined();   // 流式中拒绝
    await p;
    expect(session.messages.filter((m) => m.role === 'user')).toHaveLength(1);
  });

  it('resend 编辑重发：移除指定 user 及其后全部，push 新文本', async () => {
    const fetchMock = mockFetch({ chunks: [content('好'), 'data: [DONE]\n\n'] });
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({ endpoint: '/api/chat' });
    await session.send('第一句');
    await session.send('第二句');
    expect(session.messages).toHaveLength(4);
    const first = session.messages[0];
    await session.resend(first.id, '改后的第一句');
    // 旧的第一句及其后全部被移除，只有新的 user + 新 assistant
    expect(session.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(session.messages[0].id).not.toBe(first.id);
    expect(session.messages[0].content[0].text).toBe('改后的第一句');
  });

  it('resend 守卫：流式中 / 未知 id 空操作', async () => {
    const fetchMock = mockFetch({ chunks: ['data: [DONE]\n\n'] });
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({ endpoint: '/api/chat' });
    await expect(session.resend('nope', 'x')).resolves.toBeUndefined();
    expect(session.messages).toHaveLength(0);
    const p = session.send('hi');
    await expect(session.resend('nope', 'x')).resolves.toBeUndefined();
    await p;
    expect(session.messages.map((m) => m.role)).toEqual(['user']);
  });
});
