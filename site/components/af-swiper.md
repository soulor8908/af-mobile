# af-swiper 轮播滑动
<!-- gen:start:scenarios -->
## 示例

<iframe src="/empty"></iframe>
### 1. 轮播滑动
```html

        <af-swiper id="swiper">
          <div class="swiper-slide" style="height:180px;display:flex;align-items:center;justify-content:center;background:var(--c-muted-bg);font-weight:600;">Slide 1</div>
          <div class="swiper-slide" style="height:180px;display:flex;align-items:center;justify-content:center;background:var(--c-muted-bg);font-weight:600;">Slide 2</div>
          <div class="swiper-slide" style="height:180px;display:flex;align-items:center;justify-content:center;background:var(--c-muted-bg);font-weight:600;">Slide 3</div>
          <div class="swiper-slide" style="height:180px;display:flex;align-items:center;justify-content:center;background:var(--c-muted-bg);font-weight:600;">Slide 4</div>
        </af-swiper>
```
<!-- gen:end:scenarios -->
<!-- gen:start:props -->
## API

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| activeIndex | `number` | 当前激活索引 |
| autoplay | `number` | 自动播放间隔（ms，0 禁用） |
| loop | `boolean` | 无缝循环 |
| duration | `number` | 过渡时长（ms） |
| showDots | `boolean` | 是否显示指示点 |
| disabled | `boolean` | 禁用触摸拖拽（仍允许程序控制） |
| slideCount *(readonly)* | `number` | slide 总数（只读） |
| label | `string` |  |
| index | `number` |  |
| value | `string \| number` |  |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-swiper:change` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `goTo` | `goTo(index: number): void` |
| `next` | `next(): void` |
| `prev` | `prev(): void` |
<!-- gen:end:methods -->
