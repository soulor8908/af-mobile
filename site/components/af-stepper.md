# af-stepper

> v1.5.0 · 数量选择器

## 示例

### 数量选择

```html
<div class="card p-3">
          <div class="cell"><span class="body">购买数量</span><af-stepper id="st" value="2"></af-stepper></div>
          <div class="cell"><span class="body">限购(1-5)</span><af-stepper id="st2" min="1" max="5" value="3"></af-stepper></div>
          <div class="cell"><span class="body">步长 5</span><af-stepper id="st3" step="5" max="100" value="10"></af-stepper></div>
        </div>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| value | `number` | 0 | 当前值 |
| min | `number` | 0 | 最小值 |
| max | `number` | 99 | 最大值 |
| step | `number` | 1 | 步长 |
| disabled | `boolean` | false | 禁用 |
| ariaLabel | `string` | null | aria-label 文案 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-stepper:change` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `setValue(value: number, silent?: boolean): void` | 设置值（自动 clamp 到 min/max） |
<!-- gen:end:api -->
