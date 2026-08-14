// 会话管理：维护消息列表、发送/中止、状态机（idle/streaming/error）
// 设计要点：框架无关，仅依赖 message.js + stream.js，不引用 DOM/React/Vue

/**
 * @typedef {Object} SessionOptions
 * @property {string} endpoint - SSE 流式接口地址
 * @property {import('./tool.js').Tool[]} [tools] - 工具注册表
 * @property {(msg: import('./message.js').Message) => void} [onMessage] - 消息回调
 */

/**
 * 创建一个会话实例
 * @param {SessionOptions} opts
 */
export function createSession(opts) {
  throw new Error('createSession: 待实现（chat 骨架）');
}
