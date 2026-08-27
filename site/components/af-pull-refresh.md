# af-pull-refresh

> v1.5.0 · 下拉刷新容器

## 在线调试

<iframe src="../demo/playground/index.html?c=af-pull-refresh" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 下拉触发刷新

```html
<af-pull-refresh id="pr">
          <div class="list">
            <div class="list-item"><div class="body">列表项 1</div></div>
            <div class="list-item"><div class="body">列表项 2</div></div>
            <div class="list-item"><div class="body">列表项 3</div></div>
          </div>
        </af-pull-refresh>
        <p class="caption" id="pr-log">下拉触发 af-pull-refresh:refresh（触摸设备体验更佳）</p>
        <div class="card">
          <button class="btn btn-ghost btn-block" onclick="document.getElementById('pr').endRefresh()">结束刷新</button>
        </div>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| refreshing | `boolean` | false | 加载中状态 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-pull-refresh:refresh` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `endRefresh(): void` | 结束刷新（收起指示器） |
<!-- gen:end:api -->
