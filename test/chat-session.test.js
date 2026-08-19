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
