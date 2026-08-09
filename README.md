# aiflow-ui

Mobile-first Web Components library with **L1/L2/L3/L4 四层分层设计体系**。

- **L1 Token**：43 个 CSS 变量（颜色/间距/字号/圆角/阴影/动效）
- **L2 配方 + 原子**：114 个白名单封闭集 class（62 配方 + 52 原子，`btn`/`card`/`p-4`/...）
- **L3 真组件**：13 个原生 Custom Elements（`af-list`/`af-dialog`/...），ESM 命名导出 + Tree Shaking
- **L4 AI 约束层**：System Prompt 引导 + ESLint 15 规则兜底 + CI 保护

## 安装

```bash
npm install aiflow-ui
```

## 快速上手

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/node_modules/aiflow-ui/src/index.css">
</head>
<body>
  <main class="page">
    <header class="navbar navbar-fixed">
      <h1 class="title">商品列表</h1>
    </header>

    <af-list id="list"></af-list>

    <af-dialog id="dialog">
      <div slot="body">确认删除？</div>
      <div slot="footer">
        <button class="btn btn-ghost btn-block">取消</button>
        <button class="btn btn-danger btn-block">删除</button>
      </div>
    </af-dialog>
  </main>

  <script type="module">
    import { AfList, AfDialog, register } from 'aiflow-ui';
    register('af-list');
    register('af-dialog');

    const list = document.getElementById('list');
    list.data = Array.from({ length: 100 }, (_, i) => ({
      title: `商品 ${i + 1}`,
      subtitle: `¥${(i + 1) * 9.9}`,
    }));
    list.addEventListener('af-list:itemclick', (e) => {
      console.log('click', e.detail.index);
    });

    // 分页加载示例：必须设 total-count，否则永不显示「没有更多了」
    list.totalCount = 256;          // 数据总条数（分页终止判断）
    list.addEventListener('af-list:loadmore', async (e) => {
      const page = e.detail.page;  // 从 1 开始，每次自动 +1
      const more = await fetch(`/api/goods?page=${page}`).then(r => r.json());
      list.data = [...list.data, ...more.items];
      // 请求完成后必须调用，传入 hasMore 控制是否继续触发下一次
      list.endLoadMore(list.data.length < list.totalCount);
    });
  </script>
</body>
</html>
```

## 组件 API 速查

| 组件 | 标签 | 关键属性 | 关键事件 |
|---|---|---|---|
| 长列表（虚拟滚动） | `<af-list>` | `data` `item-height` `total-count` `page-size` `refresh` | `af-list:loadmore` `af-list:itemclick` `af-list:refresh` |
| 轮播/滑动 | `<af-swiper>` | `autoplay` `loop` `active-index` | `af-swiper:change` |
| 标签页 | `<af-tabs>` | `tabs` `active-index` | `af-tabs:change` |
| 模态对话框 | `<af-dialog>` | `title` `close-on-esc` `close-on-backdrop` | `af-dialog:open` `af-dialog:close` |
| 轻提示 | `<af-toast>` | `duration` | `af-toast:dismiss` |
| 底部操作面板 | `<af-action-sheet>` | `options` `title` `show-cancel` | `af-action-sheet:select` `af-action-sheet:close` |
| 滚轮选择器 | `<af-picker>` | `columns` `values` `title` | `af-picker:change` `af-picker:confirm` |
| 下拉菜单 | `<af-dropdown>` | `options` `value` `placeholder` | `af-dropdown:select` |
| 懒加载图片 | `<af-img>` | `src` `alt` `placeholder-src` `fail-src` | `af-img:load` `af-img:error` |
| 回到顶部 | `<af-backtop>` | `threshold` `target` `position` | `af-backtop:click` |
| 开关 | `<af-switch>` | `checked` `loading` `disabled` `size` | `af-switch:change` |
| 搜索栏 | `<af-search-bar>` | `value` `placeholder` `clearable` `debounce` | `af-search-bar:input` `af-search-bar:search` `af-search-bar:clear` |
| 骨架屏页面 | `<af-skeleton-page>` | `variant` | — |

事件名遵循 `af-{组件}:{动作}` 格式，`event.detail` 携带结构化数据。

## SSR / Hydration 使用指南

aiflow-ui 是浏览器端 Custom Elements 库，`customElements` 在 Node 服务端不存在，直接 `import` 会抛错。本节给出 SSR 框架接入方式。

### 核心问题

| 问题 | 说明 |
|---|---|
| `customElements` 在服务端不存在 | Node 环境无 `customElements`，直接 `import` 会抛错 |
| `connectedCallback` 不触发 | 服务端无 DOM，组件不 upgrade |
| 属性 JSON 序列化 | `data`/`tabs` 等复杂属性需在 HTML 中预渲染 |

### 1. 客户端条件注册

仅在浏览器环境注册组件，避免服务端执行 `customElements.define`：

```js
// 仅在浏览器环境注册组件
if (typeof window !== 'undefined') {
  const { registerAll } = await import('aiflow-ui');
  registerAll();
}
```

### 2. SSR 预渲染 Light DOM（首屏占位）

Light DOM 组件的结构（含 L2 class）可由服务端直接渲染到 HTML 作为**首屏占位**。客户端 `registerAll()` 后组件 `connectedCallback` 触发，**会用组件内部模板重建 DOM 并接管交互**——这不是增量 hydration，SSR 子节点会被覆盖。因此 SSR 预渲染的价值是「避免白屏」，而非「复用服务端 DOM」。Shadow DOM 组件内部结构不可预渲染，仅客户端挂载。

> ⚠️ **非增量 hydrate**：组件 `mounted()` 会用 `innerHTML` 重建内部结构（虚拟列表的 `.list` 外壳、tabbar 等）。SSR 输出的子节点仅作首屏占位，客户端 upgrade 后即被替换。若对首屏闪烁敏感，可在组件外加 `style="visibility:hidden"` 占位，upgrade 后再显隐。

```jsx
// Next.js 示例：服务端预渲染首屏占位结构
function ProductList({ items }) {
  return (
    <>
      {/* 服务端预渲染首屏占位（upgrade 后会被组件内部模板替换） */}
      <af-list data={JSON.stringify(items)} item-height={48}>
        <div class="list">
          {items.map((item, i) => (
            <div class="list-item" key={i}>
              <div class="body">{item.title}</div>
            </div>
          ))}
        </div>
      </af-list>
      {/* 客户端 lazy 加载组件库并注册 */}
      <Script src="/aiflow-ui.js" strategy="lazyOnload"
        onLoad={() => window.AiflowUI?.registerAll()} />
    </>
  );
}
```

Nuxt / Remix 同理：服务端输出 Light DOM + L2 class 作首屏占位，客户端 hydration 阶段动态 `import('aiflow-ui')` 并注册，组件 `connectedCallback` 重建内部结构并接管交互。

### 3. 组件 SSR 兼容性矩阵

| 组件 | DOM | SSR 预渲染占位 | 客户端 upgrade | 注意 |
|---|---|---|---|---|
| af-list | Light | ✓ 渲染 .list 结构 | ✓ 重建外壳+接管虚拟滚动 | 需 data 属性；非增量 hydrate |
| af-swiper | Shadow | ✗ Shadow 内不预渲染 | ✓ 接管 touch | 仅客户端 |
| af-tabs | Light | ✓ 渲染 tabbar + panels | ✓ 重建外壳+接管切换 | 非增量 hydrate |
| af-dialog | Shadow | ✗ 不预渲染 | ✓ showModal | 仅客户端 |
| af-toast | Light | ✗ 不预渲染（单例按需） | ✓ 单例 | 仅客户端 |
| af-action-sheet | Light | ✗ 不预渲染（popover 按需） | ✓ popover | 仅客户端 |
| af-picker | Shadow | ✗ Shadow 不预渲染 | ✓ 接管 | 仅客户端 |
| af-dropdown | Light | ✗ 不预渲染（popover 按需） | ✓ popover | 仅客户端 |
| af-img | Light | ✓ 渲染 img + 占位 | ✓ 重建外壳+懒加载 | 需 src 属性；非增量 hydrate |
| af-backtop | Light | ✗ 不预渲染 | ✓ | 仅客户端 |
| af-switch | Light | ✓ 渲染 switch 结构 | ✓ 重建+接管 | 非增量 hydrate |
| af-search-bar | Light | ✓ 渲染搜索输入框 | ✓ 重建+接管 | 非增量 hydrate |
| af-skeleton-page | Light | ✓ 渲染骨架屏 | ✓ 重建+接管 | 适合 SSR loading 态 |

> 规则：**Light DOM + 有初始可见结构** 的组件支持 SSR 预渲染作首屏占位；Shadow DOM 与按需弹层类组件仅客户端渲染。所有 Light DOM 组件 upgrade 时均为「重建接管」而非「增量 hydrate」。

## 注册方式

```js
// A. 按需注册（推荐，Tree Shaking 友好）
import { AfList, AfDialog } from 'aiflow-ui';
customElements.define('af-list', AfList);
customElements.define('af-dialog', AfDialog);

// B. 单个注册辅助函数
import { register } from 'aiflow-ui';
register('af-list');
register('af-dialog');

// C. 全量注册（不推荐，会失去 Tree Shaking）
import { registerAll } from 'aiflow-ui';
registerAll();
```

## L4 禁令（25 条，ESLint error 级）

写 AI 生成代码时务必遵守：

1. `tokens.css` 以外不可重定义 `--c-*/--s-*/--r-*/--t-*/--lh-*/--fw-*/--shadow-*/--z-*/--ease-*/--dur-*`
2. `style=""` 不可设置 `color/background*/padding*/margin*/font-size/border-radius/box-shadow`
3. 不可使用 114 白名单外的 class 名或自定义组件标签
4. `.btn`（非 ghost）不可叠加 `text-brand/text-danger/text-success`
5. `.input` 不可叠加 `t-sm/t-xs`（iOS 聚焦 < 16px 自动放大页面）
6. `.cell/.list-item` 不可叠加 `f/fc` 原子
7. 不可用 Tailwind 任意值语法：`p-[13px]/bg-[#abc]/p-7`
8. 不可互斥变体叠加：`btn-sm+btn-lg`、`tag-ok+tag-warn`、同属性原子重复
9. `.list-item/.list-item-compact` 自带 border-top 由 `.list` 容器管理，不要单独设
10. `.sheet` 显隐必须走原生 popover API `showPopover/hidePopover`
11. `.tab-item` 选中态单一真相源是 `aria-selected="true"`（视觉由属性选择器驱动，不可用 `active` class）
12. **Light DOM 组件**（`af-list/af-tabs/af-toast/af-action-sheet/af-dropdown/af-backtop/af-img/af-switch/af-search-bar/af-skeleton-page`）不可含 `<style>` 或 `this.style.xxx=`
13. **Shadow 组件** CSS 字符串不可硬编码颜色/间距/字号/圆角（`::backdrop` 遮罩 rgba(0,0,0,.5) 例外）
14. 事件名必须 `af-{组件}:{动作}` 格式；`emit` 必须 `composed:true`
15. `af-dialog/af-action-sheet` 必须有焦点陷阱（Tab 不逃出，关闭还原焦点）
16. `af-tabs` 必须 `aria-selected/aria-controls/aria-labelledby`
17. `.price` 不可叠加 `text-success/text-brand`（电商约定用 `--c-danger` 红色）
18. `.empty` 与 `.center` 不可在同一语义场景混用
19. `.hero` 不可用作内容区主体背景（仅用于页面顶部大留白标题区）
20. `.actions` 内 `.btn` 与 `.btn-block` 不可同时出现
21. `.tabbar-fixed/.checkout-bar/.input-bar` 必须含 `safe-area-inset-bottom`
22. `af-swiper/af-tabs/af-picker` 方向键切换必须焦点跟随（roving tabindex）
23. 不可手动创建 `.toast` 元素（必须通过 `af-toast.show()` 单例）
24. 骨架屏 `style=""` 不可设宽高（用 `.skeleton-line` 配方或项目级扩展）
25. 不可在 JS 事件回调内调用 `setAttribute` 修改自身 attribute（单向数据流）

完整禁令详见 [docs/design/l4-detailed-design.md](docs/design/l4-detailed-design.md) §7.1。

## 项目级扩展

L4 设计支持三类扩展通道（不可混用）：

| 扩展类型 | 场景 | 文件 | 登记 |
|---|---|---|---|
| L2 配方/原子变体 | `.avatar-lg`（大头像）、`.btn-gradient` | `recipes.project.css` | `extraClass` |
| L1 token 值覆盖 | 项目品牌色 `--c-brand: #ff6b35` | `tokens.project.css` | ❌ |
| L3 组件新增 | `<af-qrcode>` | `components/project-af-*.js` | `extraComponents` |

```js
// .eslintrc.cjs 项目级配置示例
export default [
  ...aiflowBaseConfig,
  {
    rules: {
      'aiflow/token-whitelist': ['error', {
        extraClass: ['avatar-lg', 'search-with-icon', 'search-icon'],
        extraComponents: ['af-qrcode'],
        allowProjectTokens: true,
      }],
    },
  },
];
```

详细机制见 [docs/design/l4-detailed-design.md](docs/design/l4-detailed-design.md) §5。

## CI 保护链路

PR 触发 CI 7 步检查（任一失败即阻断合并）：

| Step | 检查项 | 命令 |
|---|---|---|
| 1 | 白名单三源同步（CSS/JS ↔ whitelist.json ↔ Prompt 注入） | `npm run whitelist:check` |
| 1b | d.ts 与源码组件数同步（防类型声明漂移） | `npm run types:check` |
| 2 | 体积预算（L1+L2 ≤ 4.9KB / L3 ≤ 14KB / 按需2组件 ≤ 5.5KB / 单组件 ≤ 2.6KB） | `npm run size` |
| 3 | 单元测试（jsdom） | `npm test` |
| 4 | ESLint 15 规则（10 error + 5 warn，warn 不阻断） | `npx eslint src/ --max-warnings 0` |
| 5 | 发布前检查（build + Tree Shaking + sideEffects + types-sync + npm pack） | `npm run publish:check` |
| 6 | eval 集格式闸门（校验 prompts.jsonl 结构） | `npm run eval:dry` |

> **测试栈已知限制**：单元测试基于 jsdom，**不覆盖** `popover`/`showModal` 真实行为、`ResizeObserver`/`IntersectionObserver`、`scroll-snap`、真实 touch 事件、`prefers-reduced-motion`。弹层/滚轮/下拉/懒加载的核心交互依赖浏览器原生 API，CI 中仅做逻辑层断言（mock 后验证派发事件/属性同步），真实浏览器 e2e 待后续引入。关键交互上线前建议手动验证。

`.github/CODEOWNERS` 把关键文件分为 3 组 Owner：

- L1 Owner：`tokens.css`
- L3 Owner：`af-element.js`
- L4 Owner：`whitelist-v*.json` / `system-prompt.*` / `eslint-plugin-aiflow/rules/**`

## 本地开发

```bash
# 安装依赖
npm install

# 跑测试
npm test

# 跑 CI 全流程（whitelist 同步 + 体积 + 测试）
npm run ci

# Lint 自检
npx eslint src/

# 体积检查
npm run size

# 发布前检查
npm run publish:check

# 重新生成 whitelist-v1.json
npm run whitelist

# 构建 System Prompt（注入白名单 + 项目扩展）
npm run prompt:build
```

## 设计文档

- [L1+L2 详细设计](docs/design/l1-l2-detailed-design.md)
- [L3 真组件详细设计](docs/design/l3-detailed-design.md)
- [L4 AI 约束层详细设计](docs/design/l4-detailed-design.md)

## License

MIT
