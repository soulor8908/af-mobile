// Vue 适配层：useChat Hook，把 core/session 桥接到 Vue 响应式状态
// 用法：import { useChat } from '@af-mobile/chat/vue';

import { ref } from 'vue';
import { createSession } from '../../core/session.js';

/**
 * @param {import('../../core/session.js').SessionOptions} opts
 */
export function useChat(opts) {
  const session = createSession(opts);
  const messages = ref(session.messages);
  const isStreaming = ref(session.state === 'streaming');
  session.subscribe(() => { isStreaming.value = session.state === 'streaming'; });
  const send = (text) => session.send(text);
  return { messages, isStreaming, send };
}
