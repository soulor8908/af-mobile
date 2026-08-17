# af-backtop

> P2 · 回到顶部

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| threshold | `number` | 200 | 出现阈值（scroll 距离 px） |
| target | `string` | '' | 滚动目标选择器（默认 window） |
| text | `string` | '↑' | 按钮文案 |
| ariaLabelText | `string` | null | aria-label 文案 |
| position | `'left-bottom' \| 'right-bottom'` | 'right-bottom' | 位置（left-bottom/right-bottom） |
| visible *(readonly)* | `boolean` |  | 是否可见（只读） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-backtop:click` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `scrollToTop(): void` | 平滑滚动到顶部 |
<!-- gen:end:api -->
