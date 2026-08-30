---
'@af-mobile/ui': patch
---

脚手架默认引入 `src/styles.css`（Issue 1，P0）

`create-app.mjs` 生成的 `src/main.js` 只 `import '@af-mobile/ui/css'`，没有引入同模板生成的 `src/styles.css`
——自定义样式**完全不生效且无任何报错**，排查成本极高。现在模板默认带 `import './styles.css';`
（排在库 CSS 之后以便覆盖），并加注释标明「默认已引入，勿删」。

> `starter/src/main.js` 一直有这行，只有 `create-app` 模板漏了。
