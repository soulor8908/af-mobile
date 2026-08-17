# af-action-sheet

> P1 · 底部操作面板

## 示例

### 基础操作

```html
<div class="actions">
          <button class="btn" id="as-open">打开操作面板</button>
        </div>
        <af-action-sheet id="sheet" title="选择操作"></af-action-sheet>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| options | `ActionSheetOption[]` | '[]' | 选项列表 |
| title | `string` | '' | 标题 |
| showCancel | `boolean` | true | 显示取消按钮 |
| cancelText | `string` | null | 取消按钮文案 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-action-sheet:select` | 触发时：组件内 emit 调用 |
| `af-action-sheet:open` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `showPopover(): void` | 显示面板 |
| `hidePopover(): void` | 隐藏面板 |
<!-- gen:end:api -->
