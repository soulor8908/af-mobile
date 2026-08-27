# af-countdown

> v1.3.0 · 倒计时

## 在线调试

<iframe src="../demo/playground/index.html?c=af-countdown" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 倒计时控制

```html
<div class="card">
          <div class="cell"><span class="body">倒计时</span><af-countdown id="cd" time="90"></af-countdown></div>
        </div>
        <p class="caption" id="cd-log">到 0 派发 af-countdown:end</p>
        <div class="card f gap-2">
          <button class="btn btn-ghost" onclick="document.getElementById('cd').start()">开始</button>
          <button class="btn btn-ghost" onclick="document.getElementById('cd').pause()">暂停</button>
          <button class="btn btn-ghost" onclick="document.getElementById('cd').reset()">重置</button>
        </div>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| time | `number` | 60 | 总时长（秒） |
| autostart | `boolean` | true | 挂载后自动开始 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-countdown:change` | 触发时：组件内 emit 调用 |
| `af-countdown:end` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `start(): void` | 开始倒计时 |
| `pause(): void` | 暂停（保留剩余时间） |
| `reset(): void` | 重置到 time 初始值 |
<!-- gen:end:api -->
