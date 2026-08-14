// SSE 流式解析：把 ReadableStream 字节流拆成 {event, data} 帧
// 2022+ 原生：基于 async iterator + TextDecoder，不依赖 EventSource（不支持 POST/stream 中断）

/**
 * 解析 SSE 流，异步产出每一帧
 * @param {Response} response - fetch 返回的 Response（response.body 为 ReadableStream）
 * @returns {AsyncGenerator<{event?: string, data: string}>}
 */
export async function* parseSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let event;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = frame.trim();
      if (!line) continue;
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) yield { event, data: line.slice(5).trim() };
    }
  }
}
