# af-password-input

> P1 · 密码/验证码格子输入

## 在线调试

<iframe src="../demo/playground/index.html?c=af-password-input" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 支付密码（配对 af-number-keyboard）

```html
<div class="card fc g-3 center p-3">
          <af-password-input id="pi" length="6" mask></af-password-input>
          <p class="caption" id="pi-log">点击格子唤起数字键盘 · 输满自动收起</p>
        </div>
        <af-number-keyboard id="pi-kb" title="安全键盘" maxlength="6"></af-number-keyboard>
```

### 短信验证码（明文）

```html
<div class="card fc g-3 center p-3">
          <af-password-input id="pi2" length="4" mask="false"></af-password-input>
          <p class="caption" id="pi-log2">mask="false" 明文展示数字</p>
        </div>
        <af-number-keyboard id="pi-kb2" title="验证码" maxlength="4"></af-number-keyboard>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| value | `string` | '' | 当前值 |
| length | `number` | 6 | 格子数 |
| mask | `boolean` | true | 掩码显示（true 圆点 / false 明文验证码） |
| focused | `boolean` | false | 聚焦态（显示光标；配合 af-number-keyboard open/close 设置） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-password-input:complete` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |

<!-- gen:end:api -->
