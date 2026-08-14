// @af-mobile/chat —— 框架无关会话核心的类型声明

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
export type ContentBlock = TextBlock | ToolCallBlock | ToolResultBlock;

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
