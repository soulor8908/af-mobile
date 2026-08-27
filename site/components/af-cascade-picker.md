# af-cascade-picker

> v1.3.0 · 级联选择器，复用 af-picker 滚轮内核

## 在线调试

<iframe src="../demo/playground/index.html?c=af-cascade-picker" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 省市区选择

```html
<div class="card">
          <div class="cell"><span class="body">地区</span><button class="btn btn-sm btn-ghost" onclick="document.getElementById('cp').open()">选择</button></div>
        </div>
        <p class="caption" id="cp-log">点击「选择」打开级联面板，滚轮选择省 / 市 / 区。</p>
        <af-cascade-picker id="cp" title="选择地区"></af-cascade-picker>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| tree | `CascadeNode[]` | '[]' | 树形级联数据 |

### 事件

| 事件名 | 说明 |
| --- | --- |


### 方法

| 签名 | 说明 |
| --- | --- |

<!-- gen:end:api -->
