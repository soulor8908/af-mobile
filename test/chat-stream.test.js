import { describe, it, expect } from 'vitest';
import { parseSSE } from '../src/chat/stream.js';

function fakeResponse(chunks) {
  return {
    body: new ReadableStream({
      start(c) {
        for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch));
        c.close();
      },
    }),
  };
}

async function collect(chunks) {
  const frames = [];
  for await (const f of parseSSE(fakeResponse(chunks))) frames.push(f);
  return frames;
}

describe('parseSSE', () => {
  it('解析单帧 data', async () => {
    expect(await collect(['data: hello\n\n'])).toEqual([{ event: undefined, data: 'hello' }]);
  });
  it('字节分块仍能正确组帧', async () => {
    expect(await collect(['data: he', 'llo\n\nevent: msg\n', 'data: hi\n\n'])).toEqual([
      { event: undefined, data: 'hello' },
      { event: 'msg', data: 'hi' },
    ]);
  });
});
