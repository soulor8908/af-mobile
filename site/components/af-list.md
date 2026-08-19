# af-list

> P0 · 长列表虚拟滚动

## 在线调试

<iframe src="../demo/playground/?c=af-list" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 长列表

```html
<style>
          /* subtitle 拆段配色：货币符号 muted，价格品牌色高亮（var(--*) 不硬编码） */
          .subtitle [data-role="currency"] { color: var(--c-muted); }
          .subtitle [data-role="price"] { color: var(--c-brand); font-weight: var(--fw-medium); }
        </style>
        <af-list id="list"></af-list>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| data | `unknown[]` | '[]' | 列表数据 |
| totalCount | `number` |  | 总数（用于分页终止；未设置时为 Infinity） |
| itemHeight | `number` | 48 | 每项固定高度（px） |
| height | `string` | '' | 显式高度（如 '400px'，使虚拟滚动生效） |
| pageSize | `number` | 20 | 页大小（loadmore page 步长） |
| buffer | `number` | 5 | 缓冲项数 |
| mode | `'normal' \| 'compact'` | 'normal' | 模式：normal 用 .list-item，compact 用 .list-item-compact |
| refresh | `boolean` | true | 是否启用下拉刷新 |
| loading | `boolean` | false | 加载中状态（显示骨架屏） |
| emptyText | `string` | null | 空状态文案 |
| renderItem | `(item: unknown, index: number) => string` |  | 自定义渲染函数（返回 HTML 字符串） |
| scrollTop *(readonly)* | `number` |  | 当前滚动位置（只读） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-list:itemclick` | 触发时：组件内 emit 调用 |
| `af-list:loadmore` | 触发时：组件内 emit 调用 |
| `af-list:refresh` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `endLoadMore(hasMore: boolean): void` | 结束上拉加载（传入 hasMore=false 显示"没有更多了"） |
| `endRefresh(): void` | 结束下拉刷新（收起刷新指示器） |
<!-- gen:end:api -->
