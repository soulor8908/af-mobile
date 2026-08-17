# af-dropdown

> P2 · 下拉菜单

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| options | `DropdownOption[]` | '[]' | 选项列表 |
| value | `string` | '' | 当前值 |
| placeholder | `string` | null | 占位文案 |
| triggerClass | `string` | 'input' | 触发器 class（默认 input） |
| disabled | `boolean` | false | 禁用 |
| selectedLabel *(readonly)* | `string` |  | 选中项 label（只读） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-dropdown:select` | 触发时：组件内 emit 调用 |
| `af-dropdown:close` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `open(): void` | 打开下拉 |
| `close(): void` | 关闭下拉 |
<!-- gen:end:api -->
