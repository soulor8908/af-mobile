// @af-mobile/chat/vue —— Vue 适配层类型声明
import type { Message, SessionOptions } from '../../core/index.d.ts';

export declare function useChat(opts: SessionOptions): {
  messages: Message[];
  isStreaming: boolean;
  send: (text: string) => Promise<void>;
};
