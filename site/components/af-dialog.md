# af-dialog 模态对话框
<!-- gen:start:scenarios -->
## 示例

<iframe src="/empty"></iframe>
### 1. 基础用法
```html

        <div class="actions">
          <button class="btn" id="dlg-open">打开对话框</button>
        </div>
        <af-dialog title="确认操作">
          <div slot="body"><p class="body">确定要删除这条记录吗？此操作不可撤销。</p></div>
          <div slot="footer">
            <button class="btn btn-ghost btn-block" id="dlg-cancel">取消</button>
            <button class="btn btn-danger btn-block" id="dlg-ok">删除</button>
          </div>
        </af-dialog>
```
### 2. 底部弹层
```html

        <div class="actions">
          <button class="btn" id="sheet-open">打开底部面板</button>
        </div>
        <af-dialog variant="bottom" title="选择操作">
          <div slot="body"><p class="body">底部弹出，常用于操作单选。</p></div>
          <div slot="footer">
            <button class="btn btn-block" id="sheet-ok">我知道了</button>
          </div>
        </af-dialog>
```
<!-- gen:end:scenarios -->
<!-- gen:start:props -->
## API

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| open | `boolean` | 是否打开 |
| title | `string` | 标题 |
| closeOnEsc | `boolean` | Esc 关闭 |
| closeOnBackdrop | `boolean` | 点击遮罩关闭 |
| variant | `string` | 变体（default/center/bottom） |
| returnValue | `string \| null` | 返回值（close 时设置） |
| isOpen *(readonly)* | `boolean` | 是否已打开（只读） |
| message | `string` |  |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-dialog:open` |  |
| `af-dialog:close` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `open` | `open(): void` |
| `close` | `close(action?: string): void` |
<!-- gen:end:methods -->
