# af-switch

> v1.2.0 · 开关切换

## 在线调试

<iframe src="../demo/playground/index.html?c=af-switch" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 开关列表

```html
<div class="card">
          <div class="cell"><span class="body">通知推送</span><af-switch id="s1"></af-switch></div>
          <div class="cell"><span class="body">自动播放</span><af-switch id="s2" checked></af-switch></div>
          <div class="cell"><span class="body">加载态</span><af-switch id="s3" loading></af-switch></div>
          <div class="cell"><span class="body">禁用</span><af-switch id="s4" disabled></af-switch></div>
        </div>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| checked | `boolean` | false | 开关状态 |
| disabled | `boolean` | false | 禁用 |
| loading | `boolean` | false | 加载中（显示 spinner，禁用交互） |
| size | `'sm' \| 'md'` | 'md' | 尺寸变体 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-switch:change` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `toggle(force?: boolean): void` | 切换开关（传参则强制设为该值） |
<!-- gen:end:api -->
