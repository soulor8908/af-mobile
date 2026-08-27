# af-notice-bar

> v1.3.0 · 公告通知栏

## 在线调试

<iframe src="../demo/playground/index.html?c=af-notice-bar" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 横向滚动

```html
<div class="card">
          <af-notice-bar id="n1" text="系统将于今晚 23:00 进行维护升级，届时服务暂停 10 分钟"></af-notice-bar>
          <af-notice-bar id="n2" text="这是一条非常长的公告文本用于演示横向滚动 marquee 效果，超出宽度时持续向左滚动" scroll></af-notice-bar>
        </div>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| text | `string` | '' | 公告文本 |
| scroll | `boolean` | false | 横向滚动模式（marquee）而非 ellipsis 截断 |

### 事件

| 事件名 | 说明 |
| --- | --- |


### 方法

| 签名 | 说明 |
| --- | --- |

<!-- gen:end:api -->
