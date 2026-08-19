# af-toast

> P1 · 轻提示

## 在线调试

<iframe src="../demo/playground/?c=af-toast" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 四种类型

```html
<div class="actions">
          <button class="btn" id="t-success">成功</button>
          <button class="btn btn-ghost" id="t-warning">警告</button>
          <button class="btn btn-danger" id="t-error">错误</button>
          <button class="btn btn-ghost" id="t-loading">加载中</button>
        </div>
        <af-toast id="toast"></af-toast>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| duration | `number` | 2500 | 显示时长（ms）；传 0 表示常驻，需手动 dismiss() |
| message *(readonly)* | `string` |  | 当前消息（只读） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-toast:dismiss` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `show(message: string, duration?: number): void` |  |
| `show(message: string, options?: ToastShowOptions): void` | 显示提示（对象形式，可指定 type / duration / closeOnClick） |
| `dismiss(): void` | 关闭提示 |
<!-- gen:end:api -->
