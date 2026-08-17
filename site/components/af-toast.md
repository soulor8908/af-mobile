# af-toast 轻提示

## 示例

## API
<!-- gen:start:props -->
| 属性 | 类型 | 说明 |
| --- | --- | --- |
| duration | `number` | 显示时长（ms） |
| message *(readonly)* | `string` | 当前消息（只读） |
| label | `string` |  |
| value | `string \| number` |  |
| index | `number` |  |
| value | `string \| number` |  |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-toast:dismiss` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `show` | `show(message: string, duration?: number): void` |
| `dismiss` | `dismiss(): void` |
<!-- gen:end:methods -->
