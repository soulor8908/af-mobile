# af-chart-bar

> charts 子库 · 柱状/条形/堆叠/分组

## 在线调试

<iframe src="../demo/playground/index.html?c=af-chart-bar" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 基础柱状图

```html
<af-chart-bar data='[{"label":"1月","value":120},{"label":"2月","value":150}]'></af-chart-bar>
```

### 水平条形图

```html
<af-chart-bar data='[{"label":"A","value":120},{"label":"B","value":150}]'
              variant="bar"></af-chart-bar>
```

### 堆叠柱状图

```html
<af-chart-bar
  labels='["Q1","Q2","Q3","Q4"]'
  series='[{"name":"线上","values":[60,70,80,90]},{"name":"线下","values":[40,30,20,10]}]'
  variant="stacked" legend></af-chart-bar>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| data | `ChartDatum[]` |  | 单序列数据 |
| labels | `string[]` |  | 多序列类目标签 |
| series | `ChartSeries[]` |  | 多序列 |
| variant | `'column' \| 'bar' \| 'stacked' \| 'grouped'` |  | column（垂直柱）\| bar（水平条形）\| stacked（堆叠柱）\| grouped（分组柱） |
| maxCount | `number` |  | 类目数上限（超出截断为前 N-1 + "其他"聚合，默认 30） |
| height | `number` |  | 图表高度 px |
| legend | `boolean` |  | 显示图例 |
| loading | `boolean` |  | loading 态 |
| error | `string` |  | error 态文案 |
| lazy | `boolean` |  | 离屏懒渲染 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-chart-bar:select` | 触发时：组件内 emit 调用 |
| `af-chart-bar:retry` | 触发时：组件内 emit 调用 |
<!-- gen:end:api -->
