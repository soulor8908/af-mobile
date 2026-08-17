# af-countdown

> v1.3.0 · 倒计时

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| time | `number` | 60 | 总时长（秒） |
| autostart | `boolean` | true | 挂载后自动开始 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-countdown:change` | 触发时：组件内 emit 调用 |
| `af-countdown:end` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `start(): void` | 开始倒计时 |
| `pause(): void` | 暂停（保留剩余时间） |
| `reset(): void` | 重置到 time 初始值 |
<!-- gen:end:api -->
