// @af-mobile/ui/chat —— AI 对话子库：框架无关的会话核心 + af-chat 组件
// 入口汇总导出：session / message / stream / tool / af-chat 组件
// 用法（原生 JS）：
//   import { registerChat, createSession } from '@af-mobile/ui/chat';
//   registerChat();
//   const session = createSession({ endpoint: '/api/chat' });
//   document.querySelector('af-chat').session = session;

export { createSession } from './session.js';
export { createMessage } from './message.js';
export { parseSSE } from './stream.js';
export { defineTool } from './tool.js';
// 多会话（D-014，可选能力）：af-chat 不静态依赖 sessions.js，tree-shaking 下不用不付费
export { createSessions, sessionsHTML, bindSessions } from './sessions.js';

// ct.* 字典随入口注册（addMessages 幂等合并，深路径导入组件时需自行 import './i18n.js'）
import './i18n.js';

import { AfChat } from './components/af-chat.js';

export { AfChat };

// 标签 → 类映射（registerChat 用）
export const CHAT_TAGS = { 'af-chat': AfChat };

// 注册 af-chat 组件（幂等，重复调用安全）
// 变参，与主库 register(...tags) 语义一致：registerChat() 默认注册 'af-chat'，
// registerChat('af-chat') 显式注册等价（旧签名，向后兼容）
export function registerChat(...tags) {
  for (const tag of (tags.length ? tags : ['af-chat'])) {
    const C = CHAT_TAGS[tag];
    if (!C) throw new Error(`[af-mobile/chat] 未知组件标签：${tag}`);
    if (!customElements.get(tag)) customElements.define(tag, C);
  }
}
