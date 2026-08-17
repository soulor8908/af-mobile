# af-stepper 步进器
<!-- gen:start:scenarios -->
## 示例

<iframe src="/empty"></iframe>
### 1. 数量选择
```html

        <div class="card p-3">
          <div class="cell"><span class="body">购买数量</span><af-stepper id="st" value="2"></af-stepper></div>
          <div class="cell"><span class="body">限购(1-5)</span><af-stepper id="st2" min="1" max="5" value="3"></af-stepper></div>
          <div class="cell"><span class="body">步长 5</span><af-stepper id="st3" step="5" max="100" value="10"></af-stepper></div>
        </div>
```
<!-- gen:end:scenarios -->
<!-- gen:start:props -->
## API

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| value | `number` | 当前值 |
| min | `number` | 最小值 |
| max | `number` | 最大值 |
| step | `number` | 步长 |
| disabled | `boolean` | 禁用 |
| ariaLabel | `string` | aria-label 文案 |
| value | `string` |  |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-stepper:change` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `setValue` | `setValue(value: number, silent?: boolean): void` |
<!-- gen:end:methods -->
