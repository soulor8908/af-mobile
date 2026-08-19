# af-mobile v2.0 迁移指南

> 适用范围：v1.3.x → v2.0.0（运行时）+ v1.5.0 → v2.0.0（白名单类名简写，见「UI v7」章节）
> 目标：L0 运行时架构修复（Owner pattern / createPage 实例化 / router 增强 / i18n 复数 / theme 系统主题）。
> 本文档只覆盖**行为变化与迁移动作**；完整设计见 `docs/design/af-mobile-evolution-v3.md`。

---

## UI v6（v1.4.x → v1.5.0，视觉层迁移）

> 独立于下方 v2.0 运行时迁移，可单独执行。全部为 CSS 层变更，**不改任何 JS API**。

### 需要检查的存量代码

| 场景 | 变化 | 迁移动作 |
|------|------|----------|
| 依赖 `.card` 投影做层级 | card 已去影改纯描边 | 需要浮起感的容器改用 `.sheet`（浮层）或叠加 `.shadow-sm` 原子 |
| 依赖 `.btn` 按压位移/高光反馈 | 已删 `translateY`/inset 高光 | 无需动作；如需更强反馈可监听 `:active` 换底色（内置已生效） |
| 给 `.input`/`.textarea`/`.search-input` 叠加过 `t-sm`/`t-xs` | 控件字号恒 `--t-input` 16px | 删除小字号叠加（ESLint 规则 05 现在会报错）；帮助文字放 `.form-err`/`.label` |
| 页面假设 cell/list-item 高 52px | min-height 48px | 检查虚拟列表 `item-height` 之类的硬编码（`af-list` 传 48 或自适应） |
| 自定义 1px 分隔线 | `.list`/`.navbar`/`.tabbar` 内置 0.5px hairline | 自建分隔改用 `.hl-t`/`.hl-b`（v2.0 前称 `.hairline-top`/`.hairline-bottom`，见下方 UI v7 对照表） |
| 黄底 warn 场景用白字 | `.tag-warn`/`.notice`/`.toast-warning` 已改 `--c-onwarn` | 若曾手动用 `text-fff` 之类补丁，可删除 |
| 依赖旧灰阶 token（5 角色） | 灰阶扩为 8 档 | 旧 token 全保留，无破坏；新分层用 `--c-gray-1..8` |

### 新增能力（无需迁移，直接可用）

`.btn-plain` / `.btn-round` / `.tag-plain` / `.ellipsis-2` / `.hl-t`（时名 `.hairline-top`）/ `.hl-b`（时名 `.hairline-bottom`）；Token `--t-input`、`--tabbar-h`、`--c-gray-1..8`。

### 设计决策摘要

- **为什么 input 锁 16px**：iOS Safari 聚焦字号 <16px 的输入框会自动放大整页，且用户设置里无法关闭；锁 16px 是唯一可靠解。
- **为什么 hairline 用 0.5px**：高分屏（dpr≥2）下 0.5px 解析为 1 物理像素，1px 边框在 dpr=3 设备上显粗发闷；Vant/Antd 同款做法。
- **为什么 card 去投影**：投影语义保留给浮层（sheet/dropdown）；平面容器用描边，暗色主题下描边比投影更稳定（投影在暗底几乎不可见还增加噪点）。

---

## UI v7（v1.5.0 → v2.0.0，白名单类名简写）

> 纯 class 改名，**零行为变化**：选择器规格、视觉表现、ESLint 约束完全一致。共 33 项，按家族对照替换即可。
> `toast` 家族与 `progress` 家族**不在改名范围**（`toast-${type}`/`progress-${color}` 为运行时动态拼接，且 `<progress>` 为原生标签，保持原名）。

### 类名对照表（33 项）

| 家族 | 旧名（≤1.5.0） | 新名（2.0.0） |
|------|----------------|---------------|
| 骨架屏 | `skeleton` | `sk` |
| 骨架屏 | `skeleton-line` | `sk-ln` |
| 骨架屏 | `skeleton-block` | `sk-blk` |
| 骨架屏 | `skeleton-block-h-sm` | `sk-blk-h-sm` |
| 骨架屏 | `skeleton-block-h-md` | `sk-blk-h-md` |
| 骨架屏 | `skeleton-w-40` | `sk-w-40` |
| 骨架屏 | `skeleton-w-60` | `sk-w-60` |
| 骨架屏 | `skeleton-w-80` | `sk-w-80` |
| 骨架屏 | `skeleton-circle` | `sk-cir` |
| 骨架屏 | `skeleton-page` | `sk-pg` |
| 搜索栏 | `search-bar-wrap` | `sb-wrap` |
| 搜索栏 | `search-bar-icon` | `sb-icon` |
| 搜索栏 | `search-bar-clear` | `sb-clear` |
| 结算栏 | `checkout-bar` | `cob` |
| 结算栏 | `checkout-bar-fixed` | `cob-fx` |
| 分段器 | `segmented` | `seg` |
| 分段器 | `segmented-item` | `seg-it` |
| 分段器 | `segmented-block` | `seg-blk` |
| 折叠面板 | `collapse` | `clp` |
| 折叠面板 | `collapse-summary` | `clp-sum` |
| 折叠面板 | `collapse-content` | `clp-ct` |
| 开关 | `switch-loading` | `switch-ldg` |
| 开关 | `switch-thumb` | `switch-th` |
| 通知栏 | `notice-text` | `notice-tx` |
| 通知栏 | `notice-scroll` | `notice-scr` |
| 上传 | `upload-trigger` | `upload-tg` |
| 上传 | `upload-grid` | `upload-gd` |
| 列表 | `list-item-compact` | `list-item-cp` |
| 评分 | `rate-readonly` | `rate-ro` |
| 标题 | `section-title` | `section-tt` |
| 布局 | `input-bar-fixed` | `input-bar-fx` |
| 分隔线 | `hairline-top` | `hl-t` |
| 分隔线 | `hairline-bottom` | `hl-b` |

### 迁移动作

1. 全局替换上表旧名 → 新名（注意 `skeleton` → `sk` 时用全字匹配，避免误伤 `af-skeleton-page` 组件标签；`toast`/`progress` 家族不要动）。
2. 升级 `@af-mobile/eslint-plugin` 至配套版本，旧类名会被 `token-whitelist` 规则拦截并给出最近邻建议。
3. 自定义扩展（`recipes.project.css` / `extraClass`）中如引用旧名，同步替换。

---

## 0. 兼容性策略

| 版本 | definePage | createPage | 说明 |
|------|-----------|------------|------|
| v2.0.0 | 保留（内部委托 createPage） | 推荐，文档主推 | 兼容层无功能损失 |
| v2.1.0 | 标记 deprecated，控制台警告 | 主推 | 引导迁移 |
| v3.0.0 | 移除 | 唯一 API | 全面实例化 |

**建议**：新页面直接用 `createPage`；存量页面可在 v2.0 继续用 `definePage`，按计划迁移。

---

## 1. definePage → createPage

### 1.1 为什么

v1.3 的 `definePage` 是全局单例（state/computed/actions 挂在模块级对象），多页面同屏会互相覆盖，effect/computed 也无法级联清理。`createPage` 是实例化工厂：

- 每次调用返回独立实例，`mount()` / `unmount()` 管理生命周期
- 新增 `setup` 生命周期：`createResource` 等命令式初始化在此执行（**不要放 computed 内**）
- `actions` 第一个参数注入 state

### 1.2 迁移示例

```javascript
// v1.3：definePage（全局单例 + 闭包引用 + actions 不传 state）
import { definePage } from '@af-mobile/ui';
definePage({
  state: { count: 0, userId: 1 },
  computed: {
    double: () => page.count * 2,          // 闭包引用，鸡生蛋
  },
  actions: {
    increment: () => { page.count++; },    // 不传 state
  },
});
```

```javascript
// v2.0：createPage（实例化 + 参数注入 + setup + 显式生命周期）
import { createPage } from '@af-mobile/ui';

const page = createPage({
  state: { count: 0, userId: 1 },
  computed: {
    double: (s) => s.count * 2,            // 参数注入，避免鸡生蛋
  },
  setup: (s) => {                          // 命令式初始化：createResource 放这里
    const userResource = createResource(
      () => s.userId,
      (id) => fetchPage(`/api/user/${id}`)
    );
    return { user: userResource };         // 挂到 page.refs
  },
  effects: {
    mount: () => console.log('mounted'),
    route: (params) => console.log('route', params),
  },
  actions: {
    increment: (s) => { s.count++; },      // state 作为第一个参数
  },
});

page.mount(document.querySelector('#app'));
page.unmount();                            // 级联清理所有 effect + computed + 上游订阅
```

### 1.3 关键点

| 差异 | v1.3 | v2.0 |
|------|------|------|
| 生命周期 | 无显式卸载 | `mount()` / `unmount()` |
| setup | 无 | 新增，`createResource` 等在此调用 |
| actions 参数 | 不传 state | 第一个参数注入 state |
| computed 写法 | 闭包引用 | `(s) => ...` 参数注入 |
| setup 返回值 | — | 挂到 `page.refs` |

---

## 2. router 变更

### 2.1 query string（新能力）

`go('/list?page=2')` 现在会解析 query 并**合并进 params**：

```javascript
import { route, go, start } from '@af-mobile/ui';

route('/list', (params, ctx) => {
  ctx.outlet.innerHTML = `<div>第 ${params.page} 页</div>`;  // params.page === '2'
});
start({ outlet: '#app' });
go('/list?page=2');
```

### 2.2 RouterError（行为变化）

v1.3 嵌套路由子 outlet 选择器未命中时**静默回退**；v2.0 改为**抛出 `RouterError`**，避免页面白屏无告警：

```javascript
import { RouterError } from '@af-mobile/ui';

try {
  await go('/detail');
} catch (e) {
  if (e instanceof RouterError) console.warn('outlet 未找到', e.message);
}
```

### 2.3 scrollBehavior（新能力，仿 Vue Router）

`start()` 新增 `scrollBehavior` 选项，返回 `{x,y}`、`{el,top}` 或 `false`（禁止滚动）：

```javascript
start({
  outlet: '#app',
  scrollBehavior: (to, from, savedPosition) => {
    if (to.path === '/detail') return { el: '#comments', top: 0 };  // 滚动到元素
    if (savedPosition) return savedPosition;                         // 回退恢复位置
    return { x: 0, y: 0 };                                           // 默认顶部
  },
});
```

### 2.4 afterEach 返回取消函数（行为变化）

v1.3 `afterEach` 是单变量覆盖，多个页面订阅会互相踩掉；v2.0 改为 Set 集合，**返回取消函数**：

```javascript
const cancel = afterEach((route, params, path) => fn(params));
// 页面卸载时取消订阅，避免泄漏
cancel();
```

---

## 3. i18n 复数规则（新能力）

字典条目可以是复数对象 `{ zero/one/two/few/many/other }`，按 CLDR 规则选形：

```javascript
import { addMessages, setLocale, t } from '@af-mobile/ui';

addMessages('en-US', {
  'cart.items': { one: '{n} item', other: '{n} items' },
});
setLocale('en-US');
t('cart.items', { n: 1 });   // "1 item"
t('cart.items', { n: 3 });   // "3 items"
```

内置语言：`en/zh/ja/ar/fr/es/pt/ru/uk`（未知语言回退英文规则；中文/日语恒为 `other`）。

---

## 4. theme 系统主题监听（新能力）

`initTheme()` 现在监听 `prefers-color-scheme` 变化：仅在用户**未显式设定**主题时跟随系统，并通过 `themechange` 事件通知组件：

```javascript
import { initTheme } from '@af-mobile/ui';
initTheme();   // 入口尽早调用（组件挂载前）
```

---

## 5. 迁移 checklist

- [ ] 存量 `definePage` 页面 → 确认可在 v2.0 继续运行；新页面用 `createPage`
- [ ] `actions` 内读取 state：改为参数注入 `(s, ...args)`
- [ ] `computed` 内依赖外部 state：改为 `(s) => ...`
- [ ] `createResource` 若原写在 computed 内：移到 `setup()`，返回值挂 `refs`
- [ ] 订阅 `afterEach` 的代码：接收返回的取消函数并在卸载时调用
- [ ] 依赖"子 outlet 静默回退"的逻辑：改用 `RouterError` 捕获或确认选择器存在
- [ ] 需要滚动控制的页面：配置 `scrollBehavior`
- [ ] 多语言复数文案：改为复数对象字典格式
- [ ] 入口调用 `initTheme()` 以启用系统主题跟随

---

## 6. 验证

```bash
npm test          # 单元测试（vitest）
npm run test:e2e  # 浏览器 E2E（Playwright）
npm run size      # 体积预算（L0 运行时 ≤ 8.0KB gzip）
```
