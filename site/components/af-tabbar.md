# af-tabbar

> v1.5.0 · 底部标签栏

## 在线调试

<iframe src="../demo/playground/?c=af-tabbar" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| tabs | `TabbarItem[]` | '[]' | 标签配置 |
| activeIndex | `number` | 0 | 当前激活索引 |
| fixed | `boolean` | true | 固定在底部 |
| ariaLabel | `string` | null | aria-label 文案 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-tabbar:change` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `setActive(index: number, silent?: boolean): void` | 设置激活标签 |
<!-- gen:end:api -->
