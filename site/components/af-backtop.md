# af-backtop 回到顶部
<!-- gen:start:scenarios -->
## 示例

<!-- 无 Playground 场景（可补充 demo/scenarios/af-<tag>.js） -->
<!-- gen:end:scenarios -->
<!-- gen:start:props -->
## API

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| threshold | `number` | 出现阈值（scroll 距离 px） |
| target | `string` | 滚动目标选择器（默认 window） |
| text | `string` | 按钮文案 |
| ariaLabelText | `string` | aria-label 文案 |
| position | `'left-bottom' \| 'right-bottom'` | 位置（left-bottom/right-bottom） |
| visible *(readonly)* | `boolean` | 是否可见（只读） |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-backtop:click` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `scrollToTop` | `scrollToTop(): void` |
<!-- gen:end:methods -->
