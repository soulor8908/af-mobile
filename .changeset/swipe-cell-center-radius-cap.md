---
'@af-mobile/ui': patch
---

af-swipe-cell 左滑操作按钮垂直居中修复 + `--r-f` 圆角上限收紧

- **修复 af-swipe-cell 左滑按钮不垂直居中**：`slot="right"` 的包装层（如 `<div slot="right"><button>…</button></div>`）此前被整体搬进 `[data-role="right"]`，块级包装层使 `align-items: stretch` 落到 wrapper 而非按钮上，按钮高度不跟随行高。现摊平包装层，操作项直接挂到 right 区参与 flex 拉伸。

- **`--r-f` 由 `9999px` 收紧为 `999px`**：移动端元素短边 ≤~430px，border-radius 超过短边一半即被钳成完整圆角，`9999px` 是冗余魔数。移动端视觉完全等价，非移动端（元素短边 >1998px）场景下不再等效全圆角——超出本库目标平台，如需绝对全圆角请显式设置更大的值。
