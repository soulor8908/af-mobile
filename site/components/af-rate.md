# af-rate

> v1.3.0 · 评分

## 在线调试

<iframe src="../demo/playground/index.html?c=af-rate" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 星级评分

```html
<div class="card">
          <div class="cell"><span class="body">默认</span><af-rate id="r1" value="3"></af-rate></div>
          <div class="cell"><span class="body">10 星</span><af-rate id="r2" value="7" max="10"></af-rate></div>
        </div>
        <p class="caption" id="r-log">点击星星评分 · 键盘原生支持</p>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| value | `number` | 0 | 当前评分（0-max） |
| max | `number` | 5 | 星数上限 |
| readonly | `boolean` | false | 只读（不可交互） |
| size | `'sm' \| 'md' \| 'lg'` | 'md' | 尺寸变体（sm/md/lg） |
| label | `string` | '评分' | radiogroup 无障碍标签 |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-rate:change` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |

<!-- gen:end:api -->
