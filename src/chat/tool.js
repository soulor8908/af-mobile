// 工具框架：注册可被 LLM 调用的工具，桥接 tool_call → 执行 → tool_result

/**
 * @typedef {Object} Tool
 * @property {string} name
 * @property {string} [label] - 人类可读短名（UI 芯片显示；缺省回落到 name）
 * @property {string} description
 * @property {Record<string, unknown>} [parameters] - JSON Schema
 * @property {(args: Record<string, unknown>) => Promise<unknown>|unknown} execute
 */

/**
 * 定义一个工具
 * @param {Tool} tool
 * @returns {Tool}
 */
export function defineTool(tool) {
  if (!tool.name || typeof tool.execute !== 'function') {
    throw new TypeError('defineTool: 需要 name 与 execute');
  }
  return tool;
}
