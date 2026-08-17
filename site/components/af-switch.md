# af-switch 开关
<!-- gen:start:scenarios -->
## 示例

<iframe src="/empty"></iframe>
### 1. 开关列表
```html

        <div class="card">
          <div class="cell"><span class="body">通知推送</span><af-switch id="s1"></af-switch></div>
          <div class="cell"><span class="body">自动播放</span><af-switch id="s2" checked></af-switch></div>
          <div class="cell"><span class="body">加载态</span><af-switch id="s3" loading></af-switch></div>
          <div class="cell"><span class="body">禁用</span><af-switch id="s4" disabled></af-switch></div>
        </div>
```
<!-- gen:end:scenarios -->
<!-- gen:start:props -->
## API

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| checked | `boolean` | 开关状态 |
| disabled | `boolean` | 禁用 |
| loading | `boolean` | 加载中（显示 spinner，禁用交互） |
| size | `'sm' \| 'md'` | 尺寸变体 |
| value | `string` |  |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-switch:change` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `toggle` | `toggle(force?: boolean): void` |
<!-- gen:end:methods -->
