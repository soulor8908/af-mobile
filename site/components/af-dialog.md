# af-dialog 模态对话框

## 示例

## API
<!-- gen:start:props -->
| 属性 | 类型 | 说明 |
| --- | --- | --- |
| open | `boolean` | 是否打开 |
| title | `string` | 标题 |
| closeOnEsc | `boolean` | Esc 关闭 |
| closeOnBackdrop | `boolean` | 点击遮罩关闭 |
| variant | `string` | 变体（default/center/bottom） |
| returnValue | `string \| null` | 返回值（close 时设置） |
| isOpen *(readonly)* | `boolean` | 是否已打开（只读） |
| message | `string` |  |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-dialog:open` |  |
| `af-dialog:close` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `open` | `open(): void` |
| `close` | `close(action?: string): void` |
<!-- gen:end:methods -->
