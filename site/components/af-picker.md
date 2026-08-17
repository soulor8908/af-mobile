# af-picker

> P1 · 滚轮选择器

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| columns | `PickerItem[][]` | '[]' | 多列数据 |
| values | `(string \| number)[]` | '[]' | 各列选中值 |
| title | `string` | null | 标题 |
| confirmText | `string` | null | 确认按钮文案 |
| cancelText | `string` | null | 取消按钮文案 |
| itemHeight | `number` | 36 | 每项高度（px） |
| visibleCount | `number` | 5 | 可见项数 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-picker:change` | 触发时：组件内 emit 调用 |
| `af-picker:confirm` | 触发时：组件内 emit 调用 |
| `af-picker:cancel` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `open(): void` | 打开选择器 |
| `close(): void` | 关闭选择器 |
| `setColumn(colIdx: number, items: PickerItem[], value?: string \| number): void` | 联动：更新某列数据 |
<!-- gen:end:api -->
