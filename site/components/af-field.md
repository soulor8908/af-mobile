# af-field

> v1.5.0 · 结构化表单字段

## 在线调试

<iframe src="../demo/playground/?c=af-field" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| label | `string` | '' | 标签 |
| icon | `string` | '' | 前置图标 |
| type | `'input' \| 'textarea'` | 'input' | 控件类型（input/textarea） |
| inputType | `string` | 'text' | input 元素 type 属性（text/password/email...） |
| value | `string` | '' | 当前值 |
| placeholder | `string` | '' | 占位文案 |
| help | `string` | '' | 帮助文本 |
| error | `string` | '' | 校验错误消息 |
| disabled | `boolean` | false | 禁用 |
| readonly | `boolean` | false | 只读 |
| ariaLabel | `string` | '' | aria-label 文案 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-field:input` | 触发时：组件内 emit 调用 |
| `af-field:change` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `setError(msg: string): void` | 设置校验错误（空字符串清除） |
| `focus(): void` | 聚焦输入框 |
<!-- gen:end:api -->
