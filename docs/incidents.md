# 返工案例与详细规则（incidents）

> 本文件是根 [AGENTS.md](../AGENTS.md) 的细节层：12 条返工反模式、库/消费端详细边界、
> 修改 checklist、数据飞轮接入细节。根宪章只保留原则 + 门禁 + 指针，本文件按需读取。
> 新增反模式条目时编号顺延（当前 #1-#12），并同步更新根 AGENTS.md 的指针。

---

## 一、返工反模式清单（12 条）

> 每条都是从 v1.3.0 返工案例提炼的**实际发生过的积分浪费**，违反即返工。

### XSS 与安全

**#1 用户输入插入 innerHTML 前必须转义**
- 反模式：`this.innerHTML = \`<h2>${this.title}</h2>\``（title 含 `<img onerror>` 会执行）
- 正确做法：`import { escapeHtml as esc } from '../lib/af-element.js'`，然后 `${esc(this.title)}`
- 适用范围：所有从 attribute / property / slot 获取的文本值插入 innerHTML 时
- 例外：`html` 模板标签已自动转义插值，用 `html\`...\`` 时无需手动 esc

### 无障碍（Accessibility）

**#2 Shadow DOM 动画必须响应 prefers-reduced-motion**
- 反模式：CSS 中有 `transition` / `animation` 但无 `@media (prefers-reduced-motion: reduce)` 覆盖
- 正确做法：每个含动画的 Shadow DOM 组件 CSS 末尾添加：
  ```css
  @media (prefers-reduced-motion: reduce) {
    .track, .dot { transition: none; animation: none; }
  }
  ```
- 适用范围：所有 Shadow DOM 组件（af-swiper / af-dialog / af-action-sheet / af-picker 等）

**#3 模态/弹层组件必须实现焦点陷阱 + 焦点还原**
- 反模式：`open()` 不保存焦点，`close()` 不还原焦点
- 正确做法：
  ```javascript
  open() {
    this._previouslyFocused = document.activeElement;
    // 聚焦到组件内首个可交互元素
  }
  close() {
    if (this._previouslyFocused) this._previouslyFocused.focus();
    this._previouslyFocused = null;
  }
  ```
- 适用范围：af-dialog / af-action-sheet / af-picker / af-dropdown（关闭还原焦点到触发器）

**#4 交互列表必须支持键盘导航**
- 反模式：列表项只能点击，无 Arrow/Enter 键盘操作
- 正确做法：容器设 `tabindex="0"`，监听 keydown：ArrowUp/Down 移动活跃项，Enter 触发 itemclick
- 适用范围：af-list 及任何含可选项的容器

**#5 ESLint 规则新增 ARIA 字段必须同步检测逻辑**
- 反模式：`aria-requirements.json` 加了 `"ariaChecked": true`，但 `wc-aria-required.js` 没写对应检测分支
- 正确做法：JSON 中声明的每个字段，必须在规则 JS 中有对应的 `if (req.xxx && !source.includes(...))` 分支
- 适用范围：修改 `eslint-plugin-af-mobile/utils/aria-requirements.json` 时

### 代码健壮性

**#6 JSON.parse 必须包裹 try-catch**
- 反模式：`return JSON.parse(val || '[]');`（非法 JSON 直接崩组件）
- 正确做法：
  ```javascript
  try { return JSON.parse(val || '[]'); }
  catch { return defVal; }
  ```
- 适用范围：`af-element.js` 的 `defineProp` 中 Array / Object 类型解析，及任何调用 JSON.parse 处理外部输入的地方

**#7 Light DOM 组件禁止内联 style 属性**
- 反模式：`this.innerHTML = '<img style="width:100%;object-fit:cover">'`
- 正确做法：用 `data-role` 属性 + `recipes.css` 中的宿主规则
  ```javascript
  // JS
  '<img data-role="placeholder" src="..." alt="">'
  // recipes.css
  af-img[data-role="placeholder"] { width: 100%; object-fit: cover; }
  ```
- 适用范围：所有 Light DOM 组件（af-list / af-tabs / af-toast / af-dropdown / af-backtop / af-img / af-switch / af-search-bar / af-skeleton-page / af-upload / af-action-sheet）
- 例外：`setProperty('--css-var', val)` 设置 CSS 自定义属性允许（非视觉属性）

### 工程规范

**#8 新增 CSS class 必须同步登记三源白名单**
- 反模式：在组件中用了 `af-backtop-fixed` class，但没登记到 whitelist，导致 CI 三源同步失败
- 正确做法：新增 class 时，确认以下三源同步：
  1. 源码 CSS（`src/recipes.css` 或 `src/atomic.css`）中定义
  2. `eslint-plugin-af-mobile/utils/whitelist-v1.json` 中登记
  3. `prompt/system-prompt.md` 中注入（由 `build-prompt.mjs` 自动完成，跑 `npm run prompt:check` 验证）
- 或改用 `data-*` 属性选择器绕开白名单（推荐，减少白名单膨胀）

**#9 CI 的 ESLint 范围必须覆盖所有含 JS 的目录**
- 反模式：`npx eslint src/` 漏掉 test/ 和 scripts/，导致测试/脚本中的违规不被检测
- 正确做法：`npx eslint src/ test/ scripts/ e2e/ prompt/ eval/ mcp/ eslint-plugin-af-mobile/ adapters/ starter/src/ --max-warnings 0`
- 适用范围：修改 `.github/workflows/ci.yml` 的 ESLint 步骤时

**#10 布尔属性 setter 为 false 时必须 removeAttribute**
- 反模式：`this.active = false` 只设值不删属性，导致 HTML 属性仍在（"存在即真"语义冲突）
- 正确做法：`defineProp` 中 Boolean 类型 setter：true → `setAttribute`，false → `removeAttribute`
- 同时：属性解析时 `"false"` 字符串应解析为 false（允许显式关闭）

**#11 有构建工程（Vite）内的样式引入必须用 JS `import`，禁止裸包名 `<link>`**
- 反模式：`<link rel="stylesheet" href="@af-mobile/ui/css">`（裸包名 `<link>`），或把库的 deep import 路径写错（`@af-mobile/ui/src/components/*`）撞 exports 墙
- 后果：Vite 不支持 `<link>` 裸导入，会当 SPA 路由回退，**静默返回 573B HTML 而非 CSS**，样式整包丢失且**不报任何错**——肉眼看似正常渲染，实为下降到浏览器默认样式
- 正确做法：CSS 一律在 `<script type="module">` 内 `import '@af-mobile/ui/css'`（走 exports，与脚手架 `src/main.js` 一致）；组件按需引入用 `@af-mobile/ui/components/af-x.js`；`<link>` 仅限无构建双击打开场景用相对路径 `node_modules/@af-mobile/ui/src/index.css`
- 交付前用 `getComputedStyle` 抽查按钮/文字色值与圆角，确认非浏览器默认值；核对 `document.styleSheets` 含 `.btn` 规则、CSS 请求 `content-type: text/css`

**#12 工程入口禁止顶层 `await register(...)`（生产分包 entry ↔ chunk 循环死锁）**

- 反模式：Vite/Rollup 工程的入口 `main.js` 写顶层 `await register('af-tabbar', ...)`（TLA）
- 根因：`register()` 走动态 `import()` 按需分包。生产分参会把「入口与组件 chunk 共用的模块」
  （典型：入口经 `src/index.js` 再导出 `escapeHtml`/`html`/`t`，组件又从 `lib/af-element.js`/
  `lib/i18n.js` 引入**同一个模块**）划入**入口 chunk**，组件 chunk 因此反向静态 import 入口 chunk。
  入口一旦 TLA，求值被自己 `await` 的 chunk 卡住，chunk 又等着入口求值完成——互等死锁：
  chunk 永不 resolve、组件永不注册、**应用全白且控制台零报错**（dev 原生 ESM 不复现，
  只在生产构建暴露；无共用模块的组件如 `af-switch` 能注册，更添迷惑性）
- 真实案例：「AI 待办」应用（豆包二次使用本框架生成），dev 全绿 → 生产构建白屏 → 无头浏览器
  逐 chunk 定位才发现循环依赖，最终靠改成静态导入绕过（2026-08-31，@af-mobile/ui 1.9.0）
- 正确做法：入口 `register(...)` **不 await**（只发起注册），`route(...)` 后 `start('#app')` ——
  router 在每次渲染前 `whenReady()` 统一等待注册完成（无待办时 `hasPending()` 短路，零额外微任务）；
  不使用 router 自绘时，在注入组件 property 前 `await whenReady()`；
  或静态导入组件类 + `customElements.define`（tree-shaking 最优）；
  或构建配置 `inlineDynamicImports: true`（关闭分包，失去按需加载）
- 排查特征：页面空白 + 控制台零报错 + `customElements.get('af-x')` 部分为 undefined +
  构建产物中组件 chunk 顶部出现 `import { ... } from "./index-xxx.js"`（反向依赖入口 chunk）。
  register 的看门狗（默认 2s，`setRegisterTimeout` 可调/可关）超时会输出此诊断
- 关联测试：`test/register-state.test.js`（whenReady 语义 / 首渲染等待 / API 语义统一）

---

## 二、库开发 vs 消费端：详细边界

> 这是库源码与消费端最容易搞混的地方。搞混 = 产出错误代码 = 浪费积分。快速判断流程见根 AGENTS.md §2。

### 2.1 两套规则集对照

| 维度 | 库开发（src/） | 消费端（用户页面） |
|---|---|---|
| **ESLint 规则集** | COMPONENT_RULES（L3 的 6 条 wc-* 规则） | AI_RULES（L1+L2+L3+L3.5+k 全部 24 条） |
| **白名单约束** | 不约束（`token-whitelist: off`） | 严格约束（228 class 封闭集） |
| **内联 style** | Light DOM 组件禁止（`wc-light-no-style`），Shadow DOM 允许 | 完全禁止（`no-inline-style`） |
| **自定义 class** | 允许（库源码自有设计约束） | 禁止（只能用 228 白名单 class） |
| **Tailwind 语法** | 不约束 | 禁止（`no-tailwind-syntax`） |
| **任意值语法** | 不约束 | 禁止（`no-arbitrary-value`） |
| **配方破坏** | 不约束 | 禁止（`no-recipe-break`） |

### 2.2 配置位置

```javascript
// eslint.config.js
// 库源码：src/**/*.js → COMPONENT_RULES（关闭 AI 约束，启用 L3 组件质量规则）
{
  files: ['src/**/*.js'],
  rules: { ...COMPONENT_RULES },  // wc-light-no-style / wc-shadow-use-token / wc-aria-required 等
}

// 消费端代码 / 测试 / 脚本：启用完整 AI 规则集
{
  files: ['**/*.test.js', 'test/**/*.js', 'scripts/**/*.js'],
  rules: { ...AI_RULES },  // token-whitelist / no-inline-style / no-recipe-break 等
}
```

### 2.3 常见搞混场景

**场景 A：在库源码中误用白名单约束**
- 错误：在 `src/components/af-list.js` 中不敢用 `list-item` class，以为受白名单约束
- 事实：库源码不受白名单约束，`list-item` 是 recipes.css 中定义的配方 class，库内可直接用

**场景 B：在消费端误用库开发自由度**
- 错误：在用户页面 HTML 中写 `<div class="my-custom-card">`（非白名单 class）
- 事实：消费端只能用 228 白名单 class，自定义 class 会触发 ESLint error

**场景 C：在 Light DOM 组件中写内联 style**
- 错误：在 `af-img.js`（Light DOM）中写 `this.style.width = '100%'`
- 事实：Light DOM 组件禁止任何 `this.style.xxx` 和 `<style>` 标签（`wc-light-no-style` 规则）
- 正确：用 `data-role` + recipes.css，或迁移到 Shadow DOM

**场景 D：在 Shadow DOM 组件中硬编码颜色**
- 错误：在 `af-dialog.js`（Shadow DOM）中写 `color: #fff`
- 事实：Shadow DOM CSS 必须用 `var(--*)` 引用 token（`wc-shadow-use-token` 规则）
- 正确：`color: var(--c-onbrand)`
- 例外：`dialog::backdrop` 的 `rgba(0,0,0,.5)` 遮罩色允许硬编码

---

## 三、修改 checklist（按文件类型）

### 修改组件源码 `src/components/af-*.js`

- [ ] 先 Read 目标文件
- [ ] Light DOM 组件：无 `this.style.xxx`，无 `<style>` 标签
- [ ] Shadow DOM 组件：CSS 全部用 `var(--*)`，动画有 `prefers-reduced-motion` 覆盖
- [ ] 用户输入插入 innerHTML 前经过 `esc()` 或 `html` 模板标签
- [ ] 事件名 `af-{组件}:{动作}` 格式，`emit` 含 `composed: true`
- [ ] 模态组件：open() 保存焦点，close() 还原焦点
- [ ] 交互列表：支持 Arrow/Enter 键盘导航
- [ ] ARIA：满足 `aria-requirements.json` 中声明的必需属性
- [ ] 事件绑定统一 `this._listen(target, type, handler)` 登记（基类断开时自动解绑；禁止直接 addEventListener，`wc-cleanup` 会报错；外部目标切换等需立即解绑的场景可先 removeEventListener 再 `_listen`）
- [ ] `mounted()` 中的 setTimeout / 观察器在 `unmounted()` 中清理（事件监听已由 `_listen` 自动处理，无需手写 removeEventListener）
- [ ] 跑根 AGENTS.md §1 提交门禁

### 修改 ESLint 插件 `eslint-plugin-af-mobile/`

- [ ] 修改 `aria-requirements.json` 时，同步更新 `wc-aria-required.js` 检测逻辑
- [ ] 新增规则时，同步更新 `index.js` 注册和 `recommended` 配置
- [ ] 在 `test/eslint-plugin/` 添加对应测试
- [ ] 跑根 AGENTS.md §1 提交门禁

### 修改 CSS `src/*.css`

- [ ] 新增 class：同步登记 `whitelist-v1.json` + 跑 `npm run whitelist:check`
- [ ] `tokens.css` 变量：不在其他文件重定义
- [ ] 跑根 AGENTS.md §1 提交门禁

### 修改 CI / 脚本 `.github/workflows/` `scripts/`

- [ ] ESLint 范围覆盖所有含 JS 的目录
- [ ] 新增脚本：在 `package.json` 注册 npm script
- [ ] 跑根 AGENTS.md §1 提交门禁

---

## 四、数据飞轮接入细节

### 命令行等价物

```bash
node scripts/lint-flywheel.mjs <任意路径>   # lint 即喂数据（HTML/JS/MJS 都行）
npm run eval:flywheel                      # 输出飞轮分析报告（Top 规则/白名单候选/收敛度）
npx @af-mobile/prompt "需求描述"           # get_prompt 的 npx 降级入口（MCP 不可达时；--full 全量 / -o 写文件）
```

### 边界与隐私

- **零 LLM ≠ 零接入**：不需要任何 LLM 环境变量，但 MCP 工具需注册进你的 MCP 客户端（TRAE / Claude Code / Cursor 等）：已安装端用 `npx @af-mobile/mcp`（bin `af-mobile-mcp`），仓库开发态用 `node mcp/index.mjs`；纯 CLI 用法无任何注册。
- 遥测只记 时间戳/来源/工具/文件路径/规则名/行号/脱敏后消息，**不记代码内容**（style 值与 CSS 声明在落盘前剥离，见 `eval/telemetry.mjs` 的 `sanitizeMessage`；新增 ESLint 规则若消息嵌入代码片段，必须同步登记 `RULE_MESSAGE_REDACT`），不出本机；
- CI 上的遥测随 runner 销毁（本地 `.af-mobile/` 均被 gitignore）；CI 的产出是分析报告 artifact，跨周趋势由 `flywheel.yml` 定时周报 issue 承载；
- 合成 eval（`AFMOBILE_AI_API_URL`）是可选数据源之一，不是必需品。
