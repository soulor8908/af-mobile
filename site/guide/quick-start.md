# 快速开始

## 安装

推荐用脚手架 `@af-mobile/ui` 专用命令一键生成可运行工程。脚手架会一次性生成项目骨架，并自举安装 `AGENTS.md`、`skills/af-mobile-grill/SKILL.md` 与 `eslint.config.js`（含消费端白名单约束），是项目骨架的单一真相源——

```bash
npm create af-mobile <dir>
# 等价于
npx create-af-mobile <dir>

cd <dir> && npm install && npm run dev
```

> `npm create af-mobile` 与 `npx create-af-mobile` 等价（npm init 约定，与 vite / astro 同款）：按需下载并执行脚手架，无需先手动 `npm install`。切勿写裸 `npx af-mobile`——npm 上存在同名第三方包，会装错。

生成工程自带 `af-mobile-grill` skill（对话式脚手架）与消费端 ESLint 约束。在任意 AI 编码工具（TRAE / Claude Code / Cursor 等）中打开工程，说一句"我想做一个习惯打卡应用"，skill 会引导你：**拷问需求 → 需求拆分 → demo 确认 → 一次性生成页面**。

## 手动接入

在已有项目中，三步接入：

```bash
npm i @af-mobile/ui
```

1. **引入样式**：`@af-mobile/ui` 的 `exports` 提供了 `./css` 子路径（指向 `src/index.css`，内含 L1 token + L2 配方 + reset）：

   ```js
   import '@af-mobile/ui/css';
   ```

2. **注册组件**：`@af-mobile/ui` 是原生 Custom Elements，需将标签注册到 `customElements`。按需注册 `register('af-dialog', ...)` —— 变参，可同时传入多个标签名（见 `src/index.js`）：

   ```js
   import { register } from '@af-mobile/ui';
   register('af-dialog', 'af-toast'); // 按需注册（推荐，保留 Tree Shaking）
   ```

   > 注意：`import '@af-mobile/ui'` 只是一次纯导入，**不会**自动注册组件。必须显式调用 `register()`，或直接取具名类用 `customElements.define`（全量注册 `registerAll()` 已移除——禁止一次性注册全部 30 个组件）。另外，`main` / `exports` 指向源码分发（裸 ESM），消费端需要有打包器（Vite / webpack / Rollup）；若需浏览器直引，用 `dist/af-mobile.umd.js`。

3. **测试环境（非脚手架项目）**：jsdom 缺一批组件依赖的浏览器 API（`showModal` / popover / `IntersectionObserver` / `ResizeObserver` / `TouchEvent` …）。`@af-mobile/ui/test` 一个 import 全部补齐：

   ```js
   // test/setup.js
   import '@af-mobile/ui/test';
   ```

   ```js
   // vite.config.js
   test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.js'] }
   ```

   > `npm create af-mobile` 生成的工程已默认这么接（`test/setup.js` 里就是这一行 + 用例间清理）。用脚手架的项目不用自己写桩。

## App 骨架（app-shell）

每页都要「顶栏 + 内容区 + 底栏」时，用 `.app-shell` 三段式骨架，避免每页重写一套 flex 布局：

```html
<div class="app-shell">
  <header class="navbar"><h1 class="title">标题</h1></header>
  <main class="page-col scroll-y p-4">
    <!-- 页面内容：这里独立滚动，顶栏底栏不动 -->
  </main>
  <af-tabbar></af-tabbar>
</div>
```

| 类 | 职责 |
| --- | --- |
| `.app-shell` | 整屏外壳：`100dvh` 纵向 flex + `max-width: 640px` 居中（桌面端不铺满） |
| `.page-col.scroll-y` | 内容区：占满剩余高度（`flex: 1; min-height: 0`）且 `overflow-y: auto` |
| `.tabbar` / `<af-tabbar>` | 底栏：作为 flex 末项自然贴在视口底部，无需 `position: fixed` |

要点：

- **内部滚动而非 body 滚动** —— `.app-shell` 撑满视口、内容区自己滚，底栏才固定在视口底部。若页面没有底栏、内容可以随页面一起滚，用 `.page`（`min-height: 100dvh`）更省事。
- `.page-col` 与 `.scroll-y` 的 `min-height: 0` 是必需的：flex 子项默认 `min-height: auto`，不加会让内容区被撑高、滚动失效。
- 底栏需要避让 Home Indicator 时用 `.tabbar-fixed`（自带 `env(safe-area-inset-bottom)`），此时内容区要自行留出底部间距。

## 首个组件示例

以模态对话框 `<af-dialog>` 为例。它的打开方式是调用实例方法 `dialog.show()`，事件名遵循 `af-{组件}:{动作}` 格式（如 `af-dialog:close`、`af-dialog:open`）：

```html
<af-dialog id="dialog" title="确认操作">
  <div slot="body">
    <p>确定要删除这条记录吗？此操作不可撤销。</p>
  </div>
  <div slot="footer">
    <button class="btn btn-ghost btn-block" id="cancel">取消</button>
    <button class="btn btn-danger btn-block" id="ok">删除</button>
  </div>
</af-dialog>
```

```js
import { register } from '@af-mobile/ui';
register('af-dialog');

const dialog = document.getElementById('dialog');

// 通过实例方法打开/关闭
document.getElementById('ok').addEventListener('click', () => {
  dialog.close();
  console.log('已确认删除');
});

// 监听关闭事件
dialog.addEventListener('af-dialog:close', () => {
  console.log('对话框关闭');
});

// 需要时打开
dialog.show();
```

## 下一步

- [架构理念](/guide/architecture) —— L1/L2/L3/L3.5/charts 分层设计与运行时能力
- [主题定制](/guide/theming) —— Design Token 与运行时换肤