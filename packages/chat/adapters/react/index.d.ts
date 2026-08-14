// @af-mobile/chat/react —— React 适配层类型声明
import type { Message, SessionOptions } from '../../core/index.d.ts';

export interface UseChatResult {
  messages: Message[];
  isStreaming: boolean;
  send: (text: string) => Promise<void>;
}

export declare function useChat(opts: SessionOptions): UseChatResult;
