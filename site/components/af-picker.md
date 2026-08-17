# af-picker 滚轮选择器

## 示例

## API
<!-- gen:start:props -->
| 属性 | 类型 | 说明 |
| --- | --- | --- |
| columns | `PickerItem[][]` | 多列数据 |
| values | `(string \| number)[]` | 各列选中值 |
| title | `string` | 标题 |
| confirmText | `string` | 确认按钮文案 |
| cancelText | `string` | 取消按钮文案 |
| itemHeight | `number` | 每项高度（px） |
| visibleCount | `number` | 可见项数 |
| tree | `CascadeNode[]` | 树形级联数据 |
| label | `string` |  |
| value | `string \| number` |  |
| index | `number` |  |
| value | `string \| number` |  |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-picker:change` |  |
| `af-picker:confirm` |  |
| `af-picker:cancel` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `open` | `open(): void` |
| `close` | `close(): void` |
| `setColumn` | `setColumn(colIdx: number, items: PickerItem[], value?: string \| number): void` |
<!-- gen:end:methods -->
