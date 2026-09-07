---
'@af-mobile/ui': minor
---

新增 CSS 按需：`@af-mobile/ui/vite` 的 `afMobileShakeCss()`（OPT-9）

此前 JS 侧早已按需（`register()` 只加载用到的组件），CSS 侧却只有 `@af-mobile/ui/css` 一个全量入口——用 10 个组件和用 41 个组件付的 CSS 完全一样（gzip 8.32KB）。本版本补齐这一环：构建期按消费端实际用到的 class 裁剪 L1 tokens + L2 recipes + atomic。

```js
// vite.config.js
import afMobileTrimLazy, { afMobileShakeCss } from '@af-mobile/ui/vite';

export default defineConfig({
  plugins: [afMobileTrimLazy(), afMobileShakeCss()],
});
```

实测（esbuild minify + gzip L9，与 `npm run size` 同口径）：

| 目标 | 用到 class | gzip | 省 |
|---|---|---|---|
| demo/apps/ai-todo | 32 | 8.32 → 4.36KB | 47.6% |
| starter/src | 12 | 8.32 → 3.87KB | 53.5% |
| demo/components | 27 | 8.32 → 4.14KB | 50.2% |

脚手架（`npm create af-mobile`）与 starter 已默认接线，新工程开箱即得。

三条保底，避免「静默把样式删坏」：

- 扫描不到任何 class 时不裁剪并告警（否则等于全删）；只处理本包 `src/` 下的 CSS，不碰消费端自有 CSS
- `css.postcss` 若为配置文件路径则不注入，避免覆盖用户既有 postcss 链路
- 仅 `apply: 'build'`：dev 下 CSS 的 postcss 只跑一次，裁剪后新增 class 不重跑会导致「样式莫名消失」

动态 class 兜底：`class="a ${x ? 'b' : ''}"` 这类模板字面量里的 `b` 静态扫不到，改用「源码引号字符串字面量 ∩ CSS 里出现过的 class」做 safelist 救回（实测加固成本 +0.01~0.58KB）。漏报会让样式静默失效，误报只多留几十字节，代价不对称故宁可保守。另有逃生舱 `afMobileShakeCss({ safelist: ['rate'] })` 与 `{ enabled: false }`。

实现说明：裁剪真源是新增的 `src/css-shake.js`（零依赖，随包发布），`scripts/css-tree-shake.mjs` 退化为 CLI 薄壳，两者共用同一套语义；postcss 由 Vite 自身的 CSS 管道提供，**本包不新增运行时依赖**。

放弃了什么：不裁 tokens（`:root` 是设计系统根基）；不做 tag 维度裁剪（`af-xxx [data-role]` 按组件归属可再省约 0.95KB，但误判会静默破样式，留待真正需要时再做）。

回归：`npm run css:e2e`（真实 vite build 比对开关插件的产物，实测 -54.2%）。
