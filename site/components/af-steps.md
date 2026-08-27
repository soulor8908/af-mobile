# af-steps

> v1.3.0 · 步骤条

## 在线调试

<iframe src="../demo/playground/index.html?c=af-steps" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 步骤切换

```html
<af-steps id="s1" current="2"></af-steps>
        <p class="caption">点击按钮切换当前步骤</p>
        <div class="card f gap-2">
          <button class="btn btn-ghost" onclick="var s=document.getElementById('s1');s.current=Math.max(0,s.current-1);">上一步</button>
          <button class="btn btn-ghost" onclick="var s=document.getElementById('s1');s.current=Math.min(s.steps.length-1,s.current+1);">下一步</button>
        </div>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| steps | `Array<string \| { label: string }>` | '[]' | 步骤项（字符串或 { label }） |
| current | `number` | 0 | 当前步骤索引（0 起） |

### 事件

| 事件名 | 说明 |
| --- | --- |


### 方法

| 签名 | 说明 |
| --- | --- |

<!-- gen:end:api -->
