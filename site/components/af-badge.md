# af-badge

> v1.3.0 · 徽标角标

## 在线调试

<iframe src="../demo/playground/index.html?c=af-badge" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 基础用法

```html
<div class="card">
          <div class="cell f ai-center gap-2">
            <af-badge id="b1" content="8">消息</af-badge>
            <af-badge id="b2" content="99" max="99">通知</af-badge>
            <af-badge id="b3" dot>新</af-badge>
          </div>
          <div class="cell f gap-2">
            <af-badge content="热" color="warn">推荐</af-badge>
            <af-badge content="NEW" color="brand">活动</af-badge>
          </div>
        </div>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| content | `string` | '' | 徽标内容（数值超过 max 显示 max+） |
| max | `number` | '{ type: Number, default: null }' | 数值上限，超限显示 max+ |
| dot | `boolean` | false | 点状徽标（隐藏文字） |
| color | `'danger' \| 'warn' \| 'ok' \| 'muted'` | '{ attr: 'data-color', type: String, default: 'danger' }' | 颜色变体（danger/warn/ok/muted） |

### 事件

| 事件名 | 说明 |
| --- | --- |


### 方法

| 签名 | 说明 |
| --- | --- |

<!-- gen:end:api -->
