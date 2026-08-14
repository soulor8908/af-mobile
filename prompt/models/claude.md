# 模型特化：Claude（claude-3-5-sonnet 及以上）

- 偏好 XML 结构化标签，输出关键段用 `<output>` 包裹，便于解析
- 长上下文能力强，可一次输出完整页面；不得用占位符或省略号截断代码
- 遵循指令优先级：system > user > few-shot 示例
- 代码用 markdown 代码块输出，HTML 必须完整（`<html>...</html>`），不折叠不缩略
