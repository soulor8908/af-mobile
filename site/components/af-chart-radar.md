# af-chart-radar

> charts 子库 · 雷达（多维能力画像，单/双主体对比）

## 在线调试

<iframe src="../demo/playground/index.html?c=af-chart-radar" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 基础雷达图

```html
<af-chart-radar data='[{"label":"速度","value":80,"max":100},{"label":"力量","value":70,"max":100},{"label":"技巧","value":90,"max":100}]'></af-chart-radar>
```

### 双主体对比

```html
<af-chart-radar
  data='[{"label":"速度","max":100},{"label":"力量","max":100},{"label":"技巧","max":100}]'
  series='[{"name":"选手A","values":[80,70,90]},{"name":"选手B","values":[60,90,80]}]'
  legend></af-chart-radar>
```

### 圆形网格

```html
<af-chart-radar data='[{"label":"A","value":70,"max":100},{"label":"B","value":85,"max":100},{"label":"C","value":60,"max":100}]'
  shape="circle"></af-chart-radar>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| data | `RadarDatum[]` |  | 维度定义 [{label,value,max?}]（3-8 维） |
| series | `ChartSeries[]` |  | 对比主体 [{name,values}]（>2 个仅渲染前 2 并 console.warn） |
| shape | `'polygon' \| 'circle'` |  | polygon（多边形网格）\| circle（同心圆网格） |
| height | `number` |  | 图表高度 px |
| legend | `boolean` |  | 显示图例 |
| loading | `boolean` |  | loading 态 |
| error | `string` |  | error 态文案 |
| lazy | `boolean` |  | 离屏懒渲染 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-chart-radar:select` | 触发时：组件内 emit 调用 |
| `af-chart-radar:retry` | 触发时：组件内 emit 调用 |
<!-- gen:end:api -->
