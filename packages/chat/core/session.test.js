import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSession } from './session.js';
import { defineTool } from './tool.js';

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

function sse(frame) { return `data: ${JSON.stringify(frame)}\n\n`; }

afterEach(() => vi.unstubAllGlobals());

describe('createSession', () => {
  it('POST 消息流式累积 assistant 文本', async () => {
    const fetchMock = mockFetch({ chunks: [sse({ type: 'text', delta: '你' }), sse({ type: 'text', delta: '好' }), sse({ type: 'done' })] });
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({ endpoint: '/api/chat' });
    await session.send('hi');
    expect(session.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(session.messages[1].content).toEqual([{ type: 'text', text: '你好' }]);
    expect(session.state).toBe('idle');
    expect(fetchMock).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }));
  });

  it('tool_call 触发工具执行并插入 tool 消息', async () => {
    const execute = vi.fn(async () => 42);
    const fetchMock = mockFetch({ chunks: [sse({ type: 'tool_call', id: 't1', name: 'calc', args: { a: 1 } }), sse({ type: 'done' })] });
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({ endpoint: '/api/chat', tools: [defineTool({ name: 'calc', execute })] });
    await session.send('计算');
    expect(execute).toHaveBeenCalledWith({ a: 1 });
    expect(session.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool']);
    expect(session.messages[2].content[0]).toMatchObject({ type: 'tool_result', id: 't1', result: 42 });
  });

  it('未知工具返回 error 结果', async () => {
    vi.stubGlobal('fetch', mockFetch({ chunks: [sse({ type: 'tool_call', id: 't1', name: 'nope', args: {} }), sse({ type: 'done' })] }));
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
    const fetchMock = mockFetch({ chunks: ['data: not-json\n\n', sse({ type: 'done' })] });
    vi.stubGlobal('fetch', fetchMock);
    const session = createSession({ endpoint: '/api/chat' });
    await session.send('hi');
    expect(session.messages[1].content).toEqual([]);
  });

  it('subscribe 在消息变更时收到通知', async () => {
    vi.stubGlobal('fetch', mockFetch({ chunks: [sse({ type: 'done' })] }));
    const session = createSession({ endpoint: '/api/chat' });
    const fn = vi.fn();
    session.subscribe(fn);
    await session.send('hi');
    expect(fn).toHaveBeenCalled();
  });
});
