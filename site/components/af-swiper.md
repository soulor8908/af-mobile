# af-swiper

> P0 · 轮播/滑动卡片

## 示例

### 轮播滑动

```html
<af-swiper id="swiper">
          <div class="swiper-slide" style="height:180px;display:flex;align-items:center;justify-content:center;background:var(--c-muted-bg);font-weight:600;">Slide 1</div>
          <div class="swiper-slide" style="height:180px;display:flex;align-items:center;justify-content:center;background:var(--c-muted-bg);font-weight:600;">Slide 2</div>
          <div class="swiper-slide" style="height:180px;display:flex;align-items:center;justify-content:center;background:var(--c-muted-bg);font-weight:600;">Slide 3</div>
          <div class="swiper-slide" style="height:180px;display:flex;align-items:center;justify-content:center;background:var(--c-muted-bg);font-weight:600;">Slide 4</div>
        </af-swiper>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| activeIndex | `number` | 0 | 当前激活索引 |
| autoplay | `number` | 0 | 自动播放间隔（ms，0 禁用） |
| loop | `boolean` | false | 无缝循环 |
| duration | `number` | 250 | 过渡时长（ms） |
| showDots | `boolean` | true | 是否显示指示点 |
| disabled | `boolean` | false | 禁用触摸拖拽（仍允许程序控制） |
| slideCount *(readonly)* | `number` |  | slide 总数（只读） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-swiper:change` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `goTo(index: number): void` | 跳转到指定索引 |
| `next(): void` | 下一张 |
| `prev(): void` | 上一张 |
<!-- gen:end:api -->
