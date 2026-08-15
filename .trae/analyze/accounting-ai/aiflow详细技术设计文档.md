# Accounting-AI → aiflow 详细技术设计文档

> `--analyze` 阶段一产出 · 实现视角
> 依据：能力覆盖矩阵 + 详细设计文档 + 重构前基线 `2643417` 代码实现
> 目标运行模型：aiflow v2.x（28 组件 + 2 blocks + 运行时原语）。参考原代码的**需求语义**，不抄 React 写法。

---

## 1. 工程初始化与路由

```js
// main.js —— 入口
import { register, start, initTheme, initLocale } from '@af-mobile/ui';
import '@af-mobile/ui/src/recipes.css';   // 路径以安装包为准
import '@af-mobile/ui/src/atomic.css';
import '@af-mobile/ui/src/tokens.css';
import { bootstrap } from './core/appState.js';

register('af-tabbar'); register('af-list'); register('af-swipe-cell');
register('af-dialog'); register('af-toast'); register('af-field');
register('af-skeleton-page');
initTheme();
initLocale();
start({ outlet: '#app', scrollRestoration: true, keepAliveMax: 6 });
```

```js
// app.routes.js —— 6 Tab 路由（keepAlive 保留 shell 状态）
import { route, go, notFound } from '@af-mobile/ui';
route('/',       () => import('./pages/chat.js'),       { keepAlive: true });
route('/accounts', () => import('./pages/accounts.js'), { keepAlive: true });
route('/calendar', () => import('./pages/calendar.js'), { keepAlive: true });
route('/transactions', () => import('./pages/transactions.js'), { keepAlive: true });
route('/stats',  () => import('./pages/stats.js'),      { keepAlive: true });
route('/settings', () => import('./pages/settings.js'), { keepAlive: true });
notFound(() => go('/'));
```

**锁态门禁**：`start` 前先 `isVaultEnabled()`；启用则先挂 Lock 页，解锁后 `page.mount` 主 shell。

---

## 2. 数据层桥接（core/ 原样保留 + 事件桥）

`core/**` 24 文件 0 处 React import，**原样迁入**。唯一触碰点：`core/store/store.ts` 增加订阅。

```js
// core/store/store.ts —— 新增事件桥（~10 行，不改既有业务逻辑）
export class Store {
  #listeners = new Set<(snap: AppState) => void>();
  onChange(cb) { this.#listeners.add(cb); return () => this.#listeners.delete(cb); }
  #emit() { for (const cb of this.#listeners) cb(this.state); }
  // 在 save()/明文写入后调用 #emit()
}
```

**桥接三条（SKILL §3.2）**
1. **事件桥**：`store.onChange((snap) => { s.accounts = snap.accounts; ... })` → 写入 `page.state`，`:bind`/`computed` 自动响应。各页面 `setup` 建立订阅，`effects.unmount` 清理。
2. **资源桥**：`createResource` 用于需异步/可分页视图（当前项目数据全在本地 store，列表直接用事件桥即可，无需 fetch）。
3. **命令桥**：`actions` 只转发业务命令到 `core`（`store.addAccount`/`applyTransaction`/`removeAccount`…），业务状态不进页面逻辑。

**Shell 单例**（`core/appState.js`，替代原 `appState.ts`）：`store / engine / memoryStore / chatStore / quickInputStore` 单例 + `bootstrap()`（补齐到期周期记账）。

---

## 3. 页面 `createPage` 结构

> 每个页面沿用模式库（SKILL §3.3）。字段命名与 `core/types.ts` 对齐。

### 3.1 对话页 `pages/chat.js`

```js
createPage({
  state: {
    sessionId: '', messages: [], input: '', loading: false,
    samplesOpen: false, sessionsOpen: false, agentsOpen: false,
    quickManageOpen: false, detailView: null, chatOpen: false,
    activeAgentId: '', quotaVersion: 0,
  },
  computed: {
    totalAssets: () => store.getTotalAssets(),
    totalLiabilities: () => store.getTotalLiabilities(),
    recentTxs: (s) => store.state.transactions
      .slice().sort((a,b)=>(b.date+(b.time??'')).localeCompare(a.date+(a.time??''))).slice(0,5),
    sessions: () => chatStore.list(),
    quickInputs: () => quickInputStore.list(),
    agents: () => listAgents(),
    activeSession: (s) => chatStore.get(s.sessionId),
  },
  setup(s) {
    const unsub = store.onChange((snap) => { /* 触发首页总览/近期流水重算 */ });
    const chatUnsub = chatStore.onChange(() => { s.messages = ...; });
    return { unsub, chatUnsub, listEl: null, inputEl: null, promptedLoanIds: new Set() };
  },
  effects: {
    mount: () => { /* 确保 active 会话 */ },
    unmount: () => { page.refs.unsub?.(); page.refs.chatUnsub?.(); },
    visible: () => { /* 打开时还款日提示 */ },
  },
  actions: {
    send(s, text) { /* 本地引擎 / AI 流式，回调更新 s.messages */ },
    switchSession(s, id) { chatStore.setActive(id); s.sessionId = id; },
    switchAgent(s, a) { setActiveAgent(a.id); s.activeAgentId = a.id; },
    newChat(s) { const c = chatStore.create(); s.sessionId = c.id; s.messages = [INITIAL]; },
    deleteSession(s, id) { /* confirm → chatStore.remove */ },
    handleRepayOption(s, loanId, option) { /* core.applyTransaction */ },
    // ... 快捷输入增删改 / 本地确认取消 / 资产负债明细开合
  },
})
```

**AI 流式回调**：`setup` 中 `chatWithAI(t, history, cfg, callbacks)`，回调通过 `page.refs` 读写 `s.messages`（thinking/tool/streaming 多态气泡推进）。`chatStore` 同样需 `onChange` 事件桥（原 `chatStore` 无订阅，需补）。

- **气泡渲染**：白名单 class + `data-role`；`html\`...\`` 模板内 `esc()` 转义用户/AI 文本；options 用 `:bind` + 事件。
- **textarea 自适应高度**：原生 `input` 事件回调设 `style.height`（属 CSS 变量行为，用 `--af-*` 或 data-attr 承载，规避 `no-inline-style`）。

### 3.2 账户页 `pages/accounts.js`

```js
createPage({
  state: {
    name:'', type:'wallet', balance:'', limit:'', billDay:'1', dueDay:'20',
    dueNextMonth:false, principal:'', annualRate:'', termMonths:'', startDate:'',
    repaymentMethod:'equal_interest', loanDueDay:'20', error:'',
    editingId:null, /* + edit* 字段 */ editError:'',
  },
  computed: {
    activeAccounts: () => store.state.accounts.filter(a=>!a.archived),
    archivedAccounts: () => store.state.accounts.filter(a=>a.archived),
  },
  setup(s) { return { unsub: store.onChange(snap=>{}) }; },
  effects: { unmount: () => page.refs.unsub?.() },
  actions: {
    submitAdd(s){ try{ store.addAccount({...}); }catch(e){ s.error = ...; } },
    startEdit(s, acc){ /* 回填 edit* 字段 */ },
    saveEdit(s, acc){ /* 按 type 重算月供/同步周期规则 → store.updateAccount */ },
    deleteAccount(s, acc){ /* confirm → remove / archive */ },
  },
})
```

- **列表**：`af-list` + `renderItem` 内嵌 `af-swipe-cell`（slot content + slot right 编辑/删除）。
- **行内编辑态**：`s.editingId === a.id` 时渲染 `af-field` 表单（按 `a.meta.kind` 动态字段）。
- **添加表单**：`af-field`（label/type）+ `af-picker`（账户类型）+ 条件渲染（`s.type` 驱动）。

### 3.3 日历页 `pages/calendar.js`（G2-B 自建 grid）

```js
createPage({
  state: { month: currentMonth(), selectedDay: null },
  computed: {
    days: (s) => buildGrid(s.month),          // 复用 CalendarView 算法（框架无关）
    flows: (s) => store.getDailyFlows(s.month),
    dueItems: (s) => store.getDueItems(s.month, todayStr()),
    monthSummary: (s) => store.getMonthlySummary(s.month),
    dueTotal: (s) => s.dueItems.reduce((a,i)=>a+i.amount,0),
    dayTxs: (s) => s.selectedDay ? store.state.transactions.filter(t=>t.date===s.selectedDay) : [],
    dayDueItems: (s) => s.selectedDay ? s.dueItems.filter(i=>i.date===s.selectedDay) : [],
  },
  setup(s) { return { unsub: store.onChange(()=>{}) }; },
  effects: {
    unmount: () => page.refs.unsub?.(),
    resize: () => {/* grid 自适应 */},
  },
  actions: {
    shiftMonth(s, delta) { s.month = addMonths(s.month, delta); s.selectedDay = null; },
    selectDay(s, d) { s.selectedDay = s.selectedDay === d ? null : d; },
  },
})
```

- **grid**：原生 `div` + 白名单 class + `data-role`（`day-num`/`day-flow`/`day-dots`），`af-calendar` 仅作为月份选择骨架（可选）。
- **横滑切月**：`effects` 或 `data-role` 容器 touch 事件（方向锁定，同 af-swipe-cell 手法）。

### 3.4 流水页 `pages/transactions.js`

```js
createPage({
  state: {
    month: currentMonth(), typeFilter:'', accountFilter:'',
    showAdvanced:false, editing:null, adding:null,
  },
  computed: {
    txs: (s) => store.state.transactions
      .filter(t=>!s.month||t.date.startsWith(s.month))
      .filter(t=>!s.typeFilter||t.type===s.typeFilter)
      .filter(t=>!s.accountFilter||t.accountId===s.accountFilter||t.relatedAccountId===s.accountFilter)
      .sort((a,b)=>(b.date+(b.time??'')).localeCompare(a.date+(a.time??''))),
    hasAnyFilter: (s) => Boolean(s.month||s.typeFilter||s.accountFilter),
    accountName: (s) => (id) => store.getAccount(id)?.name ?? '?',
  },
  setup(s) { return { unsub: store.onChange(()=>{}) }; },
  effects: { unmount: () => page.refs.unsub?.() },
  actions: {
    clearAll(s){ s.month=''; s.typeFilter=''; s.accountFilter=''; },
    startAdd(s){ s.adding = emptyAddState(); },
    submitAdd(s, force){ /* 校验 → store.applyTransaction({confirm:force}) → 大额二次确认 */ },
    startEdit(s, t){ s.editing = {...}; },
    saveEdit(s){ /* 校验 → store.updateTransaction */ },
    onDelete(s, t){ /* confirm → store.deleteTransaction */ },
  },
})
```

- **筛选**：`af-field`(month) + `af-picker`(类型/账户) + 折叠区。
- **新增/编辑表单**：`af-field` 组，`s.adding.type` 驱动对手方字段显示。

### 3.5 统计页 `pages/stats.js`

```js
createPage({
  state: { month: currentMonth(), toast:'', exportingPng:false },
  computed: {
    summary: (s) => store.getMonthlySummary(s.month),
    cats: (s) => store.getCategoryStats(s.month),
    trend: (s) => analyzeTrends(store.state.transactions, { referenceMonth: s.month }),
    anomaly: (s) => detectAnomalies(store.state.transactions, { referenceMonth: s.month }),
    curSeries: (s) => buildCumulative(s.month),      // 提为框架无关纯函数
    prevSeries: (s) => buildCumulative(prevMonth(s.month)),
    totalAssets: () => store.getTotalAssets(),
    totalLiabilities: () => store.getTotalLiabilities(),
  },
  setup(s) {
    const chart = createChart(s.curSeries, s.prevSeries, /* ... */); // G3 纯函数 → SVG
    return { chart, unsub: store.onChange(()=>{}) };
  },
  effects: { unmount: () => page.refs.unsub?.() },
  actions: {
    exportCsv(s){ const r=buildMonthlyReport(store,s.month); downloadBlob(...); s.toast='已导出...'; },
    exportChartPng(s){ /* svgToPng → downloadBlob */ },
  },
})
```

- **走势图（G3）**：`core/analytics/chart.js` 导出 `createTrendChartSvg(series, opts)` 返回 SVG 字符串；UI 层 `html\`${svg}\`` 注入（`${{raw}}` 显式可信）。SVG 内 `stopColor`/`fill` 等 `style` 属性由 `data-role` + 白名单 class 承载，规避 `no-inline-style`。
- **进度条**：`af-progress` 或白名单 class + `data-role`（`cat-bar` width）。

### 3.6 设置页 `pages/settings.js`（复杂度最高）

```js
createPage({
  state: {
    message:'', dataBusy:false,
    providerId:'deepseek', apiKey:'', baseUrl:'', model:'deepseek-v4-flash',
    aiMessage:'', aiMessageKind:'info', testing:false,
    newMemContent:'', newMemCategory:'fact', memVersion:0,
    editingMemId:null, editMemContent:'', editMemCategory:'fact',
    agentVersion:0, editingAgent:null,
  },
  computed: {
    existing: () => loadAIConfig() ?? defaultConfig(),
    allAgents: () => listAllAgents(),
    enabledAgentCount: (s) => s.allAgents.filter(a=>!a.disabled).length,
    memories: () => memoryStore.list(),
    plans: () => store.state.installmentPlans,
    rules: () => store.state.recurringRules,
  },
  setup(s) {
    const unsubs = [store, memoryStore, chatStore].map(x => x.onChange(()=>{}));
    return { unsubs, fileRef:null, encFileRef:null };
  },
  effects: { unmount: () => page.refs.unsubs.forEach(u=>u?.()) },
  actions: {
    onAISubmit(s){ /* 校验 → saveAIConfig → resetChatHistory → onChanged */ },
    onTestAI(s){ /* testAIConfig → aiMessage 反馈 */ },
    onClearAI(s){ /* confirm → clearAIConfig → defaultConfig */ },
    exportData(s){ /* Blob → download */ },
    importData(s, file){ /* JSON.parse + isValidStateShape → store.state=... → save */ },
    exportEncrypted(s){ /* prompt 口令 → createBackup → download .abak */ },
    importEncrypted(s, file){ /* prompt 口令 → restoreBackup */ },
    clearAll(s){ /* confirm → 三路 clearAll → resetChatHistory */ },
    addMemory / startEditMemory / saveEditMemory / deleteMemory / clearAllMemories,
    onCreateAgent / onEditAgent / onDeleteAgent / onToggleBuiltin,
    toggleLock(s){ lock(); store.encryptedPersist=undefined; /* 回到 Lock */ },
  },
})
```

- **AI 配置表单**：`af-field`(password/text) + `af-picker`(服务商/模型)；`currentPreset` 决定 select vs input。
- **数据管理**：`af-upload` 或原生 `<input type="file">` 触发文件选择；`af-dialog.prompt` 收口令。
- **Agent/记忆列表**：`af-list` + `af-swipe-cell`（记忆左滑编辑/删除）。

### 3.7 锁页 `pages/lock.js`

```js
createPage({
  state: {
    mode: isVaultEnabled() ? 'unlock' : 'setup',
    busy:false, message:'', recoveryCode:'',
    pwd1:'', pwd2:'', question:'', answer:'', pwd:'',
    resetAnswerInput:'', recoveryInput:'', newPwd:'',
  },
  computed: { meta: () => loadVaultMeta() },
  setup(s) { return {}; },
  effects: {},
  actions: {
    handleSetup(s){ /* 校验 → setupVault(含 readLegacyAuxData) → 展示一次性恢复码 */ },
    handleUnlock(s){ /* unlockWithPassword → finishUnlock */ },
    handleResetByAnswer / handleResetByRecovery,
    handleDisable(s){ /* disableVault → clearEncryptedPersistHooks → 回写明文 */ },
    handleLock(s){ /* lock → 清内存 → mode=unlock */ },
  },
})
```

- **finishUnlock 编排**：`ensureEncryptedPersistHooks` → `store.loadFromJson` → `hydrateAIConfigJson/hydrateChatJson/hydrateMemoryJson` → 通知 shell 进入。
- **表单**：`af-field`(password/text)；模式切换由 `s.mode` 条件渲染。

---

## 4. 组件选型映射

| UI 需求 | aiflow 组件/能力 |
|---|---|
| 底部导航 | `af-tabbar` + `route` keepAlive |
| 列表 + 虚拟滚动/加载 | `af-list`（当前数据量小，直接 data + renderItem） |
| 左滑编辑/删除 | `af-swipe-cell`（accounts/txs/settings 记忆） |
| 确认/输入/提示弹层 | `af-dialog` 命令式 helper（G4） |
| Toast | `af-toast` 单例 |
| 全屏聊天 | `af-dialog` variant=bottom + 自定义气泡 |
| 表单 | `af-field` + `af-picker` + `af-switch`（还款次月）/`af-stepper` |
| 加载态 | `af-skeleton-page` / `.skeleton-line` |
| 图标 | `src/ui/icon.js` 纯函数 `iconSvg(name,size)` |
| 走势图 | `core/analytics/chart.js` 纯 SVG 函数（G3） |
| 日历 | 自建 grid（G2-B）+ 可选 `af-calendar` 骨架 |
| 锁页 | `af-field` + `af-dialog` |

---

## 5. L4 约束与 ESLint 配置

```js
// eslint.config.js
import aiflow from '@af-mobile/eslint-plugin';
export default [
  { ignores: ['dist/**', 'core/**'] },   // core 业务核，不套 UI 约束
  { files: ['src/**/*.js'], plugins: { aiflow }, rules: {
      ...aiflow.configs.recommended.rules,
      'aiflow/token-whitelist': ['error', {
        extraClass: ['day-num','day-flow','day-dots','bubble','quick-options','trial-banner','chat-entry','overview-cell','stat-card','cat-bar','recent-item','detail-account-item','agent-item','chat-session-item','tx-add-form','filter-advanced','lock-form','recovery-code-box'], // 项目级数据-role 或登记 class
        allowProjectTokens: true,
      }],
  } },
];
```

**关键约束落地**：
- 消费端 `no-inline-style` / `no-tailwind-syntax` / `no-arbitrary-value` / `no-recipe-break` 全开。
- 事件名 `af-{组件}:{action}`；`emit` 含 `composed:true`。
- 用户/AI 文本插 innerHTML 一律 `esc()` 或 `html` 模板。
- 弹层焦点陷阱 + 还原；`prefers-reduced-motion` 覆盖动画。
- 新增 class 三源同步（CSS ↔ whitelist ↔ prompt），`npm run whitelist:check`。

```yaml
# .github/workflows/ci.yml —— 关键闸门
- run: npx eslint src/ scripts/ test/ --max-warnings 0
- run: npm run whitelist:check
- run: npm run size
- run: npx vitest run
```

---

## 6. 能力缺口落地（G1/G2/G3/G4）

### G1 图标（`src/ui/icon.js` 纯函数，消费端 data-role + recipes）
- 14 个 path 提为纯函数 `iconSvg(name, size)` → 返回 SVG 字符串；`${{raw}}` 注入 `html` 模板。
- SVG 用 `data-role` + 白名单 class 承载视觉（`no-inline-style`）；`aria-hidden` 默认，可交互由调用方 `aria-label`。
- 无新增组件、无白名单膨胀。

### G2 日历格子（自建 grid，B 方案）
- 复用 CalendarView grid 算法（框架无关，提为 `core/analytics/calendar.js` 纯函数）；格子走 `data-role` + 白名单 class；待还点用 `.day-dot`。

### G3 图表纯函数（`core/analytics/chart.js`）
- `createTrendChartSvg(current, previous, prevTotal, projected) → svg字符串`；UI `${{raw}}` 注入；SVG 内视觉属性迁移到 class/data-role。

### G4 `af-dialog` 命令式 helper（`src/lib/dialog.js`）
- `dialog.confirm/prompt/alert/toast` 封装 `af-dialog`/`af-toast`，返回 Promise，符合 L4；body slot 放 `af-field`/按钮。

---

## 7. 测试策略

- **core/**：原单测原样保留（jest/vitest，`core/**` 不套 UI 约束）。
- **组件 DOM 测试**：jsdom + `customElements.define`；断言属性/事件/`af-{block}:{action}`。
- **页面 e2e（playwright）**：进入 → 对话记账 → 账户增删 → 流水筛选增改删 → 日历日详情 → 统计导出 → 设置备份 → 保险库解锁，对照需求基线逐条核对。

---

## 8. DoD 核对

- 已批准《能力覆盖矩阵》+《详细设计文档》+《技术设计文档》（本文件）。
- 全部页面 `createPage` 化从零实现；仓库无 react/vue 依赖与框架 import（core 除外）。
- core/ 原样迁入 + store 事件桥；G1-G4 缺口均已落地。
- 无内联 style、无白名单外 class、无裸 `addEventListener`（除理由注释）。
- aiflow ESLint 0 error；测试全绿；size/whitelist/types 通过。