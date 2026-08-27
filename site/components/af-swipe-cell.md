# af-swipe-cell

> v1.5.0 · 滑动单元格

## 在线调试

<iframe src="../demo/playground/index.html?c=af-swipe-cell" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 左滑操作

```html
<div class="list">
          <af-swipe-cell>
            <div slot="content" class="list-item"><div class="body">左滑显示操作</div></div>
            <div slot="right">
              <button class="btn btn-sm btn-ghost" data-action="mark">标记</button>
              <button class="btn btn-sm btn-danger" data-action="delete">删除</button>
            </div>
          </af-swipe-cell>
          <af-swipe-cell disabled>
            <div slot="content" class="list-item"><div class="body">禁用滑动</div></div>
          </af-swipe-cell>
        </div>
        <p class="caption" id="sc-log">左滑 > 50% 吸附打开 · 触发 af-swipe-cell:action</p>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| disabled | `boolean` | false | 禁用滑动 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-swipe-cell:action` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `open(): void` | 打开右侧操作区 |
| `close(): void` | 关闭右侧操作区 |
<!-- gen:end:api -->
