# af-dialog

> P0 · 模态框

## 在线调试

<iframe src="../demo/playground/index.html?c=af-dialog" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

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

## 定制

`af-dialog` 是 Shadow DOM 组件，内部节点**不可**从外部选择器穿透（`af-dialog [data-role="body"]` 这类写法是死代码，ESLint 规则 `no-af-pierce` 会直接报错）。官方扩展点只有下面两类。

### CSS 自定义属性

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `--af-dialog-w` | `320px`（center 变体 `280px`） | 对话框宽度，受 `max-width: 90vw` 约束，窄屏不会被撑破 |

```css
/* 全局或按实例覆盖 */
af-dialog { --af-dialog-w: 300px; }
af-dialog[variant="center"] { --af-dialog-w: 260px; }
```

### ::part()

| part | 说明 |
| --- | --- |
| `dialog` | 对话框容器（宽度、圆角、背景在此改） |
| `header` | 标题栏 |
| `close` | 右上角关闭按钮 |
| `content` | 内容区（对应 `slot="body"`） |
| `footer` | 底部操作区（对应 `slot="footer"`） |

```css
af-dialog::part(content) { padding: 24px; }
af-dialog::part(footer)  { gap: 12px; }
```
