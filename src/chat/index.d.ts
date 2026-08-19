// @af-mobile/ui/chat —— AI 对话子库：框架无关会话核心的类型声明

/// <reference lib="dom" />

export interface TextBlock {
  type: 'text';
  text: string;
}
export interface ToolCallBlock {
  type: 'tool_call';
  id: string;
  name: string;
  args: Record<string, unknown>;
}
export interface ToolResultBlock {
  type: 'tool_result';
  id: string;
  result: unknown;
}
export interface CardPayload {
  kind: 'confirm' | 'list' | 'actions';
  title?: string;
  rows?: Array<{ label: string; value: string }>;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  items?: Array<{ title: string; desc?: string; meta?: string }>;
  options?: Array<{ label: string; value: string }>;
}
export interface CardBlock {
  type: 'card';
  id?: string;
  card: CardPayload;
}
export type ContentBlock = TextBlock | ToolCallBlock | ToolResultBlock | CardBlock;

export interface Message {
  role: 'user' | 'assistant' | 'tool' | 'system';
  id: string;
  content: ContentBlock[];
}

export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => unknown | Promise<unknown>;
}

export interface SessionOptions {
  endpoint: string;
  systemPrompt?: string | (() => string);
  tools?: Tool[];
  requestFn?: (url: string, init: RequestInit) => Promise<Response>;
  maxToolRounds?: number;
  onMessage?: (msg: Message) => void;
  initialMessages?: Array<Partial<Message>>;
}

export interface Session {
  messages: Message[];
  state: 'idle' | 'streaming' | 'error';
  send: (text: string) => Promise<void>;
  append: (msg: Partial<Message>) => Message;
  abort: () => void;
  subscribe: (fn: () => void) => () => void;
}

export declare function createSession(opts: SessionOptions): Session;
export declare function createMessage(init?: Partial<Message>): Message;
export declare function parseSSE(res: Response): AsyncGenerator<{ event: string; data: string }, void, unknown>;
export declare function defineTool(tool: Tool): Tool;

export class AfChat extends HTMLElement {
  messages: Message[];
  session: Session | null;
  placeholder: string | null;
  busy: boolean;
  focus(): void;
  scrollToBottom(): void;
  addEventListener<K extends keyof AfChatEventMap>(
    type: K, listener: (this: AfChat, ev: AfChatEventMap[K]) => void, options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

export interface AfChatEventMap {
  'af-chat:send': CustomEvent<{ text: string }>;
  'af-chat:action': CustomEvent<{ cardId: string | null; value: string }>;
  'af-chat:confirm': CustomEvent<{ cardId: string; accepted: boolean }>;
  'af-chat:abort': CustomEvent<Record<string, never>>;
  'af-chat:error': CustomEvent<{ message: string }>;
}

export declare const CHAT_TAGS: { 'af-chat': CustomElementConstructor };
export declare function registerChat(tag?: string): void;
