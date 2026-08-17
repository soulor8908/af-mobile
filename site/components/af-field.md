# af-field 表单字段

## 示例

## API
<!-- gen:start:props -->
| 属性 | 类型 | 说明 |
| --- | --- | --- |
| label | `string` | 标签 |
| icon | `string` | 前置图标 |
| type | `'input' \| 'textarea'` | 控件类型（input/textarea） |
| inputType | `string` | input 元素 type 属性（text/password/email...） |
| value | `string` | 当前值 |
| placeholder | `string` | 占位文案 |
| help | `string` | 帮助文本 |
| error | `string` | 校验错误消息 |
| disabled | `boolean` | 禁用 |
| readonly | `boolean` | 只读 |
| ariaLabel | `string` | aria-label 文案 |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-field:input` |  |
| `af-field:change` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `setError` | `setError(msg: string): void` |
| `focus` | `focus(): void` |
<!-- gen:end:methods -->
