# af-chart-line

> charts 子库 · 折线/面积/散点/迷你趋势（sparkline）

## 示例

### 基础折线

```html
<af-chart-line data='[{"label":"1月","value":120},{"label":"2月","value":150}]'></af-chart-line>
```

### 面积图（平滑 + 图例）

```html
<af-chart-line data='[{"label":"1月","value":120},{"label":"2月","value":150}]'
               variant="area" smooth legend></af-chart-line>
```

### 多序列对比

```html
<af-chart-line
  labels='["1月","2月","3月"]'
  series='[{"name":"今年","values":[120,150,180]},{"name":"去年","values":[100,120,140]}]'
  legend></af-chart-line>
```

### sparkline 嵌入（KPI 卡内嵌迷你趋势）

```html
<af-chart-line variant="spark" data='[{"value":12},{"value":18},{"value":15},{"value":22}]'></af-chart-line>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| data | `ChartDatum[]` |  | 单序列数据 [{label,value,color?}]（与 labels+series 互斥，series 优先） |
| labels | `string[]` |  | 多序列类目标签 |
| series | `ChartSeries[]` |  | 多序列 [{name,values}]（与 data 互斥，优先） |
| variant | `'line' \| 'area' \| 'scatter' \| 'spark'` |  | line \| area \| scatter \| spark |
| smooth | `boolean` |  | Catmull-Rom 平滑曲线（line/area 有效） |
| showAxis | `boolean` |  | 显示坐标轴（spark 自动忽略） |
| height | `number` |  | 图表高度 px（spark 变体默认 60，其余 240） |
| legend | `boolean` |  | 显示图例（色点 + 名称，只读） |
| loading | `boolean` |  | loading 态（图表形骨架 + aria-busy） |
| error | `string` |  | error 态文案（非空即错误态，含重试按钮 → af-chart-line:retry） |
| lazy | `boolean` |  | 离屏懒渲染（IntersectionObserver 首次可见才绘制） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-chart-line:select` | 触发时：组件内 emit 调用 |
| `af-chart-line:retry` | 触发时：组件内 emit 调用 |
<!-- gen:end:api -->
