# af-calendar

> v1.3.0 · 日历

## 在线调试

<iframe src="../demo/playground/?c=af-calendar" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 日期选择

```html
<af-calendar id="cal"></af-calendar>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| value | `string` | null | 选中日期（YYYY-MM-DD） |
| month | `string` | null | 展示月份（YYYY-MM，缺省为当前月） |
| min | `string` | null | 可选区间下限（YYYY-MM-DD） |
| max | `string` | null | 可选区间上限（YYYY-MM-DD） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-calendar:select` | 触发时：组件内 emit 调用 |
| `af-calendar:monthchange` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |

<!-- gen:end:api -->
