# af-toast

> P1 · 轻提示

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| duration | `number` | 2000 | 显示时长（ms） |
| message *(readonly)* | `string` |  | 当前消息（只读） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-toast:dismiss` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `show(message: string, duration?: number): void` | 显示提示 |
| `dismiss(): void` | 关闭提示 |
<!-- gen:end:api -->
