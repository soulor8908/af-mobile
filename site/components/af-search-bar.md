# af-search-bar 搜索栏
<!-- gen:start:scenarios -->
## 示例

<iframe src="/empty"></iframe>
### 1. 搜索栏
```html

        <div class="actions">
          <button class="btn btn-ghost btn-block" id="sb-focus">聚焦搜索</button>
        </div>
        <af-search-bar id="sb" placeholder="搜索商品、店铺"></af-search-bar>
        <p class="caption" id="sb-log">输入内容查看事件</p>
```
<!-- gen:end:scenarios -->
<!-- gen:start:props -->
## API

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| value | `string` | 输入值 |
| placeholder | `string` | 占位文案 |
| clearable | `boolean` | 是否显示清除按钮 |
| debounce | `number` | 防抖时间（ms，0 表示不防抖） |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-search-bar:input` |  |
| `af-search-bar:search` |  |
| `af-search-bar:clear` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `focus` | `focus(): void` |
<!-- gen:end:methods -->
