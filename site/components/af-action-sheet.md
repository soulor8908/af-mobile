# af-action-sheet 底部面板
<!-- gen:start:scenarios -->
## 示例

<iframe src="/empty"></iframe>
### 1. 基础操作
```html

        <div class="actions">
          <button class="btn" id="as-open">打开操作面板</button>
        </div>
        <af-action-sheet id="sheet" title="选择操作"></af-action-sheet>
```
<!-- gen:end:scenarios -->
<!-- gen:start:props -->
## API

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| options | `ActionSheetOption[]` | 选项列表 |
| title | `string` | 标题 |
| showCancel | `boolean` | 显示取消按钮 |
| cancelText | `string` | 取消按钮文案 |
| label | `string` |  |
| value | `string \| number` |  |
| column | `number` |  |
| value | `string \| number` |  |
| index | `number` |  |
| values | `(string \| number)[]` |  |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-action-sheet:select` |  |
| `af-action-sheet:open` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `showPopover` | `showPopover(): void` |
| `hidePopover` | `hidePopover(): void` |
<!-- gen:end:methods -->
