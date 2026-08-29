// @af-mobile/ui/chat —— AI 对话子库：框架无关会话核心的类型声明

/// <reference lib="dom" />

export interface TextBlock {
  type: 'text';
  text: string;
}
/** 推理内容（DeepSeek-R1 / o1 类 reasoning_content 聚合）；UI 折叠展示，不回传 API */
export interface ThinkBlock {
  type: 'think';
  text: string;
}
export interface ToolCallBlock {
  type: 'tool_call';
  id: string;
  name: string;
  /** 芯片显示名（来自 Tool.label），缺省回落 name */
  label?: string;
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
export type ContentBlock = TextBlock | ThinkBlock | ToolCallBlock | ToolResultBlock | CardBlock;

export interface Message {
  role: 'user' | 'assistant' | 'tool' | 'system';
  id: string;
  content: ContentBlock[];
}

export interface Tool {
  name: string;
  /** UI 芯片显示的人类可读短名；缺省回落到 name */
  label?: string;
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
  /**
   * 请求失败后重发最后一条 user 消息：不重复 push（避免上下文出现两条相同 user 消息），
   * 并丢弃失败轮在其后产生的 assistant/tool 残片
   */
  retry: () => Promise<void>;
  /** 重新生成：丢弃末条 user 之后的残片重新流式；流式中/无 user 消息时空操作。副作用工具须 confirm 前置（D-013） */
  regenerate: () => Promise<void>;
  /** 编辑重发：移除指定 user 消息及其后全部，以新文本重新 push 并流式；UI 编辑入口由宿主自建 */
  resend: (id: string, text: string) => Promise<void>;
  /** 清空会话（新建对话）：原地清空 messages 并通知订阅者（外部直接改数组不会通知 UI） */
  clear: () => void;
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
  /** 清空会话（新建对话）：清卡片投影 + 内核/受控数组，重渲染回空态 */
  clear(): void;
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
  /** 输入草稿变化（input 事件）；持久化由宿主负责 */
  'af-chat:draft': CustomEvent<{ text: string }>;
  /** 绑定模式忙碌排队：流式中发送/Enter/chip 触发，回空闲后自动消化发送 */
  'af-chat:queued': CustomEvent<{ text: string }>;
}

export declare const CHAT_TAGS: { 'af-chat': CustomElementConstructor };
export declare function registerChat(tag?: string): void;

/** 多会话记录（localStorage 持久化单元；messages 与 session.messages 同引用） */
export interface SessionRecord {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
}
export interface SessionsOptions {
  /** 透传 createSession */
  endpoint?: string;
  requestFn?: (url: string, init: RequestInit) => Promise<Response>;
  tools?: Tool[];
  systemPrompt?: string | (() => string);
  /** localStorage key；缺省内存模式（SSR/测试安全） */
  storage?: string;
}
export interface Sessions {
  records: SessionRecord[];
  readonly activeId: string | null;
  active(): Session | null;
  /** 无效 id 不通知 */
  select(id: string): void;
  /** 自动激活新会话；默认标题取 cs.new */
  create(): SessionRecord;
  /** 删 active 时自动切最近一条 */
  remove(id: string): void;
  subscribe(fn: () => void): () => boolean;
}
/** 多会话仓库（D-014；持久化防抖 300ms，结构性操作同步 flush） */
export declare function createSessions(opts?: SessionsOptions): Sessions;
/** 列表 HTML（全 L2 白名单 class；active 项 aria-current="true"，样式宿主 1 行可选） */
export declare function sessionsHTML(store: Sessions): string;
/** 渲染 + 事件委托 + 自动重渲染；传 target（af-chat）则自动换绑 session（含初次） */
export declare function bindSessions(el: HTMLElement, store: Sessions, target?: HTMLElement): void;
