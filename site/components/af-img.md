# af-img

> P2 · 懒加载图片

## 在线调试

<iframe src="../demo/playground/index.html?c=af-img" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 加载状态

```html
<af-img id="img" alt="示例图片"
          src="https://picsum.photos/360/200"
          placeholder-src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='200'%3E%3Crect fill='%23eee' width='360' height='200'/%3E%3C/svg%3E">
        </af-img>
        <p class="caption" id="img-log">滚动到可视区后懒加载；可切换 src 观察 loading</p>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| src | `string` | '' | 图片地址 |
| alt | `string` | '' | alt 文本 |
| placeholderSrc | `string` | '' | 占位图地址 |
| failSrc | `string` | '' | 失败回退图地址 |
| variant | `'default' \| 'thumb' \| 'avatar'` | 'default' | 变体（default/thumb/avatar） |
| rootMargin | `string` | '200px' | IntersectionObserver rootMargin |
| lazy | `boolean` | true | 是否懒加载 |
| loaded *(readonly)* | `boolean` |  | 是否已加载（只读） |
| error *(readonly)* | `boolean` |  | 是否加载失败（只读） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-img:load` | 触发时：组件内 emit 调用 |
| `af-img:error` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |

<!-- gen:end:api -->
