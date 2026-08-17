# af-tabs

> P0 · 标签页切换

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| tabs | `TabItem[]` | '[]' | 标签配置 |
| activeIndex | `number` | 0 | 当前激活索引 |
| variant | `string` | 'default' | 变体 |
| fixed | `boolean` | false | 固定 tabbar |
| renderPanel | `(tab: TabItem, index: number) => string` |  | 自定义面板渲染函数 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-tabs:change` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `setActive(index: number, silent?: boolean): void` | 设置激活标签 |
<!-- gen:end:api -->
