# af-chart-funnel

> charts 子库 · 漏斗（梯形堆叠 + 层间转化率标注）

## 示例

### 基础漏斗

```html
<af-chart-funnel data='[{"label":"曝光","value":10000},{"label":"点击","value":3000},{"label":"下单","value":800},{"label":"支付","value":200}]'></af-chart-funnel>
```

### 带层间转化率

```html
<af-chart-funnel data='[{"label":"曝光","value":10000},{"label":"点击","value":3000},{"label":"下单","value":800},{"label":"支付","value":200}]'
  show-rate></af-chart-funnel>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| data | `ChartDatum[]` |  | 层数据 [{label,value}]（自动按 value 降序排，非正值过滤） |
| showRate | `boolean` |  | 层间转化率标注（v[i]/v[i-1] 百分比） |
| height | `number` |  | 图表高度 px |
| legend | `boolean` |  | 显示图例 |
| loading | `boolean` |  | loading 态 |
| error | `string` |  | error 态文案 |
| lazy | `boolean` |  | 离屏懒渲染 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-chart-funnel:select` | 触发时：组件内 emit 调用 |
| `af-chart-funnel:retry` | 触发时：组件内 emit 调用 |
<!-- gen:end:api -->
