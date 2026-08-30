---
'@af-mobile/ui': minor
---

新增 `.app-shell` 三段式 App 骨架（Issue 2，P0）

此前库内只有 `.page`（内容随 body 滚动，做不了固定底栏）。新增 `.app-shell` 补齐整屏外壳：
`100dvh` 纵向 flex + `max-width: 640px` 居中，配合既有的 `.page-col.scroll-y` 得到
「顶栏不动 + 内容区独立滚动 + 底栏贴视口底部」。

```html
<div class="app-shell">
  <header class="navbar"><h1 class="title">标题</h1></header>
  <main class="page-col scroll-y p-4"><!-- 内容 --></main>
  <af-tabbar></af-tabbar>
</div>
```

脚手架生成的页面默认改用该骨架，并新增「App 骨架」指引卡片。详见文档站「快速开始 · App 骨架」。
