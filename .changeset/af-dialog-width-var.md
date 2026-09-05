---
'@af-mobile/ui': minor
---

af-dialog 弹框宽度可定制：新增 `--af-dialog-w` 官方扩展点

- **新增扩展点 `--af-dialog-w`**：对话框宽度默认值由 CSS 变量提供（default/bottom 变体 `320px`，center 变体 `280px`），消费端一行覆盖：

  ```css
  af-dialog { --af-dialog-w: 300px; }
  ```

  仍受 `max-width: 90vw` 约束，窄屏不会被撑破。

- **行为变更（center 变体）**：居中弹框宽度由 `max-width: 70vw`（内容决定实际宽度）改为 `width: var(--af-dialog-w, 280px) + max-width: 90vw`。此前 center 变体宽度随内容浮动，同结构不同文案宽度不一致；现统一为固定值，需要更宽/更窄时覆盖变量即可。若此前依赖 center 弹框随内容自适应，升级后请显式设置 `--af-dialog-w`。

- **default/bottom 变体**：此前仅有 `max-width: 90vw` 无宽度声明，现补 `width: var(--af-dialog-w, 320px)`。窄屏（≤355px）下 90vw 小于 320px，实际表现不变；宽屏下由此前的"内容宽度"收敛为 320px。
