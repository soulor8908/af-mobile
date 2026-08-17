# af-switch

> v1.2.0 · 开关切换

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| checked | `boolean` | false | 开关状态 |
| disabled | `boolean` | false | 禁用 |
| loading | `boolean` | false | 加载中（显示 spinner，禁用交互） |
| size | `'sm' \| 'md'` | 'md' | 尺寸变体 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-switch:change` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `toggle(force?: boolean): void` | 切换开关（传参则强制设为该值） |
<!-- gen:end:api -->
