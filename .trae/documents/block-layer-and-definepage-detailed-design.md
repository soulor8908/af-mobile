# 详设计划:L3.5 Block 层 + definePage 页面运行时

> 本文件是「写详设」的计划。执行后产出一份设计文档 `docs/design/l3.5-block-detailed-design.md`,以及文档中规定的实现项清单(实现本身在详设批准后另起任务)。

---

## 一、Summary(要做什么)

写一份详设文档 `docs/design/l3.5-block-detailed-design.md`,定义两个紧耦合的新层:

1. **L3.5 Block 层** —— 40 个粗粒度复合 Web Component(`af-auth-form`/`af-product-grid`/`af-setting-group`...),每个内部组合现有 L3 af-* 原子 + recipe class + 内置交互/状态/a11y/移动端适配。AI 只写 Block 标签 + props,不写内部结构。
2. **definePage 页面运行时** —— 单一入口 `definePage({...})`,统一调度 state/computed/effects/actions/transform/数据源/绑定/错误边界/缓存/过渡。复用现有 `state.js`(signal/computed/effect)、`router.js`(keep-alive/transition)、`fetch.js`(fetchPage),不重造响应式。

文档需决策完整、可被实现者直接落地,与现有 L1/L2/L3/L4 体系无缝衔接。

---

## 二、Current State Analysis(基于 Phase 1 探索)

### 2.1 已存在的能力(definePage 必须复用,不得重造)

| 文件 | 已有能力 | definePage 如何复用 |
|---|---|---|
| `src/lib/state.js` | signal/computed/effect/batch/bus,自动依赖追踪(`_cur` 注入) | definePage.state → 内部转 signal;computed → 直接用 computed;effects → effect 包裹 |
| `src/lib/router.js` | route/go/back + beforeEach/afterEach + keep-alive 缓存 + startViewTransition 转场 + 嵌套路由 | definePage.keepAlive/transition → 透传 route() 选项;effects.route → 订阅 router current() |
| `src/lib/fetch.js` | fetchPage + 去重 + 缓存 + 拦截器 + 重试 + 超时 + 错误分类(Timeout/Http/Abort) | af-data 内部调 fetchPage,transform 接其结果 |
| `src/lib/af-element.js` | AfElement 基类 + defineProp + escapeHtml + html 模板 + emit + 5 生命周期 + i18n 自动应用 + 滚动锁 | Block extends AfElement,沿用 defineProp/emit/mounted/unmounted |
| `src/lib/i18n.js` `theme.js` | t/setLocale + setTheme + localechange/themechange 事件 | definePage.effects 不直接处理,通过 state.locale/theme 响应 |

### 2.2 现有分层与预算

- L1 token(58 变量)+ L2 配方(102)+ 原子(52)= 154 白名单 class
- L3 = 20 个 af-* 组件,体积预算 ≤ 19.5KB gzip
- L4 = AI 约束(15 ESLint 规则 + system-prompt + CI)
- L3.5 Block 是**新插入层**,需独立预算(建议 ≤ 15KB gzip 全量 / 单 Block ≤ 1.5KB)

### 2.3 af-list 已是"迷你 Block"范式

`src/components/af-list.js` 已具备:Light DOM + useShadow=false + 内部 state(_page/_isLoadingMore/_hasMore)+ fetch 触发(loadmore/refresh)+ 虚拟滚动逻辑 + renderItem 委托 + i18n map + a11y。**Block 层就是把这个范式放大到"一个完整交互单元"**,新增的 af-product-grid/af-auth-form 等照此模式写,但内部组合多个 af-* 而非单个 recipe。

### 2.4 ESLint 插件结构

`eslint-plugin-af-mobile/index.js` 已有 15 规则按 L1/L2/L3 分组,`recommended` config 统一启用。Block 层新增 `wc-block-*` 规则集,沿用同一插件、同一 config 扩展点。

### 2.5 白名单三源同步机制

`scripts/gen-whitelist.mjs` 扫描 `src/**/*.css` + `src/index.js` 自动生成 `whitelist-v1.json`;`scripts/check-whitelist-sync.mjs` 校验 CSS/JS ↔ JSON ↔ prompt 三源一致。Block 层若新增 class 需走同一流程;若只用 data-role + 现有 recipe class 则零白名单膨胀(推荐)。

---

## 三、Proposed Changes(详设文档的产出)

### 3.1 产出文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `docs/design/l3.5-block-detailed-design.md` | 新增 | 详设主文档 |
| `docs/design/iteration-detailed-design.md` | 编辑 | 追加 L3.5 迭代项章节 |

### 3.2 详设文档完整大纲(共 12 章)

#### 第 0 章 概述:L3.5 的位置与三层颗粒度

- 四层分层对照表追加 L3.5 行(位置/内容/防护/阻断)
- 三层颗粒度图:Page(5 槽位)→ Block(40 个,主战场)→ Atomic(20 af-* + 154 class,不暴露给 AI)
- 决策 D1:Block 颗粒度上限定 60 行/80 tokens/5 props;下限 15 行/20 tokens/2 props
- 决策 D2:Block 内部强制五态(idle/loading/error/empty/success)+ a11y + 移动端适配,这是区别 DesignGUI 的质量保证层

#### 第 1 章 Block 协议规范

- **1.1 命名**:`af-{domain}-{form|grid|list|group|card|...}`,全小写连字符
- **1.2 基类**:Block extends AfElement,static useShadow 按 Light/Shadow 选(默认 Light 复用 recipe)
- **1.3 属性契约**:用 `AfElement.defineProp` 声明,类型限 String/Number/Boolean/Array/Object,每个 Block props 数 2-5
- **1.4 variant 机制**:单 variant 属性,枚举值,内部 onAttributeChange 切换渲染模板(参考 af-skeleton-page 的 4 变体)
- **1.5 事件契约**:`af-{block}:{action}` 格式,emit 含 composed:true,事件 detail schema 必须文档化
- **1.6 状态完整性 checklist**:每个 Block 必须实现的 5 态 + a11y + 移动端清单(强制,ESLint wc-block-states 检测)
- **1.7 内部组合规则**:Block 内部只能用 af-* + recipe class + data-role,禁止裸 div+inline style(继承 wc-light-no-style)
- **1.8 不暴露原则**:Block 内部结构对 AI 不可见,AI 只看标签+props+事件;内部 ref 用 data-role

#### 第 2 章 Block 内部交互逻辑归属

- **2.1 Block 内部交互**(倒计时/校验/loading/虚拟滚动):库作者写,封在 Block 类方法,AI 不写
- **2.2 Block 间协调**(登录后跳转/列表筛选联动):AI 写 `on-*` 声明式字符串(`redirect:/path`/`toast:$msg`/`setState:key=val`),框架翻译
- **2.3 页面级数据编排**(fetch+处理+多 Block 分发):AI 写 definePage.transform 纯函数
- **2.4 业务定制**(手势/拖拽/第三方 SDK):AI 写 `<script>` addEventListener,ESLint 仅约束不漂移到改 Block 内部
- 决策 D3:on-* 只接受声明式字符串,不接受 JS 表达式(否则退化为写 JS)

#### 第 3 章 definePage 原语规范(8 个,覆盖 React/Vue 13 项必备能力)

- **3.1 state**(对应 useState/ref):声明式字段,内部转 signal;引用全局 state 用 `state.cart` 语法
- **3.2 computed**(对应 useMemo/computed):纯函数,**自动依赖追踪**(复用 state.js 的 _cur 机制,AI 不写 deps 数组)
- **3.3 effects**(对应 useEffect/watch):白名单 key(mount/unmount/route/online/visible/storage/interval/resize/visibility),不接受任意 addEventListener
- **3.4 transform**(纯函数):接口数据 → Block props schema,ESLint wc-transform-pure 强制无副作用
- **3.5 actions**(对应 reducer):纯函数状态变更,返回新 state 片段
- **3.6 onError**(对应 ErrorBoundary):错误边界,按 ctx.block 分流处理
- **3.7 transition**(对应 Transition):枚举 slide/fade/none,透传 router.js 的 startViewTransition
- **3.8 keepAlive**(对应 KeepAlive):enabled/save/restore,透传 router.js 的 keep-alive 缓存
- 每个原语:签名 + 示例 + ESLint 约束 + 与 React/Vue/Svelte 对照

#### 第 4 章 af-data 数据源 + :bind 数据绑定(definePage 内置)

- 决策 D4(definePage 含全部):af-data 和 :bind 是 definePage 的语法糖,内部由 page.js 调度,对 AI 暴露单一 definePage 入口
- **4.1 `<af-data>` 标签**:src 属性触发 fetchPage,ref 属性供 :bind 引用,内部 loading/error 状态自动同步到 definePage.state
- **4.2 `:bind` 语法**:`:items="ds.products"` 单向绑定,`@event="actions.xxx"` 事件绑定,框架自动建立 signal→Block attribute 的响应式管道
- **4.3 `:model` 双向**:Block emit change → framework 写回 state → 重新下发到 Block(替代 v-model)
- **4.4 transform 挂载点**:`<af-data src=... transform="transformFn">` 或 definePage.transform 字段,二选一

#### 第 5 章 40 个 Block 清单与分组

按 8 类列出全部 40 个 Block,每个含:用途/variant/props 数/内部组合的 af-*/对应场景。分组:
- 头部(4):page-header/nav-bar/tab-bar/search-bar
- 表单(6):auth-form/filter-form/edit-form/search-form/upload-form/stepper-form
- 列表(8):product-grid/setting-group/message-list/order-list/comment-list/feed-list/search-result/category-list
- 卡片(6):profile-card/stat-card/info-card/price-card/user-card/order-card
- 反馈(5):list-empty/error-state/loading-skeleton/toast-stack/confirm-dialog
- 导航(4):tab-bar/bottom-nav/breadcrumb/stepper-nav
- 操作(4):action-sheet/danger-action/bulk-action/floating-action
- 展示(3):hero-banner/swiper-card/detail-gallery

#### 第 6 章 三个验证页面的 Block 分解(登录/商品列表/设置)

- 每页:现有方式 token 估算 vs Block+definePage 方式 token 估算
- 每页:Block 调用清单 + definePage 配置示例 + transform 纯函数示例
- 汇总表:3 页平均降幅 56-80%,诚实版(含 transform 80 tokens)

#### 第 7 章 ESLint 规则集(wc-block-* + definePage 约束)

新增规则(写入 `eslint-plugin-af-mobile/rules/`):
- `wc-block-states`:Block 必须实现 5 态(检测 mounted 中 loading/error/empty 分支)
- `wc-block-props-count`:Block props 数 2-5(检测 defineProp 调用数)
- `wc-block-no-internal-ref`:AI 代码禁止 querySelector Block 内部(检测消费端代码)
- `wc-effects-whitelist`:effects key 只能在白名单
- `wc-transform-pure`:transform 函数体无 fetch/DOM/赋值外部(用 AST 检测)
- `wc-bind-syntax`:`:bind` 只能绑定 definePage.state/computed/af-data 字段
- `wc-no-addeventlistener`:消费端禁止裸 addEventListener,必须走 effects 或 @event
- `wc-definepage-single`:每页只允许一个 definePage 调用
- 每条规则:意图/检测逻辑/正反例/自动修正可行性/severity

#### 第 8 章 与现有体系的衔接

- **8.1 与 L1/L2**:Block 内部用 recipe class + token,不新增 class(若必须新增走三源同步)
- **8.2 与 L3**:Block 组合 af-*,不修改 af-* 源码;af-list 等已有复合行为的保持 L3 不重分类
- **8.3 与 L4**:Block 标签加入 system-prompt 的 L3 组件简表;wc-block-* 规则加入 recommended config;白名单 v1 不膨胀(Block 用 data-role)
- **8.4 与 router.js**:definePage.keepAlive/transition 透传 route() 选项;effects.route 订阅 current()
- **8.5 与 state.js**:definePage 内部全用 signal/computed/effect,不引入新响应式原语
- **8.6 与 fetch.js**:af-data 内部调 fetchPage,错误类型(Timeout/Http/Abort)透传到 onError

#### 第 9 章 体积预算与 CI 集成

- L3.5 Block 全量预算 ≤ 15KB gzip(40 个 × 平均 0.4KB)
- 单 Block 预算 ≤ 1.5KB gzip(复杂 Block 如 product-grid 可至 2KB)
- definePage 运行时(page.js)≤ 2KB gzip
- CI Step 2 体积检查追加 L3.5 行
- CI Step 1 白名单同步:Block 不新增 class,无需改 gen-whitelist.mjs;若新增则走原流程

#### 第 10 章 System Prompt 集成

- L3 组件简表追加 L3.5 Block 简表(40 个,每个一行:标签/variant/props/事件)
- 禁令追加:禁止 AI 写 Block 内部结构、禁止裸 addEventListener、禁止改 af-* 源码
- 正反例:登录页用 af-auth-form(正) vs 手拼 form-row+input+btn(反)
- `scripts/build-prompt.mjs` 扩展:扫描 src/blocks/*.js 提取 Block 元数据注入 prompt

#### 第 11 章 实现路线图(供后续迭代计划引用)

- v1.4.0:definePage 运行时 + af-data + :bind + 3 个验证 Block(auth-form/product-grid/setting-group)+ wc-block-* 规则
- v1.5.0:补齐 40 个 Block(分 4 批,每批 10 个)
- v1.6.0:跨项目 usechat 协议(基于 Block schema 序列化)

---

## 四、Assumptions & Decisions(关键决策索引)

| ID | 决策 | 理由 |
|---|---|---|
| D1 | Block 颗粒度上限 60 行/80 tokens/5 props | 超过退化为代码生成,失去约束意义 |
| D2 | Block 强制五态 + a11y + 移动端适配 | 区别 DesignGUI 的质量保证层,production-grade 核心 |
| D3 | on-* 只接受声明式字符串 | 避免 AI 写 JS 表达式漂移 |
| D4 | definePage 含 af-data + :bind(统一入口) | AI 只学一个 API,内部实现分 page.js/bind.js/data.js 可独立测试 |
| D5 | Block 用 data-role 不膨胀白名单 | 复用现有 wc-light-no-style 模式,零白名单成本 |
| D6 | definePage 复用 state.js signal/computed/effect | 不重造响应式,自动依赖追踪已有 |
| D7 | keepAlive/transition 透传 router.js | 路由层能力已完备,不重复实现 |
| D8 | L3.5 独立目录 src/blocks/ + 独立 wc-block-* 规则集 | 与 L3 原子层职责分离,便于预算/规则/prompt 独立管理 |

---

## 五、Verification Steps(详设完成后如何验证)

### 5.1 文档自洽性检查

- [ ] 40 个 Block 清单与第 6 章 3 个验证页面分解一致(登录用到 auth-form/agreement-row/third-login 等)
- [ ] 8 个 definePage 原语与 React/Vue 13 项必备能力对照表全覆盖
- [ ] wc-block-* 规则与第 1 章 Block 协议条款一一对应
- [ ] 体积预算与现有 L4 §0.3 预算表不冲突

### 5.2 与现有代码一致性检查

- [ ] definePage 示例代码引用的 signal/computed/effect 签名与 `src/lib/state.js` 一致
- [ ] af-data 示例引用的 fetchPage 选项与 `src/lib/fetch.js` 一致
- [ ] Block 类示例 extends AfElement + defineProp 用法与 `src/lib/af-element.js` 一致
- [ ] router.js 的 keepAlive/transition 选项名与详设透传描述一致

### 5.3 token 经济性复核

- [ ] 3 个验证页面 token 估算诚实(含 transform 80 tokens)
- [ ] 与 DesignGUI 85-92% 降幅对比合理(af-mobile 因含质量保证层,降幅 56-80% 略低但合理)

### 5.4 实现可行性预演

- [ ] 挑 auth-form Block:按详设第 1 章协议 + 第 2 章交互归属,伪代码能跑通"标签+props+事件→内部五态+a11y"
- [ ] 挑商品列表页:按详设第 3 章 definePage + 第 4 章 af-data/:bind,伪代码能跑通"fetch→transform→3 个 Block 分发"

---

## 六、执行步骤(Phase 4 批准后立即执行)

1. 创建 `docs/design/l3.5-block-detailed-design.md`,按上述 12 章大纲填充内容
2. 编辑 `docs/design/iteration-detailed-design.md`,追加 v1.4.0/v1.5.0/v1.6.0 章节引用详设
3. 跑文档自洽性检查(5.1)+ 与现有代码一致性检查(5.2)
4. 返回最终响应,附详设文档路径与关键决策摘要

**不在本次范围**:实现 src/blocks/*.js、lib/page.js、wc-block-* 规则代码 —— 这些在详设批准后另起任务。
