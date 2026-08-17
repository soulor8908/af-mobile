# af-dialog

> P0 · 模态框

## 示例

### 基础用法

```html
<af-dialog open title="确认操作">
          <div slot="body"><p class="body">确定要删除这条记录吗？此操作不可撤销。</p></div>
          <div slot="footer">
            <button class="btn btn-ghost btn-block" onclick="document.querySelector('af-dialog').close()">取消</button>
            <button class="btn btn-danger btn-block" onclick="document.querySelector('af-dialog').close('confirm')">删除</button>
          </div>
        </af-dialog>
        <div class="actions">
          <button class="btn" onclick="document.querySelector('af-dialog').open()">打开对话框</button>
        </div>
```

### 居中变体

```html
<af-dialog open variant="center" title="居中弹窗">
          <div slot="body"><p class="body">居中变体对话框，聚焦核心内容，适合轻量确认。</p></div>
          <div slot="footer">
            <button class="btn btn-block" onclick="document.querySelector('af-dialog').close()">知道了</button>
          </div>
        </af-dialog>
        <div class="actions">
          <button class="btn" onclick="document.querySelector('af-dialog').open()">打开对话框</button>
        </div>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| open | `boolean` |  | 是否打开 |
| title | `string` | '' | 标题 |
| closeOnEsc | `boolean` | true | Esc 关闭 |
| closeOnBackdrop | `boolean` | true | 点击遮罩关闭 |
| variant | `string` | 'default' | 变体（default/center/bottom） |
| returnValue | `string \| null` |  | 返回值（close 时设置） |
| isOpen *(readonly)* | `boolean` |  | 是否已打开（只读） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-dialog:open` | 触发时：组件内 emit 调用 |
| `af-dialog:close` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `open(): void` | 打开对话框 |
| `close(action?: string): void` | 关闭对话框 |
<!-- gen:end:api -->
