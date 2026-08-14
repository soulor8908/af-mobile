// React 适配层：useChat Hook，把 core/session 桥接到 React 状态
// 用法：import { useChat } from '@af-mobile/chat/react';

import { useRef, useState, useCallback } from 'react';
import { createSession } from '../../core/session.js';

/**
 * @param {import('../../core/session.js').SessionOptions} opts
 */
export function useChat(opts) {
  const sessionRef = useRef(null);
  if (sessionRef.current === null) sessionRef.current = createSession(opts);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setStreaming] = useState(false);
  const send = useCallback((text) => sessionRef.current.send(text), []);
  return { messages, isStreaming, send };
}
