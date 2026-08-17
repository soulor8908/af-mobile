# af-img 懒加载图片
<!-- gen:start:scenarios -->
## 示例

<!-- 无 Playground 场景（可补充 demo/scenarios/af-<tag>.js） -->
<!-- gen:end:scenarios -->
<!-- gen:start:props -->
## API

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| src | `string` | 图片地址 |
| alt | `string` | alt 文本 |
| placeholderSrc | `string` | 占位图地址 |
| failSrc | `string` | 失败回退图地址 |
| variant | `'default' \| 'thumb' \| 'avatar'` | 变体（default/thumb/avatar） |
| rootMargin | `string` | IntersectionObserver rootMargin |
| lazy | `boolean` | 是否懒加载 |
| loaded *(readonly)* | `boolean` | 是否已加载（只读） |
| error *(readonly)* | `boolean` | 是否加载失败（只读） |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-img:load` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| — | — |
<!-- gen:end:methods -->
