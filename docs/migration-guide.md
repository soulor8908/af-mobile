# aiflow-ui v2.0 迁移指南

> 适用范围：v1.3.x → v2.0.0
> 目标：L0 运行时架构修复（Owner pattern / createPage 实例化 / router 增强 / i18n 复数 / theme 系统主题）。
> 本文档只覆盖**行为变化与迁移动作**；完整设计见 `docs/design/aiflow-ui-evolution-v3.md`。

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
import { definePage } from 'aiflow-ui';
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
import { createPage } from 'aiflow-ui';

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
import { route, go, start } from 'aiflow-ui';

route('/list', (params, ctx) => {
  ctx.outlet.innerHTML = `<div>第 ${params.page} 页</div>`;  // params.page === '2'
});
start({ outlet: '#app' });
go('/list?page=2');
```

### 2.2 RouterError（行为变化）

v1.3 嵌套路由子 outlet 选择器未命中时**静默回退**；v2.0 改为**抛出 `RouterError`**，避免页面白屏无告警：

```javascript
import { RouterError } from 'aiflow-ui';

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
import { addMessages, setLocale, t } from 'aiflow-ui';

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
import { initTheme } from 'aiflow-ui';
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
