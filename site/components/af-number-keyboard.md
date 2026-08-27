# af-number-keyboard

> P1 · 数字键盘

## 在线调试

<iframe src="../demo/playground/index.html?c=af-number-keyboard" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 安全键盘（随机布局 + maxlength）

```html
<div class="actions">
          <button class="btn" id="nk-open">打开安全键盘</button>
        </div>
        <p class="caption" id="nk-log">数字随机排列 · 输满 6 位自动提示完成</p>
        <af-number-keyboard id="kb" title="安全键盘" maxlength="6" random></af-number-keyboard>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| value | `string` | '' | 当前输入值 |
| maxlength | `number` | 0 | 最大长度（0 不限制） |
| random | `boolean` | false | 随机数字顺序（支付防肩窥，每次 open 重新洗牌） |
| title | `string` | null | 标题栏文案 |
| isOpen *(readonly)* | `boolean` |  | 是否已打开（只读） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-number-keyboard:input` | 触发时：组件内 emit 调用 |
| `af-number-keyboard:delete` | 触发时：组件内 emit 调用 |
| `af-number-keyboard:complete` | 触发时：组件内 emit 调用 |
| `af-number-keyboard:close` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `open(): void` | 打开键盘 |
| `close(source?: string): void` | 关闭键盘 |
<!-- gen:end:api -->
