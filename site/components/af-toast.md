# af-toast 轻提示
<!-- gen:start:scenarios -->
## 示例

<iframe src="/empty"></iframe>
### 1. 四种类型
```html

        <div class="actions">
          <button class="btn" id="t-success">成功</button>
          <button class="btn btn-ghost" id="t-warning">警告</button>
          <button class="btn btn-danger" id="t-error">错误</button>
          <button class="btn btn-ghost" id="t-loading">加载中</button>
        </div>
        <af-toast id="toast"></af-toast>
```
<!-- gen:end:scenarios -->
<!-- gen:start:props -->
## API

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| duration | `number` | 显示时长（ms） |
| message *(readonly)* | `string` | 当前消息（只读） |
| label | `string` |  |
| value | `string \| number` |  |
| index | `number` |  |
| value | `string \| number` |  |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-toast:dismiss` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `show` | `show(message: string, duration?: number): void` |
| `dismiss` | `dismiss(): void` |
<!-- gen:end:methods -->
