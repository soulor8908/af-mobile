// 消息模型：user/assistant/tool 角色 + 内容分块（text/tool_call/tool_result）

/**
 * @typedef {Object} Message
 * @property {'user'|'assistant'|'tool'|'system'} role
 * @property {string} id
 * @property {Array<ContentBlock>} content
 */

/**
 * @typedef {Object} ContentBlock
 * @property {'text'|'tool_call'|'tool_result'} type
 * @property {string} [text]
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
