# accounting-ai 去 React 化 · 详细设计

> 目标：**彻底移除 React / ReactDOM / @af-mobile/react**，所有视图直接用 `@af-mobile/ui` 原生运行时（`signal`/`effect` + Web Components）实现。本轮 6 个视图全迁，ChatView 与 App 壳一起迁，React 本轮彻底出包。

---

## 1. 背景与目标

- 现状：`accounting-ai` 视图层（13 个 `.tsx`）依赖 React + `@af-mobile/react` 适配包；主包体积、心智负担、依赖复杂度均偏高。
- 用户判断：**ChatView 本来就该直接用 `@af-mobile/ui`**，而不是 React 适配包；本轮把全部视图迁回原生，React 出包。
- 验收标准：功能、视觉、测试无回归；构建产物无 react 依赖；主包 gzip 下降（去除 react-vendor ~45KB）。

## 2. 现状盘点（React 使用清单）

| 文件 | React 用量 | 迁移后 |
|---|---|---|
| `src/ui/ChatView.tsx` | 12 `useState`、4 `useEffect`、4 `useRef`、`AfDialog`/`AfList`（react 适配）、`FullscreenModal`、`Icon` | `chatView.ts`（原生，见 §6.2） |
| `src/App.tsx` | `lazy`/`Suspense`、2 `useState`、2 `useEffect`、`useStoreVersion` | `App.ts`（原生，见 §6.1） |
| `src/main.tsx` | `StrictMode` + `createRoot(...).render` | 原生初始化 |
| `src/ui/LockView.tsx` | 11 `useState`、表单逻辑 | `lockView.ts` |
| `src/ui/AccountsView.tsx` | 19 `useState`、`AfSwipeCell` | `accountsView.ts` |
| `src/ui/CalendarView.tsx` | 2 `useState`、`useMemo`、触摸手势 | `calendarView.ts` |
| `src/ui/TxListView.tsx` | 8 `useState`、`AfSwipeCell` | `txListView.ts` |
| `src/ui/StatsView.tsx` | 3 `useState`、`useRef`、内嵌 toast 逻辑 | `statsView.ts` |
| `src/ui/SettingsView.tsx` | 15 `useState`、2 `useRef`、`AfSwipeCell` | `settingsView.ts` |
| `src/ui/TrendChart.tsx` | `TrendChart` 纯 SVG（无 hook） | `trendChart.ts`（字符串渲染） |
| `src/ui/Icon.tsx` | `ReactNode` JSX 图标 | `icon.ts`（SVG 字符串） |
| `src/ui/FullscreenModal.tsx` | `createPortal` | `fullscreenModal.ts`（原生 helper） |
| `src/ui/useStoreVersion.ts` | `useState`/`useCallback` | `storeVersion.ts`（`signal`） |
| `src/ui/useSwipeRows.ts` | `useRef` | `swipeRows.ts`（普通函数） |
| `src/ui/Dialog.tsx` | 无 React 依赖（已是原生 af-dialog/af-toast） | 改名为 `dialog.ts` |
| `src/ui/af.ts` | 无 React | 扩展注册 `af-swipe-cell` |
| `src/ui/appState.ts`、`chartExport.ts` | 零 React | 保留不动 |
| `tests/ui/*.test.tsx` | `@testing-library/react` | 原生 DOM 测试（§7） |

## 3. 原生运行时能力（`@af-mobile/ui` 提供）

| 模块 | 导出 | 用途 |
|---|---|---|
| `lib/state.js` | `signal` / `computed` / `effect` / `batch` / `createRoot` / `untrack` | 替代 `useState`/`useMemo`/`useEffect`；`createRoot` 建立 owner 级联清理 |
| `lib/af-element.js` | `html` 模板标签（自动转义）、`escapeHtml`、`AfElement.lockScroll/unlockScroll` | 安全 HTML 拼接；模态背景滚动锁 |
| 组件 | `af-dialog` `af-list` `af-toast` `af-notice-bar` `af-swipe-cell` | 弹窗/虚拟列表/轻提示/横幅/左滑操作 |
| `css`/`tokens.css` | 设计 token + 配方 class | 视觉体系 |

> 说明：`page.js` 的 `definePage/createPage` 是声明式 bind 运行时，视图多为命令式（异步 engine 调用、自定义事件、复杂表单），强行套用会过度封装，**不采用**。直接用 `signal`/`effect` + `createRoot`（§4 工厂模式）。

## 4. 总体架构设计

### 4.1 视图工厂模式（所有视图统一出口）

```ts
// ui/types.ts
export interface ViewHandle {
  el: HTMLElement;   // 挂载根节点
  unmount(): void;   // 清理 signals/effects/listeners
}

// 每个视图导出 mount 函数
export function mountChatView(props: ChatViewProps): ViewHandle;
export function mountAccountsView(props: AccountsViewProps): ViewHandle;
// ...
```

工厂内部模式（对应 React 组件的生命周期）：

```
1. 模块/闭包级 signal 定义状态（替代 useState）
2. html`` 构建静态 DOM 骨架 + data-role 锚点 + 一次性事件绑定
3. createRoot(() => {
     effect(...) × N   // 订阅 signal，更新 DOM（替代 useEffect + render）
     监听原生事件（click/submit/af-list:itemclick/af-dialog:close 等）
   })
4. return { el, unmount: () => { dispose(); overlay?.remove(); } }
```

### 4.2 响应式映射（React → 原生）

| React | 原生 |
|---|---|
| `const [x, setX] = useState(init)` | `const x = signal(init)`；`x()` 读、`x.set(v)` / `x.set(v=>v+1)` 写 |
| `useEffect(fn, deps)` | `effect(fn)`（依赖追踪自动，替代 deps 数组） |
| `useRef(el)` | 静态骨架建好后 `root.querySelector(...)` 捕获 |
| `useMemo(fn, deps)` | `computed(fn)` 或直接在 effect 内计算 |
| `props` 变化（onChanged 等） | props 就是闭包变量；store 派生值用 `storeVersion()` signal 触发重渲 |
| 事件（onClick/onChange） | `addEventListener` / 事件委托到骨架容器 |

### 4.3 store 变更通知

React 时代靠 `bump()`（版本号）强制全树重渲。原生改为模块级 `storeVersion` signal（替代 `useStoreVersion.ts`）：

```ts
// ui/storeVersion.ts
import { signal } from '@af-mobile/ui/lib/state.js';
export const storeVersion = signal(0);
export const bumpStoreVersion = () => storeVersion.set((v) => v + 1);
```

- App 把 `onChanged` 透传为 `bumpStoreVersion`（与原语义一致）。
- 依赖 store 派生数据的 effect 需读取 `storeVersion()` 以建立订阅（如总资产、近期流水、快捷输入、会话列表）。
- ChatView 内部对 `onChanged` 做一层包装：`notifyChanged() { bumpStoreVersion(); props.onChanged?.(); }`。

### 4.4 文件组织（迁移后 `src/ui/`）

```
ui/
  types.ts             ViewHandle 等共享类型
  icon.ts              IconName + icon(name, opts): string (SVG 字符串)
  storeVersion.ts      storeVersion / bumpStoreVersion
  swipeRows.ts         bindSwipeRows(): (i) => { elRef, onChange }
  dialog.ts            dialog.confirm/prompt/alert/toast（命令式，原生）
  fullscreenModal.ts   mountFullscreenOverlay(content): { el, close }
  af.ts                registerAfComponents() + initAfTokens()（token 映射保留）
  af-mobile.d.ts       组件类型声明（保留）
  appState.ts          store/engine/memoryStore/chatStore/quickInputStore/bootstrap（零改动）
  chatView.ts          ChatView（原生）
  App.ts               App 壳（原生）
  lockView.ts accountsView.ts calendarView.ts txListView.ts statsView.ts settingsView.ts
  trendChart.ts chartExport.ts（chartExport 零改动）
```

## 5. 基础设施迁移（先行，无业务风险）

### 5.1 `icon.ts`
`PATHS` 改为 `Record<IconName, string>`（innerHTML 片段），`icon(name, { size, rotate, className, ariaLabel })` 返回完整 `<svg ...>...</svg>` 字符串。保持原 viewBox/stroke/aria 语义。消费端由 `html` 模板插值（`${{ raw: icon('chat', {size:18}) }}`）。

### 5.2 `storeVersion.ts` — 见 §4.3。

### 5.3 `swipeRows.ts`（替代 `useSwipeRows.ts`）
保留排他逻辑，改为普通函数返回绑定器：

```ts
export function bindSwipeRows() {
  const cells = new Map<string | number, HTMLElement & { close(): void }>();
  return (i: string | number) => ({
    elRef: (el) => { if (el) cells.set(i, el); },
    onChange: (e: { open?: boolean }) => {
      if (e.open) cells.forEach((c, k) => { if (k !== i) c.close(); });
    },
  });
}
```

### 5.4 `fullscreenModal.ts`（替代 `FullscreenModal.tsx`）
```ts
export function mountFullscreenOverlay(content: HTMLElement): { el: HTMLElement; close(): void }
```
- 创建 `<div class="fullscreen-modal" role="dialog" aria-modal="true">`，`appendChild(content)` 后挂到 `document.body`。
- Esc 关闭（保留 af-dialog 例外：`document.querySelector('af-dialog[open]')` 存在时交还 dialog）。
- 滚动锁用 `AfElement.lockScroll()/unlockScroll()`。
- `close()` 移除节点 + 解锁 + 还原焦点到调用方记录的元素。

### 5.5 `af.ts` 扩展
组件注册保留 `af-dialog/af-list/af-notice-bar/af-toast`，追加 `af-swipe-cell`（`@af-mobile/ui/components/af-swipe-cell.js`）。`initAfTokens()` 的 token 映射逻辑不动。注册统一走 `registerAfComponents()`（幂等）。

### 5.6 `dialog.ts`
现有 `Dialog.tsx` 无 React 依赖，直接改后缀为 `.ts`，内容不变。

## 6. 视图迁移详细设计

### 6.1 App 壳 → `App.ts` + `main.tsx`

**保持手动 tab 切换**（不用 `router.js`：最小改动、保留现有 popstate 语义、显式 unmount 干净利落，避免 router 无卸载钩子导致的 effect 泄漏）。

```ts
// App.ts
export function mountApp(): ViewHandle {
  const tab = signal<Tab>(tabFromPath(location.pathname));   // 替代 useState
  const unlocked = signal(!isVaultEnabled());
  const version = storeVersion;                              // 直接订阅全局 signal

  // 渲染静态壳：.app > .app-header + main(视图容器 #view) + nav.tab-bar
  // tab-bar 按钮 class 由 effect 订阅 tab 更新 active / aria-current

  let handle: ViewHandle | null = null;
  async function mountView(t: Tab) {
    handle?.unmount();                                       // 显式卸载旧视图
    const view = document.getElementById('view')!;
    view.innerHTML = '<div class="view-loading" aria-busy="true" role="status">加载中…</div>';
    const mod = await import(`./${VIEW_MODULE[t]}`);          // 保留懒加载，分割首屏
    handle = mod[VIEW_EXPORT[t]](propsOf(t));
    view.innerHTML = '';
    view.appendChild(handle.el);
  }

  function switchTab(next: Tab) {
    if (next === tab()) return;
    tab.set(next);
    history.pushState({ tab: next }, '', TABS[next].path);    // 与原逻辑一致
    void mountView(next);
  }
  window.addEventListener('popstate', () => { tab.set(tabFromPath(location.pathname)); void mountView(tab()); });

  // locked 态：隐藏 tab-bar，mount lockView；解锁后 bump + mount 当前 tab
  // navigateToSettingsAIConfig 保留（switchTab('settings') + 350ms 后 scrollIntoView）
  // bootstrap() 在 unlocked 后调用，>0 时 bumpStoreVersion()

  return { el: root, unmount() { handle?.unmount(); /* 移除壳节点 */ } };
}
```

`main.tsx` 原生初始化：保留 `loadRuntimeConfig` + PWA SW 注册，`document.getElementById('root').appendChild(mountApp().el)`。删除 `StrictMode`/`createRoot`。

### 6.2 ChatView → `chatView.ts`（核心）

**State signal 映射（12 个 useState → 12 个 signal）**

| React state | signal | 备注 |
|---|---|---|
| `activeSessionId` | `activeSessionId = signal(initialSession.id)` | |
| `messages` | `messages = signal(loadSessionMessages(initial.id))` | 每次变更 `set(新数组)` |
| `input` | `input = signal('')` | |
| `loading` | `loading = signal(false)` | 控制发送/禁用态 |
| `samplesOpen` | `samplesOpen = signal(false)` | |
| `sessionsOpen` | `sessionsOpen = signal(false)` | |
| `quickManageOpen` | `quickManageOpen = signal(false)` | |
| `detailView` | `detailView = signal<'assets'\|'liabilities'\|null>(null)` | |
| `activeAgent` | `activeAgent = signal(getActiveAgent())` | |
| `agentsOpen` | `agentsOpen = signal(false)` | |
| `chatOpen` | `chatOpen = signal(false)` | 控制全屏弹框 |
| `quotaVersion` | `quotaTick = signal(0)`（无 `void` 技巧） | 仅用于通知横幅剩余次数 effect 重跑 |

**Ref → DOM 捕获（静态骨架建好后 querySelector）**

| React ref | 原生 |
|---|---|
| `listRef` | `chatListEl`（`.chat-list`） |
| `inputRef` | `inputEl`（textarea） |
| `sessionsListRef` | `sessionsListEl`（`<af-list>`） |
| `promptedLoanIds` | 普通 `Set<string>`（闭包变量，无需响应式） |

**Effects（4 个 useEffect → effect）**

| React useEffect | 原生 effect |
|---|---|
| messages → 滚动到底 | `effect(() => { messages(); chatListEl.scrollTop = chatListEl.scrollHeight; })` |
| input → textarea 自适应高 | `effect(() => { input(); const el=inputEl; el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,120)+'px'; })` |
| chatOpen → 会话初始化 + 聚焦 | `effect(() => { if(!chatOpen()) return; /* 原逻辑 */ requestAnimationFrame(()=>inputEl.focus()); })` |
| chatOpen → 到期贷款还款提示 | `effect(() => { if(!chatOpen()) return; /* getLoansDueToday 逻辑，追加到 messages */ })` |
| sessionsList 删除按钮委托 | `sessionsListEl.addEventListener('click', 委托)`（createRoot 内绑定） |

**组件替换**

| React | 原生 |
|---|---|
| `<AfDialog open onClose>`（快捷管理 / 明细） | 骨架内置两个 `<af-dialog>`；打开时重建 body innerHTML + `.open=true`；`af-dialog:close` 事件置回 false。**af-dialog 属性变化自动 show/close**（onAttributeChange） |
| `<AfList data renderItem onItemclick>` | 原生 `<af-list>`：设 `.data`、`.itemHeight`、`.renderItem`（返回 `html` 串）、`.height`、`.refresh=false`、`.emptyText`；监听 `af-list:itemclick`（`e.detail.index`）。`elRef` 就是 `sessionsListEl`。会话变化时 `effect(() => { sessionsListEl.data = chatStore.list(); })`（data setter → onAttributeChange 自动重渲） |
| `<FullscreenModal open>` | `mountFullscreenOverlay(chatModalEl)`；`chatOpen` effect 控制 append/remove + 聚焦/滚动锁 |
| `<Icon>` | `icon()` 字符串，模板插值 |
| `<af-notice-bar>` | 原生标签保留；`text` 由 effect 订阅 `storeVersion()`/`quotaTick()` 更新 |

**渲染 effect 清单（订阅哪些 signal）**

| effect | 渲染目标 | 依赖 |
|---|---|---|
| 渲染消息气泡 | `.chat-list` innerHTML | `messages()` |
| 渲染总资产/负债 + 近期流水 | `.overview` / `.recent-list` | `storeVersion()` + `messages()` |
| 渲染快捷输入 chips | `.samples` | `storeVersion()` |
| 渲染会话 af-list | `af-list.data` | `storeVersion()` + `activeSessionId()` |
| 渲染 Agent af-list | `af-list.data` | `agentsOpen()` + `storeVersion()` |
| 通知横幅剩余次数 | `af-notice-bar.text` | `storeVersion()` + `quotaTick()` |
| 快捷管理弹窗 body | `af-dialog` body | `quickManageOpen()`（打开时渲染） |
| 明细弹窗 body | `af-dialog` body | `detailView()`（打开时渲染） |

**业务函数迁移**：`send`/`onSubmit`/`onQuickClick`/`switchSession`/`newChat`/`deleteSession`/`switchAgent`/`handleRepayOption`/`handleLocalConfirm`/`handleLocalCancel`/快捷输入 CRUD/`resetChatHistory` 全部保留原逻辑，仅把 `setXxx` 换成 `xxx.set`；`setMessages(fn)` 函数式更新映射为 `messages.set((ms) => ...)`（signal.set 支持函数式）。`syncFromSession`/`toCoreMessages`/`toRecord`/`fromRecord`/`persistSession`/`loadSessionMessages`/`captureHabit` 纯函数原样保留。

### 6.3 LockView → `lockView.ts`
11 个 `useState` → signal（`mode`/`busy`/`message`/`recoveryCode`/`pwd1`/`pwd2`/`question`/`answer`/`pwd`/`resetAnswerInput`/`recoveryInput`/`newPwd`）。表单用原生 `<form>` + `submit` 事件；`mode` 切换由 effect 重建表单体。导出 `mountLockView({ onUnlocked }): ViewHandle`。

### 6.4 AccountsView → `accountsView.ts`
19 个 `useState` → signal；`AfSwipeCell` → 原生 `<af-swipe-cell>` + `bindSwipeRows()`；左滑操作按钮由 `af-swipe-cell:action`（或点击按钮）事件处理，`bind(i)` 的 `elRef`/`onChange` 挂到单元格。列表重渲依赖 `storeVersion()`。

### 6.5 CalendarView → `calendarView.ts`
`month`/`selectedDay` → signal；`useMemo` 的 `{ days, flows, dueItems, monthSummary }` → `computed`（依赖 `month`/`storeVersion`）；触摸手势（左滑切月）改为原生 touch 事件 + `touchStartX/Y` 普通变量；日历网格由 effect 渲染。

### 6.6 TxListView → `txListView.ts`
8 个 `useState` → signal（`month`/`typeFilter`/`accountFilter`/`showAdvanced`/`editing`/`adding`/`tick`）；`AfSwipeCell` 同 §6.4。筛选/编辑/新增逻辑保留。

### 6.7 StatsView → `statsView.ts` + `trendChart.ts`
`month`/`toast`/`exportingPng` → signal；`chartWrapRef` → `querySelector`。**内嵌 toast 改为 `dialog.toast(...)`**（消除自建 toast state）。`TrendChart` 改为纯字符串渲染函数 `renderTrendChart(props): string`（无 hook、无 DOM 副作用），由 effect 注入 `svg` innerHTML。`chartExport.ts` 零改动。

### 6.8 SettingsView → `settingsView.ts`
15 个 `useState` → signal；2 个 `useRef`（文件输入）→ querySelector；`AfSwipeCell` 同 §6.4。AI 配置表单、记忆管理、数据导入导出（`fileRef`/`encFileRef` + `change` 事件）、Agent 管理逻辑保留。

### 6.9 保留不动
`appState.ts`、`chartExport.ts`、`core/**`（engine/store/tools/security/ai 均零 React 依赖）。

## 7. 测试迁移设计（`tests/ui/` 6 个文件）

原则：**原生 DOM 测试**，不依赖 `@testing-library/react`；用 vitest + jsdom 直接 mount `ViewHandle`。

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { registerAfComponents } from '../../src/ui/af';
import { mountAccountsView } from '../../src/ui/accountsView';

beforeEach(() => {
  document.body.innerHTML = '';
  registerAfComponents();               // 幂等注册自定义元素
});

function mount(handle: { el: HTMLElement; unmount(): void }) {
  document.body.appendChild(handle.el);
  return handle;
}
```

- 交互用原生事件：`el.querySelector('.btn')!.click()` / `dispatchEvent(new Event('submit', ...))` / `new KeyboardEvent`。
- 断言用 `expect(el.textContent).toContain(...)` 等（`@testing-library/jest-dom` matcher 可保留）。
- `vitest.setup.ts` 的 `HTMLDialogElement` polyfill 保留（af-dialog 依赖）。
- `app.test.tsx` 改为挂载 `mountApp()`，断言 tab 切换/URL/视图渲染。
- 文件后缀 `.test.tsx` → `.test.ts`（无 JSX）。

## 8. 依赖与构建清理

### 8.1 `package.json`
- 移除 dependencies：`react`、`react-dom`、`@af-mobile/react`。
- 移除 devDependencies：`@types/react`、`@types/react-dom`、`@vitejs/plugin-react`、`eslint-plugin-react-hooks`、`eslint-plugin-react-refresh`、`@testing-library/react`、`@testing-library/user-event`。
- 保留 `@af-mobile/ui`、`@af-mobile/chat`、`jsdom`、`@testing-library/jest-dom`（matcher 仍可用）。

### 8.2 `vite.config.ts`
- 删除 `react()` 插件；`manualChunks` 删除 `react-vendor`（Vite 自动按需分包）。
- `test` 配置保留（globals/jsdom/setupFiles）。
- 目录根 `workspace` 与 `accounting-ai` 若有共享 `eslint.config.js` 需同步去掉 react 插件（见 §9）。

### 8.3 `tsconfig.app.json`
- `"jsx": "react-jsx"` → 删除（无 JSX）；保留 `allowImportingTsExtensions` 等。
- 删除所有 `.tsx` 源文件（迁移完成后）。

### 8.4 删除旧文件
`ChatView.tsx`、`App.tsx`、`LockView.tsx`、`AccountsView.tsx`、`CalendarView.tsx`、`TxListView.tsx`、`StatsView.tsx`、`SettingsView.tsx`、`TrendChart.tsx`、`Icon.tsx`、`FullscreenModal.tsx`、`useStoreVersion.ts`、`useSwipeRows.ts`（`Dialog.tsx`→`dialog.ts`）。

## 9. 自检与验收清单

```bash
# 库侧不受影响；会计应用侧：
cd /workspace/accounting-ai
npx eslint src/ test/ scripts/ --max-warnings 0     # 无 react 规则残留、无违规
npx vitest run                                      # 全部用例（core + 原生 ui 测试）全绿
npm run build                                       # tsc --noEmit + vite build 通过
npm run size                                        # 体积守卫：主包大幅下降（无 react-vendor）
```

- 构建产物验证：`grep -r "react" dist/assets/*.js` 无命中；`dist` 不再出现 `react-vendor-*.js`。
- 浏览器冒烟：chat 发送/快捷输入/会话管理/明细弹窗、账户左滑、流水筛选、统计导出、设置 AI 配置——无回归。

## 10. 风险与对策

| 风险 | 对策 |
|---|---|
| `signal` 依赖追踪遗漏导致 UI 不更新 | 依赖 store 派生的 effect 显式读 `storeVersion()`；渲染 effect 清单见 §6.2 表格，迁移时逐条核对 |
| `af-list` 数据更新不重渲 | 设 `.data` 会触发 `onAttributeChange('data')→_render()`（已验证 defineProp 机制）；必要时重置 `el.renderItem = el.renderItem` 失效缓存 |
| 弹窗焦点/滚动锁回归 | 全部走 `af-dialog.show()`（自带焦点陷阱+还原）与 `AfElement.lockScroll()`，不复刻 |
| ChatView 是唯一静态视图、体积敏感 | 保持 App 壳 + 视图懒加载（§6.1），ChatView 不静态引入主包 |
| jsdom 下自定义元素行为差异 | `registerAfComponents()` 幂等；`HTMLDialogElement` polyfill 保留；`af-list` 虚拟滚动在 jsdom 下用短列表验证 itemclick |
| 测试断言依赖 React 语义 | 原生测试直接用 DOM 查询 + 事件派发，语义等价 |
