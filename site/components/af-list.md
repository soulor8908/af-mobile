# af-list 长列表（虚拟滚动）
<!-- gen:start:scenarios -->
## 示例

<iframe src="/empty"></iframe>

```html
<af-list id="list"></af-list>
```
<!-- gen:end:scenarios -->
<!-- gen:start:props -->
## API

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| data | `unknown[]` | 列表数据 |
| totalCount | `number` | 总数（用于分页终止；未设置时为 Infinity） |
| itemHeight | `number` | 每项固定高度（px） |
| height | `string` | 显式高度（如 '400px'，使虚拟滚动生效） |
| pageSize | `number` | 页大小（loadmore page 步长） |
| buffer | `number` | 缓冲项数 |
| mode | `'normal' \| 'compact'` | 模式：normal 用 .list-item，compact 用 .list-item-compact |
| refresh | `boolean` | 是否启用下拉刷新 |
| loading | `boolean` | 加载中状态（显示骨架屏） |
| emptyText | `string` | 空状态文案 |
| scrollTop *(readonly)* | `number` | 当前滚动位置（只读） |
| index | `number` |  |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-list:itemclick` |  |
| `af-list:loadmore` |  |
| `af-list:refresh` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `endLoadMore` | `endLoadMore(hasMore: boolean): void` |
| `endRefresh` | `endRefresh(): void` |
<!-- gen:end:methods -->
