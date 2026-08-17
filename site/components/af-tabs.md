# af-tabs 标签页
<!-- gen:start:scenarios -->
## 示例

<iframe src="/empty"></iframe>
### 1. 基础标签页
```html

        <af-tabs id="tabs"></af-tabs>
```
<!-- gen:end:scenarios -->
<!-- gen:start:props -->
## API

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| tabs | `TabItem[]` | 标签配置 |
| activeIndex | `number` | 当前激活索引 |
| variant | `string` | 变体 |
| fixed | `boolean` | 固定 tabbar |
| action | `'confirm' \| 'cancel' \| 'close' \| 'esc' \| 'backdrop' \| 'external' \| null` |  |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-tabs:change` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `setActive` | `setActive(index: number, silent?: boolean): void` |
<!-- gen:end:methods -->
