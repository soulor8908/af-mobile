# aiflow-ui

Mobile-first Web Components library with **L1/L2/L3/L4 四层分层设计体系**。

- **L1 Token**：43 个 CSS 变量（颜色/间距/字号/圆角/阴影/动效）
- **L2 配方 + 原子**：104 个白名单封闭集 class（`btn`/`card`/`p-4`/...）
- **L3 真组件**：10 个原生 Custom Elements（`af-list`/`af-dialog`/...），ESM 命名导出 + Tree Shaking
- **L4 AI 约束层**：System Prompt 引导 + ESLint 16 规则兜底 + CI 保护

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
  </script>
</body>
</html>
```

## 组件 API 速查

| 组件 | 标签 | 关键属性 | 关键事件 |
|---|---|---|---|
| 长列表（虚拟滚动） | `<af-list>` | `data` `page-size` `refresh` | `af-list:loadmore` `af-list:itemclick` `af-list:refresh` |
| 轮播/滑动 | `<af-swiper>` | `autoplay` `loop` `active-index` | `af-swiper:change` |
| 标签页 | `<af-tabs>` | `tabs` `active-index` | `af-tabs:change` |
| 模态对话框 | `<af-dialog>` | `title` `close-on-esc` `close-on-backdrop` | `af-dialog:open` `af-dialog:close` |
| 轻提示 | `<af-toast>` | `duration` | `af-toast:dismiss` |
| 底部操作面板 | `<af-action-sheet>` | `options` `title` `show-cancel` | `af-action-sheet:select` `af-action-sheet:close` |
| 滚轮选择器 | `<af-picker>` | `columns` `values` `title` | `af-picker:change` `af-picker:confirm` |
| 下拉菜单 | `<af-dropdown>` | `options` `value` `placeholder` | `af-dropdown:select` |
| 懒加载图片 | `<af-img>` | `src` `alt` `placeholder-src` `fail-src` | `af-img:load` `af-img:error` |
| 回到顶部 | `<af-backtop>` | `threshold` `target` `position` | `af-backtop:click` |

事件名遵循 `af-{组件}:{动作}` 格式，`event.detail` 携带结构化数据。

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
11. `.tab-item` 不可同时设 `active` class 与 `aria-selected="true"`（二选一）
12. **Light DOM 组件**（`af-list/af-tabs/af-toast/af-action-sheet/af-dropdown/af-backtop`）不可含 `<style>` 或 `this.style.xxx=`
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

PR 触发 CI 6 步检查（任一失败即阻断合并）：

| Step | 检查项 | 命令 |
|---|---|---|
| 1 | 白名单三源同步（CSS/JS ↔ whitelist.json ↔ Prompt 注入） | `npm run whitelist:check` |
| 2 | 体积预算（L1+L2 ≤ 4.2KB / L3 ≤ 10.5KB / 单组件 ≤ 2.5KB） | `npm run size` |
| 3 | 单元测试 | `npm test` |
| 4 | ESLint 16 规则（13 error + 3 warn，warn 不阻断） | `npx eslint src/ --max-warnings 0` |
| 5 | 发布前检查（Tree Shaking + sideEffects + npm pack 内容） | `npm run publish:check` |
| 6 | CODEOWNERS 审批（GitHub Branch Protection 自动处理） | — |

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
