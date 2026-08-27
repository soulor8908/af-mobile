# af-progress

> v1.3.0 · 进度条

## 在线调试

<iframe src="../demo/playground/index.html?c=af-progress" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 进度推进

```html
<div class="card">
          <div class="cell"><span class="body">默认</span><af-progress id="p1" value="60"></af-progress></div>
          <div class="cell"><span class="body">下载中…</span><af-progress id="p2" value="0"></af-progress></div>
        </div>
        <div class="card">
          <button class="btn btn-ghost btn-block" onclick="var p1=document.getElementById('p1'),p2=document.getElementById('p2');p1.value=Math.min(100,p1.value+10);p2.value=Math.min(100,p2.value+10);">推进 +10</button>
        </div>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| value | `number` | 0 | 当前值 |
| max | `number` | 100 | 最大值 |
| color | `'brand' \| 'success' \| 'danger'` | 'brand' | 颜色变体（brand/success/danger） |

### 事件

| 事件名 | 说明 |
| --- | --- |


### 方法

| 签名 | 说明 |
| --- | --- |

<!-- gen:end:api -->
