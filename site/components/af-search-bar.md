# af-search-bar

> v1.2.0 · 搜索栏

## 示例

### 搜索栏

```html
<div class="actions">
          <button class="btn btn-ghost btn-block" id="sb-focus">聚焦搜索</button>
        </div>
        <af-search-bar id="sb" placeholder="搜索商品、店铺"></af-search-bar>
        <p class="caption" id="sb-log">输入内容查看事件</p>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| value | `string` | '' | 输入值 |
| placeholder | `string` | null | 占位文案 |
| clearable | `boolean` | true | 是否显示清除按钮 |
| debounce | `number` | 300 | 防抖时间（ms，0 表示不防抖） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-search-bar:input` | 触发时：组件内 emit 调用 |
| `af-search-bar:search` | 触发时：组件内 emit 调用 |
| `af-search-bar:clear` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `focus(): void` | 聚焦输入框 |
<!-- gen:end:api -->
