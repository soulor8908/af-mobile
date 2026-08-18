# 主题定制

@af-mobile/ui 的主题基于 CSS 变量（Design Token）驱动，配合一套运行时换肤 API（`initTheme` / `setTheme` / `toggleTheme` / `getTheme`）完成 light/dark 切换与持久化。

## Design Token 说明

主题变量统一定义在 **`src/tokens.css`** 中（由库维护者管理，消费者通过 `var(--*)` 引用，禁止在其他文件重定义）。分几大家族：

- **颜色** `--c-*`：如 `--c-brand`、`--c-onbrand`、`--c-text`、`--c-muted`、`--c-bg`、`--c-card`、`--c-border`、`--c-danger`、`--c-success`、`--c-warn`
- **间距** `--s-*`：如 `--s-2: 8px`、`--s-4: 16px`、`--s-5: 24px`
- **圆角** `--r-*`：如 `--r-s: 4px`、`--r-m: 8px`、`--r-l: 12px`、`--r-f: 9999px`
- **字号 / 行高 / 字重**：`--t-md: 16px`、`--lh-normal: 1.7`、`--fw-medium: 500`
- 此外还有阴影 `--shadow-*`、z-index `--z-*`、动效 `--ease-*` / `--dur-*`

tokens.css 内部做了一层"主题调色板"二次抽象：`--palette-*` 在 light/dark 三处（系统暗黑、手动 dark）各定义一次，对外 token（`--c-*` 等）从调色板 `var(--palette-*)` 派生映射，保证单一来源。Shadow DOM 组件（如 dialog 的内部样式）也通过 `var(--*)` 引用这些 token，因此换肤对全部组件同样生效。

## 运行时换肤

主题 API 由 `src/lib/theme.js` 实现，并通过 `src/index.js` 顶部导出（`import { getTheme, setTheme, toggleTheme, initTheme } from '@af-mobile/ui';`）。

- **`initTheme()`** —— 从 localStorage 恢复主题，应在入口尽早调用（先于组件挂载）
- **`setTheme(theme)`** —— 设置主题并持久化到 localStorage（`theme` 取 `'light' | 'dark'`）
- **`toggleTheme()`** —— light ⇄ dark 切换并持久化
- **`getTheme(): 'light' | 'dark'`** —— 获取当前主题（优先 localStorage，回退 `prefers-color-scheme`）

```js
import { initTheme, setTheme, toggleTheme, getTheme } from '@af-mobile/ui';

initTheme(); // 入口尽早调用，从 localStorage 恢复

// 切换并持久化
document.getElementById('theme-btn').addEventListener('click', () => {
  toggleTheme();
  console.log('当前主题：', getTheme());
});

// 强制指定
setTheme('dark');
console.log(getTheme()); // 'dark'
```

实现上，运行时通过 `data-theme` 属性控制主题：设置 `dark` 时在 `:root` 上写入 `data-theme="dark"`，tokens.css 中的 `:root[data-theme="dark"]` 选择器据此覆盖调色板。未显式设模式时，系统暗色会通过 `prefers-color-scheme` 自动跟随（`:root:not([data-theme="light"])`）。

### 消除暗色模式首屏闪烁（FOUC）

`initTheme()` 在入口 JS 执行时才设 `data-theme`，系统暗色 + 用户存 light 时会先闪一下暗色再切回。可在 `<head>` 内联一段同步脚本，先于首次 paint 读取 localStorage 设 `data-theme`（不依赖组件库，幂等）：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <script>
    try {
      var t = localStorage.getItem('theme');
      if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    } catch (e) {}
  </script>
</head>
</html>
```

## 覆盖方式

在消费端，主题定制最常见的方式是**覆盖 L1 token 的 CSS 变量值**（项目级品牌定制）。L4 开放了 `tokens.project.css` 作为 token 值覆盖通道，不要求登记白名单（纯变量重定义，无新 class）：

```css
/* tokens.project.css */
:root {
  --c-brand: #ff6b35;   /* 覆盖品牌色 */
  --r-m: 10px;          /* 覆盖中圆角 */
  --s-4: 14px;          /* 覆盖 16px 间距 */
}
```

```js
import '@af-mobile/ui/css';   // 先引入库样式
import './tokens.project.css'; // 再覆盖 token（顺序在后即为最终值）
```

> 注意范围与边界：覆盖应作用于 `:root` 级别的 token（消费者视角），不要在外层页面对具体组件用内联 style 重写；若需扩展 `L2` class 变体（如 `.avatar-lg`），须走项目级 `extraClass` 登记而非直接改 recipes.css。所有改动都应避开 `src/tokens.css` 本身——该文件由库维护者通过 CODEOWNERS 保护。