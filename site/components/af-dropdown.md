# af-dropdown

> P2 · 下拉菜单

## 在线调试

<iframe src="../demo/playground/index.html?c=af-dropdown" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 城市选择

```html
<div class="card p-3">
          <p class="body">选择收货城市</p>
          <af-dropdown id="dd" placeholder="请选择城市"></af-dropdown>
        </div>
        <p class="caption" id="dd-log">选中后显示 value</p>
```

### 禁用选项

```html
<div class="card p-3">
          <div class="cell"><span class="body">可用</span><af-dropdown id="dd2" value="周一"></af-dropdown></div>
          <div class="cell"><span class="body">含禁用项</span><af-dropdown id="dd3" value="周日"></af-dropdown></div>
        </div>
        <p class="caption" id="dd-log2">禁用的「周六」不可选</p>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| options | `DropdownOption[]` | '[]' | 选项列表 |
| value | `string` | '' | 当前值 |
| placeholder | `string` | null | 占位文案 |
| triggerClass | `string` | 'input' | 触发器 class（默认 input） |
| disabled | `boolean` | false | 禁用 |
| selectedLabel *(readonly)* | `string` |  | 选中项 label（只读） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-dropdown:select` | 触发时：组件内 emit 调用 |
| `af-dropdown:close` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `open(): void` | 打开下拉 |
| `close(): void` | 关闭下拉 |
<!-- gen:end:api -->
