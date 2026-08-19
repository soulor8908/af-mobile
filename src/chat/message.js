// 消息模型：user/assistant/tool 角色 + 内容分块（text/tool_call/tool_result/card）

/**
 * @typedef {Object} Message
 * @property {'user'|'assistant'|'tool'|'system'} role
 * @property {string} id
 * @property {Array<ContentBlock>} content
 */

/**
 * @typedef {Object} ContentBlock
 * @property {'text'|'tool_call'|'tool_result'|'card'} type
 * @property {string} [text]
 */

/**
 * 封闭卡片集 v1：confirm（diff 确认）/ list（结果列表）/ actions（快捷回复）
 * @typedef {Object} CardPayload
 * @property {'confirm'|'list'|'actions'} kind
 * @property {string} [title]
 * @property {Array<{label: string, value: string}>} [rows]
 * @property {string} [confirmText]
 * @property {string} [cancelText]
 * @property {boolean} [danger]
 * @property {Array<{title: string, desc?: string, meta?: string}>} [items]
 * @property {Array<{label: string, value: string}>} [options]
 */

/**
 * @param {Partial<Message>} [init]
 * @returns {Message}
 */
export function createMessage(init = {}) {
  return {
    role: init.role ?? 'user',
    id: init.id ?? crypto.randomUUID(),
    content: init.content ?? [],
  };
}
