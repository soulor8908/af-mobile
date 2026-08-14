// @af-mobile/chat —— 框架无关的会话核心
// 入口汇总导出：session / message / stream / tool
// 用法（原生 JS）：
//   import { createSession } from '@af-mobile/chat';
//   const session = createSession({ endpoint: '/api/chat' });
//   session.send('你好');

export { createSession } from './session.js';
export { createMessage } from './message.js';
export { parseSSE } from './stream.js';
export { defineTool } from './tool.js';
