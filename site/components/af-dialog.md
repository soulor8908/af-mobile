# af-dialog

> P0 · 模态框

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| open | `boolean` |  | 是否打开 |
| title | `string` | '' | 标题 |
| closeOnEsc | `boolean` | true | Esc 关闭 |
| closeOnBackdrop | `boolean` | true | 点击遮罩关闭 |
| variant | `string` | 'default' | 变体（default/center/bottom） |
| returnValue | `string \| null` |  | 返回值（close 时设置） |
| isOpen *(readonly)* | `boolean` |  | 是否已打开（只读） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-dialog:open` | 触发时：组件内 emit 调用 |
| `af-dialog:close` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `open(): void` | 打开对话框 |
| `close(action?: string): void` | 关闭对话框 |
<!-- gen:end:api -->
