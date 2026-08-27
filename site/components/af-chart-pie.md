# af-chart-pie

> charts 子库 · 饼/环形/半环/玫瑰

## 在线调试

<iframe src="../demo/playground/index.html?c=af-chart-pie" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 基础饼图

```html
<af-chart-pie data='[{"label":"线上","value":62},{"label":"线下","value":38}]'></af-chart-pie>
```

### 环形图（带中心 KPI 文案）

```html
<af-chart-pie data='[{"label":"线上","value":62},{"label":"线下","value":38}]'
              variant="donut" center-text="{total}"></af-chart-pie>
```

### 玫瑰图（半径映射数值）

```html
<af-chart-pie data='[{"label":"A","value":30},{"label":"B","value":60},{"label":"C","value":90}]'
              variant="rose" legend></af-chart-pie>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| data | `ChartDatum[]` |  | 单序列数据 |
| variant | `'pie' \| 'donut' \| 'half' \| 'rose'` |  | pie \| donut \| half（半环）\| rose（半径映射数值，面积正比） |
| innerRadius | `number` |  | donut 内径百分比（0-99，默认 60） |
| centerText | `string` |  | donut/half 中心 KPI 文案（{total} 占位符替换合计） |
| height | `number` |  | 图表高度 px |
| legend | `boolean` |  | 显示图例 |
| loading | `boolean` |  | loading 态 |
| error | `string` |  | error 态文案 |
| lazy | `boolean` |  | 离屏懒渲染 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-chart-pie:select` | 触发时：组件内 emit 调用 |
| `af-chart-pie:retry` | 触发时：组件内 emit 调用 |
<!-- gen:end:api -->
