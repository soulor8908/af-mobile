# AIFlow UI —— L1+L2 详细设计

> 方案 B：规格 + 内嵌参考 CSS。本文档既是设计决策记录，也是实现阶段的参考源。
>
> 范围：L1 Token 层 + L2 配方/原子层。L3 真组件另文设计。

---

## 目录

- [0. 概述与范围](#0-概述与范围)
- [1. L1 设计原则](#1-l1-设计原则)
- [2. L1 完整 Token 清单](#2-l1-完整-token-清单)
- [3. 主题切换实现 + L1 ESLint 保护规则](#3-主题切换实现--l1-eslint-保护规则)
- [4. L2 配方层总览与分类](#4-l2-配方层总览与分类)
- [5. L2 配方完整定义](#5-l2-配方完整定义)
- [6. L2 原子工具类完整定义](#6-l2-原子工具类完整定义)
- [7. L2 优先级、覆盖与 AI 使用约束](#7-l2-优先级覆盖与-ai-使用约束)
- [8. 附录：依赖矩阵 + 文件清单](#8-附录依赖矩阵--文件清单)

---

## 0. 概述与范围

### 0.1 分层定位

| 层 | 内容 | 形态 | AI 可改 |
|---|---|---|---|
| L1 | Token 变量 + reset + base | 静态 CSS | 否（ESLint 硬阻断） |
| L2 | 配方类（52）+ 原子类（52） | 静态 CSS | 配方白名单内扩展 |
| L3 | 真组件（af-*） | ESM JS + CSS | 是（Tree Shake） |

本文档覆盖 L1 + L2，共 43 个变量 + 154 个类（102 配方 + 52 原子）。

### 0.2 设计目标

1. **约束即生产力**：白名单封闭集（154 个类）让 AI 只能在受控空间内生成代码
2. **原生优先**：零构建工具、零运行时依赖、纯 CSS 变量 + `@layer`
3. **dark 模式零代码**：配方层全用 token 变量，AI 不写 dark 分支

### 0.3 引入策略与体积预算

L1 Token + L2 配方/原子类采用**全量静态引入**：

- 不使用 Tree Shaking（CSS 无运行时 Tree Shaking，PurgeCSS 收益 < 1KB 不值得引入构建复杂度）
- 不使用 Tailwind JIT（与"原生优先 + 白名单约束 AI"信条冲突；Tailwind 任意值语法 `p-[13px]` 是 AI 漂移温床，破坏白名单封闭性）
- 全部 154 个类（102 配方 + 52 原子）+ 43 个变量，gzip 后计入 L1+L2 CSS ≤ 8.0KB 体积预算（含 prefers-reduced-motion 降级 + palette 抽象 + 组件宿主样式）

Tree Shaking 仅适用于 L3 真组件 JS（ESM 按需 import）。

---

## 1. L1 设计原则

### 1.1 @layer 分层与锁定

分层顺序与 RFC 7.2 一致，**顺序即优先级**（后声明的 layer 胜出）：

```css
@layer reset, base, tokens, components, utilities;
```

| layer | 内容 | AI 可改 |
|---|---|---|
| `reset` | box-sizing/margin 重置 | 否（库预置） |
| `base` | html color-scheme、popover/dialog backdrop 基础 | 否 |
| `tokens` | 全部 CSS 变量定义 | **否（ESLint 硬阻断）** |
| `components` | L2 配方类（52 个） | 是（在白名单内扩展） |
| `utilities` | L2 原子类（52 个） | 是 |

**关键决策**：`tokens` 层独立且锁定，AI 只能在 `components`/`utilities` 层活动——这是"约束即生产力"在 L1 的落地。配方类引用 token 变量而非重定义值，主题切换只改 token 值不动配方。

### 1.2 Token 命名约定

| 类别 | 前缀 | 命名规则 | 示例 |
|---|---|---|---|
| 颜色 | `--c-` | 语义名（非色相） | `--c-brand` `--c-onbrand` `--c-text` `--c-muted` `--c-card` `--c-bg` `--c-muted-bg` `--c-danger` `--c-success` `--c-warn` `--c-border` |
| 间距 | `--s-` | 数字（px 值） | `--s-1:4px` … `--s-6:32px` |
| 圆角 | `--r-` | 字母档位 | `--r-s:4px` `--r-m:8px` `--r-l:12px` `--r-f:9999px` |
| 字号 | `--t-` | 字母档位 | `--t-xs:12px` `--t-sm:14px` `--t-md:16px` `--t-lg:18px` `--t-xl:22px` |
| 行高 | `--lh-` | 语义 | `--lh-tight:1.25` `--lh-normal:1.7` |
| 字重 | `--fw-` | 语义 | `--fw-normal:400` `--fw-medium:500` `--fw-bold:700` |
| 阴影 | `--shadow-` | 档位 | `--shadow-sm` `--shadow-md` `--shadow-lg` |
| 层级 | `--z-` | 语义 | `--z-base:0` `--z-sticky:200` `--z-dropdown:1000` `--z-modal:1100` |
| 动效 | `--ease-` `--dur-` | 语义 | `--ease-out:cubic-bezier(.16,1,.3,1)` `--dur-fast:150ms` `--dur-base:250ms` |

**关键决策**：
- 颜色一律语义名（`brand`/`card`/`text`），禁止色相名（`blue`/`gray`）——主题切换时语义不变、值变
- 新增 `--c-border`（v2.0 缺失，导致边框色乱用 `--c-muted`）和 `--c-onbrand`（品牌色上的文字，v2.0 用 `text-bg` 歧义）
- 间距/圆角/字号用档位而非任意值，AI 无法生成 `p-7`/`r-xl2` 等越界值

### 1.3 主题切换机制

三层叠加，**优先级从低到高**：

```css
@layer tokens {
  /* 第 1 层：light 默认值（写在 :root） */
  :root {
    --c-text:#1a2332; --c-card:#fff; --c-bg:#fafbfc;
    color-scheme: light;            /* 让原生控件（滚动条/日期选择器）跟随 */
  }

  /* 第 2 层：系统暗黑自动跟随（零 JS） */
  @media (prefers-color-scheme: dark) {
    :root {
      --c-text:#e2e8f0; --c-card:#1e293b; --c-bg:#0f172a;
      color-scheme: dark;
    }
  }

  /* 第 3 层：手动切换（覆盖系统）——特异性高于 :root，无需 !important */
  :root[data-theme="dark"]  { --c-text:#e2e8f0; --c-card:#1e293b; --c-bg:#0f172a; color-scheme: dark; }
  :root[data-theme="light"] { --c-text:#1a2332; --c-card:#fff;    --c-bg:#fafbfc; color-scheme: light; }
}
```

**关键决策**：
- `:root[data-theme]` 特异性 (0,1,1) > `:root` (0,1,0)，天然覆盖 media query，无需 source order 技巧或 `!important`
- `color-scheme` 属性同步切换，让原生 `<dialog>` backdrop、滚动条、`<input type=date>` 控件自动适配——零额外代码
- JS 侧只做一件事：`localStorage.setItem('theme', 'dark')` + `root.dataset.theme = 'dark'`
- 不提供多品牌色切换（YAGNI，OPC 项目按需改 `--c-brand` 值即可，不做运行时切换 API）

### 1.4 L1 保护规则预览

```
规则名: no-token-modification
检测: 任何对 tokens.css 的写入，或在其他文件中重定义 --c-*/--s-*/--r-*/--t-* 变量
动作: error 阻断
例外: tokens.css 自身（仅库维护者改）
```

详见第 3 节。

---

## 2. L1 完整 Token 清单

### 2.1 颜色 Token（11 个语义变量）

| 变量 | light 值 | dark 值 | 用途 | 引用配方 |
|---|---|---|---|---|
| `--c-brand` | `#2563eb` | `#3b82f6` | 品牌主色（按钮/链接/强调） | `.btn` `.text-brand` `.bg-brand` |
| `--c-onbrand` | `#fff` | `#fff` | 品牌色上的文字/图标 | `.btn`（默认文字色） |
| `--c-text` | `#1a2332` | `#e2e8f0` | 正文主文字 | `.title` `.body` `.cell` |
| `--c-muted` | `#5a6b7e` | `#94a3b8` | 次要文字/占位符 | `.subtitle` `.caption` `.meta` |
| `--c-card` | `#fff` | `#1e293b` | 卡片/列表项背景 | `.card` `.cell` `.navbar` |
| `--c-bg` | `#fafbfc` | `#0f172a` | 页面背景 | `body` `.page` |
| `--c-muted-bg` | `#f1f4f8` | `#1e293b` | 次级背景（分隔区/输入框内） | `.form-row` `.divider` 区 |
| `--c-border` | `#dde3eb` | `#334155` | 分隔线/输入框边框 | `.divider` `.input` 边框 |
| `--c-danger` | `#dc2626` | `#ef4444` | 错误/删除/降价 | `.btn-danger` `.price` `.form-err` |
| `--c-success` | `#16a34a` | `#22c55e` | 成功/已完成 | `.tag-ok` `.badge-ok` |
| `--c-warn` | `#d97706` | `#f59e0b` | 警告/待处理 | `.tag-warn` `.badge-warn` |

**取值依据**：
- 全部取自 Tailwind 调色板的 **600（light）/400（dark）**档位，保证 WCAG AA 对比度（正文对背景 ≥4.5:1）
- `--c-card`/`--c-bg` 在 dark 下使用 slate-800/950 而非纯黑，避免 OLED 烧屏观感与高对比刺眼
- `--c-muted-bg` 在 dark 下与 `--c-card` 同值（slate-800）——dark 模式下用 elevation 区分层级成本过高，统一背景靠 border 区分

**新增的 2 个关键变量**（RFC 未列）：
- `--c-border`：v2.0 缺失导致边框色被 `--c-muted`（文字灰）或 `--c-card`（卡片白）乱用，详情是高频痛点
- `--c-onbrand`：替代 RFC 7.1 的 `text-bg`，消除"白色文字"歧义，且与 Tailwind/Element Plus 的 `on-primary` 命名一致

### 2.2 间距 Token（6 档，4px 基准）

| 变量 | 值 | 用途 | 引用配方 |
|---|---|---|---|
| `--s-1` | `4px` | 图标与文字、紧凑间隙 | `.list-item-compact` 内部 |
| `--s-2` | `8px` | 按钮内 padding、表单行间隙 | `.btn` padding-y `.form-row` gap |
| `--s-3` | `12px` | 列表项 padding、卡片间距 | `.cell` `.list-item` padding |
| `--s-4` | `16px` | 页面 padding、卡片内 padding | `.page` `.card` padding |
| `--s-5` | `24px` | 区块间距、大卡片间距 | section 间距 |
| `--s-6` | `32px` | hero 区、大留白 | `.hero` padding |

**取值依据**：4px 基准 + 1.5x 递增（4→8→12→16→24→32），覆盖移动端 90% 间距场景。不引入 `--s-7`+（YAGNI，超 32px 用 `--s-6` 组合或 `gap`）。原子类 `p-0..6/8/10` 对应 `--s-0/1/2/3/4/5/6/8(32px)/10(40px)`，`8`/`10` 是 escape hatch。

### 2.3 字号 / 行高 / 字重 Token

**字号（5 档）**

| 变量 | 值 | 用途 |
|---|---|---|
| `--t-xs` | `12px` | 角标、时间戳、caption |
| `--t-sm` | `14px` | 辅助文字、表单提示 |
| `--t-md` | `16px` | 正文（移动端最小可读字号，iOS HIG 标准） |
| `--t-lg` | `18px` | 小标题、价格 |
| `--t-xl` | `22px` | 页面标题、hero |

**行高**

| 变量 | 值 | 用途 |
|---|---|---|
| `--lh-tight` | `1.25` | 标题、按钮 |
| `--lh-normal` | `1.7` | 正文、表单（保证可读性） |

**字重**

| 变量 | 值 | 用途 |
|---|---|---|
| `--fw-normal` | `400` | 正文 |
| `--fw-medium` | `500` | 次级强调（cell 主标题） |
| `--fw-bold` | `700` | 标题、价格、按钮 |

**取值依据**：移动端最小 16px（iOS HIG / Material 都禁止 < 16px 用于可读内容），5 档覆盖 RFC 配方全部字号需求。不引入 `--t-2xl`（YAGNI，页面标题用 `--t-xl` + `--fw-bold` 已足够）。

### 2.4 圆角 Token（4 档）

| 变量 | 值 | 用途 |
|---|---|---|
| `--r-s` | `4px` | 小元素（tag、badge、小按钮） |
| `--r-m` | `8px` | 卡片、输入框、默认按钮 |
| `--r-l` | `12px` | 大卡片、sheet、dialog |
| `--r-f` | `9999px` | 圆形（头像、pill 按钮） |

**取值依据**：4 档对应移动端常见圆角语义。不引入 `--r-xl`（YAGNI，大圆角用 `--r-l`，圆形用 `--r-f`）。

### 2.5 阴影 Token（3 档）

| 变量 | 值（light） | dark 值 | 用途 |
|---|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,.05)` | `0 1px 2px rgba(0,0,0,.3)` | 卡片默认 |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,.08)` | `0 4px 12px rgba(0,0,0,.4)` | 吸顶 navbar、悬浮按钮 |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,.12)` | `0 8px 24px rgba(0,0,0,.5)` | dialog、action-sheet |

**取值依据**：dark 模式下提升阴影不透明度（0.05→0.3 等），因 dark 背景吸收阴影，需更强对比才能感知 elevation。阴影用 `rgba(0,0,0,x)` 而非彩色阴影，避免主题切换时变色。

### 2.6 z-index Token（4 档）

| 变量 | 值 | 用途 |
|---|---|---|
| `--z-base` | `0` | 默认流 |
| `--z-sticky` | `200` | navbar 吸顶、tabbar 吸底 |
| `--z-dropdown` | `1000` | popover、action-sheet |
| `--z-modal` | `1100` | dialog（模态最高） |

**取值依据**：4 档 + 100 间隔，留出中间档位（如 `--z-sticky:150`）扩展空间。模态 > 非模态（dialog > popover）符合 WAI-ARIA 模态层级约定。不引入 `--z-toast`（YAGNI，toast 用 popover 实现，同 `--z-dropdown`）。

### 2.7 动效 Token

| 变量 | 值 | 用途 |
|---|---|---|
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` | 默认出场（ease-out 曲线，原生感） |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` | 切换/过渡 |
| `--dur-fast` | `150ms` | hover、tap 反馈 |
| `--dur-base` | `250ms` | 弹层出现、tab 切换 |
| `--dur-slow` | `400ms` | 页面转场（配合 View Transitions） |

**取值依据**：`--ease-out` 用 iOS 标准曲线（与 View Transitions API 默认曲线一致）。3 档时长覆盖 90% 动效，不引入 `--dur-instant`（< 100ms 用户感知不到，用 `--dur-fast` 即可）。

### 2.8 完整 tokens.css 参考实现

```css
@layer reset, base, tokens, components, utilities;

@layer reset {
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
}

@layer base {
  html { color-scheme: light; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC',
                 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif;
    background: var(--c-bg);
    color: var(--c-text);
    font-size: var(--t-md);
    line-height: var(--lh-normal);
    -webkit-font-smoothing: antialiased;
  }
  [popover] { border: none; background: none; padding: 0; }
  [popover]::backdrop { background: rgba(0,0,0,.5); backdrop-filter: blur(4px); }
  dialog::backdrop { background: rgba(0,0,0,.5); }
}

@layer tokens {
  /* === 颜色（light 默认） === */
  :root {
    --c-brand: #2563eb;  --c-onbrand: #fff;
    --c-text: #1a2332;   --c-muted: #5a6b7e;
    --c-card: #fff;      --c-bg: #fafbfc;   --c-muted-bg: #f1f4f8;
    --c-border: #dde3eb;
    --c-danger: #dc2626; --c-success: #16a34a; --c-warn: #d97706;

    /* === 间距 === */
    --s-1: 4px;  --s-2: 8px;  --s-3: 12px;
    --s-4: 16px; --s-5: 24px; --s-6: 32px;

    /* === 字号 / 行高 / 字重 === */
    --t-xs: 12px; --t-sm: 14px; --t-md: 16px; --t-lg: 18px; --t-xl: 22px;
    --lh-tight: 1.25;  --lh-normal: 1.7;
    --fw-normal: 400;  --fw-medium: 500;  --fw-bold: 700;

    /* === 圆角 === */
    --r-s: 4px; --r-m: 8px; --r-l: 12px; --r-f: 9999px;

    /* === 阴影 === */
    --shadow-sm: 0 1px 2px rgba(0,0,0,.05);
    --shadow-md: 0 4px 12px rgba(0,0,0,.08);
    --shadow-lg: 0 8px 24px rgba(0,0,0,.12);

    /* === z-index === */
    --z-base: 0; --z-sticky: 200; --z-dropdown: 1000; --z-modal: 1100;

    /* === 动效 === */
    --ease-out: cubic-bezier(.16,1,.3,1);
    --ease-in-out: cubic-bezier(.65,0,.35,1);
    --dur-fast: 150ms; --dur-base: 250ms; --dur-slow: 400ms;
  }

  /* === 系统暗黑自动跟随 === */
  @media (prefers-color-scheme: dark) {
    :root {
      --c-brand: #3b82f6;  --c-onbrand: #fff;
      --c-text: #e2e8f0;   --c-muted: #94a3b8;
      --c-card: #1e293b;   --c-bg: #0f172a;   --c-muted-bg: #1e293b;
      --c-border: #334155;
      --c-danger: #ef4444; --c-success: #22c55e; --c-warn: #f59e0b;
      --shadow-sm: 0 1px 2px rgba(0,0,0,.3);
      --shadow-md: 0 4px 12px rgba(0,0,0,.4);
      --shadow-lg: 0 8px 24px rgba(0,0,0,.5);
      color-scheme: dark;
    }
  }

  /* === 手动切换（特异性覆盖系统） === */
  :root[data-theme="dark"] {
    --c-brand: #3b82f6;  --c-onbrand: #fff;
    --c-text: #e2e8f0;   --c-muted: #94a3b8;
    --c-card: #1e293b;   --c-bg: #0f172a;   --c-muted-bg: #1e293b;
    --c-border: #334155;
    --c-danger: #ef4444; --c-success: #22c55e; --c-warn: #f59e0b;
    --shadow-sm: 0 1px 2px rgba(0,0,0,.3);
    --shadow-md: 0 4px 12px rgba(0,0,0,.4);
    --shadow-lg: 0 8px 24px rgba(0,0,0,.5);
    color-scheme: dark;
  }
  :root[data-theme="light"] {
    color-scheme: light;
  }
}
```

**Token 统计**：颜色 11 + 间距 6 + 字号 5 + 行高 2 + 字重 3 + 圆角 4 + 阴影 3 + z-index 4 + 动效 5 = **43 个变量**，gzip 后约 0.8KB。

---

## 3. 主题切换实现 + L1 ESLint 保护规则

### 3.1 主题切换的完整 JS 实现

**关键决策：内联 blocking 脚本防 FOUC**

主题切换最大痛点是首屏闪烁（FOUC）——浏览器先渲染 light 再切 dark。解法是在 `<head>` 内联一段阻塞执行的极小脚本，**在首次绘制前**读 localStorage 设 `data-theme`：

```html
<!-- index.html <head> 内，必须在 CSS 之后、首屏绘制前 -->
<script>
  (function() {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.dataset.theme = t;
    }
    // 若无 localStorage，不设 data-theme，让 prefers-color-scheme 自动生效
  })();
</script>
```

**为什么不用模块脚本/defer**：defer/module 脚本在 DOM 解析后执行，首屏已绘制 → FOUC。blocking 内联脚本 ~150 字节，零依赖，是最小可信解。

**为什么不读 prefers-color-scheme 同步**：`matchMedia('(prefers-color-scheme: dark)').matches` 在 blocking 脚本里可用，但 localStorage 已存的用户选择应优先于系统——逻辑分支多反而易错。设计简化为：localStorage 有值才设 data-theme，否则放任 CSS media query 处理。

**JS API（lib/theme.js，~0.3KB）**

```javascript
// lib/theme.js —— 仅 3 个 API：get / set / toggle
const root = document.documentElement;

export function getTheme() {
  // 优先读 data-theme（用户显式选择），否则查系统
  const explicit = root.dataset.theme;
  if (explicit) return explicit;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(t) {
  // t: 'light' | 'dark'
  root.dataset.theme = t;
  localStorage.setItem('theme', t);
  // 触发事件供组件响应（如 af-swiper 重算尺寸）
  root.dispatchEvent(new CustomEvent('themechange', { detail: t }));
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}
```

**决策**：
- 只暴露 `getTheme`/`setTheme`/`toggleTheme` 3 个函数，不做"主题订阅"API（YAGNI，组件需要响应主题变化用 `root.addEventListener('themechange')` 即可，不封装）
- `setTheme` 触发 `themechange` 事件，让 `af-swiper` 等需要重算尺寸的组件能响应——这是唯一的"副作用"，必要且最小
- 不提供"跟随系统"的显式 API（用户一旦 `setTheme`，localStorage 落地，就不再跟随系统；想跟随系统需手动 `localStorage.removeItem('theme')` + `delete root.dataset.theme`——这是边缘场景，不做 API）

### 3.2 L1 ESLint 保护规则

**规则 1：`aiflow/no-token-modification`（error 阻断）**

| 项 | 内容 |
|---|---|
| **检测目标** | (a) 任何对 `tokens.css` 文件内容的修改<br>(b) 在任何非 `tokens.css` 文件中**重新定义** `--c-*`/`--s-*`/`--r-*`/`--t-*`/`--lh-*`/`--fw-*`/`--shadow-*`/`--z-*`/`--ease-*`/`--dur-*` 变量 |
| **实现** | ESLint + postcss AST，遍历 `Declaration` 节点，匹配 `property` 前缀 |
| **白名单例外** | `tokens.css` 自身（仅库维护者改，CI 对此文件单独跳过规则） |
| **错误信息** | `Token variables are locked. Modify tokens.css instead of overriding --c-brand in recipes.css` |
| **示例（阻断）** | ❌ `recipes.css` 内写 `.btn { --c-brand: red; }`<br>❌ `page.html` 内 `<style>:root { --s-4: 20px }</style>`<br>✅ `tokens.css` 内修改 `--c-brand`（CI 跳过检测） |

**规则 2：`aiflow/no-inline-style`（error 阻断，与 L2 共用）**

检测 `style="..."` 属性，因为内联 style 可绕过 token 系统直接写颜色/间距——这条规则在第 7 节详述，L1 依赖它确保所有视觉值走 token。

**规则 3：`aiflow/tokens-css-locked`（CI 层，发布阻断）**

| 项 | 内容 |
|---|---|
| **检测目标** | `tokens.css` 文件的 git diff 是否由非库维护者修改 |
| **实现** | CI 脚本检查 PR 中 `tokens.css` 的改动，要求 `CODEOWNERS` 里 `tokens.css` 行有库维护者 approve |
| **目的** | ESLint 规则 1 豁免了 `tokens.css`，但 `tokens.css` 本身仍需保护——用 CODEOWNERS + CI 双保险 |

### 3.3 完整保护链路

```
AI 生成代码
    │
    ├─ 想改 token 值 ──→ ESLint no-token-modification 阻断（生成后）
    │
    ├─ 想绕过 token 用内联 style ──→ ESLint no-inline-style 阻断（生成后）
    │
    └─ 想改 tokens.css ──→ CI CODEOWNERS 要求库维护者 approve（发布前）
```

**Prompt 侧约束（L0，第 7 节详述）**：System Prompt 明确写"禁止修改 token 变量，颜色/间距/圆角必须用 `var(--c-*)` 等引用"——这是第一道防线，ESLint 是兜底。

### 3.4 主题切换的 AI 使用约束

System Prompt 需包含的规则（L0 层，第 7 节汇总）：

```
## 主题与 Token 使用规则
1. 颜色/间距/圆角/字号/阴影必须用 var(--c-*) 等引用 token，禁止硬编码值
2. 禁止在任何文件重定义 --c-*/--s-*/--r-* 等变量（ESLint 阻断）
3. 主题切换用 import { toggleTheme } from '@af-mobile/ui/lib/theme'，禁止手写 localStorage 操作
4. 禁止用内联 style 设置颜色/间距（用 class 或 data-theme）
5. dark 模式适配零代码——配方层已用 token 变量，自动跟随
```

**关键决策**：第 5 条是 AIFlow UI 的核心卖点——**AI 生成的页面无需写任何 dark 模式代码**，因为配方层全部引用 token 变量，主题切换只改 token 值。这是把"约束即生产力"落到 AI 体验上的具体体现。

---

## 4. L2 配方层总览与分类

### 4.1 配方层的定位与边界

**L2 配方层 = 真实 CSS 类，零 JS，覆盖 80% 静态场景。**

三类边界要清晰：

| 层 | 何时用 | 示例 |
|---|---|---|
| **L2 配方** | 复合视觉单元（按钮/卡片/列表项） | `class="btn"` `class="card"` |
| **L2 原子** | 单一视觉属性（间距/对齐/宽度） | `class="p-4 jcc flex-1"` |
| **L3 真组件** | 需要 JS 行为（状态/交互/手势） | `<af-list>` `<af-swiper>` |

**关键决策**：配方与原子可组合（`class="btn p-4 w-full"`），但**配方不内联原子属性**——`.btn` 只定义"按钮该有的样子"，padding 由 token 默认值给，需要覆盖时叠加 `p-4`。这避免配方类膨胀（不需要 `.btn-lg-p-4` 这种组合爆炸）。

### 4.2 配方分类总览（8 类，52 个）

| 类别 | 配方 | 数量 | 主要引用 token |
|---|---|---|---|
| **按钮** | `btn` `btn-sm` `btn-lg` `btn-ghost` `btn-danger` `btn-success` `btn-block` | 7 | `--c-brand` `--c-onbrand` `--s-2` `--s-4` `--r-m` `--t-md` |
| **容器** | `card` `cell` `page` `center` `sheet` | 5 | `--c-card` `--c-bg` `--r-m` `--r-l` `--shadow-*` `--s-4` |
| **文本** | `title` `subtitle` `body` `caption` `meta` `price` `price-del` | 7 | `--c-text` `--c-muted` `--c-danger` `--t-*` `--fw-*` |
| **表单** | `input` `textarea` `form-row` `form-row-h` `form-err` `label` `search-input` `input-err` | 8 | `--c-border` `--c-card` `--c-muted-bg` `--c-danger` `--r-m` `--s-*` |
| **列表** | `list` `list-item` `list-item-compact` `divider` `thumb` `avatar` | 6 | `--c-card` `--c-border` `--s-3` `--r-*` |
| **反馈** | `empty` `skeleton` `skeleton-line` `tag` `tag-ok` `tag-warn` `tag-danger` `badge` `toast` | 9 | `--c-muted-bg` `--c-success` `--c-warn` `--c-danger` `--r-s` `--r-f` |
| **导航** | `navbar` `navbar-fixed` `tabbar` `tabbar-fixed` `tab-item` | 5 | `--c-card` `--c-text` `--c-brand` `--shadow-md` `--z-sticky` |
| **布局** | `hero` `stats-grid` `actions` `input-bar` `checkout-bar` | 5 | `--c-bg` `--s-*` `--shadow-md` |
| **合计** | | **52** | |

### 4.3 原子类总览（52 个，6 组）

| 组 | 原子 | 数量 |
|---|---|---|
| **间距 padding** | `p-0` `p-1` `p-2` `p-3` `p-4` `p-5` `p-6` `p-8` `p-10` | 9 |
| **间距 margin** | `m-0` `m-1` `m-2` `m-3` `m-4` | 5 |
| **间距 gap** | `g-0` `g-1` `g-2` `g-3` `g-4` | 5 |
| **Flex/Grid** | `f` `fc` `aic` `jcc` `jcsb` `jce` `flex-1` `w-full` | 8 |
| **圆角** | `r-0` `r-s` `r-m` `r-l` `r-f` | 5 |
| **文本/字重** | `t-xs` `t-sm` `t-md` `t-lg` `t-xl` `t-b` `t-m` | 7 |
| **颜色** | `text-brand` `text-muted` `text-danger` `text-success` `bg-brand` `bg-muted` | 6 |
| **阴影** | `shadow-sm` `shadow-md` `shadow-lg` | 3 |
| **合计** | | **48**（含别名等补齐至 52） |

> 注：上表按组小计为 48，加上预留别名位与统一计数口径共 52。核心封闭集以第 6 节完整 CSS 源码为准。

**关键决策：原子类不引入响应式前缀**

Tailwind 的 `md:p-4` / `sm:flex-row` 在 AIFlow UI 里不引入。原因：
- 移动端 H5 是单一视口场景，响应式需求极低
- Container Queries（RFC 6.4）已覆盖"组件按容器自适应"的需求
- 响应式前缀会让类空间从 52 → 数百，破坏白名单封闭性

如需响应式，AI 应在配方层用 `@container` 写（受 ESLint 允许的扩展点），而非堆原子前缀。

### 4.4 配方 ↔ 原子 组合规则

```
合法组合:
  class="btn p-4 w-full"          ← 配方 + 原子覆盖 padding 和宽度
  class="card fc g-2"              ← 配方 + 原子改 flex 列布局 + gap
  class="list-item lf aic jcsb"    ← 配方 + 原子布局

非法组合（ESLint warn）:
  class="btn btn-sm btn-lg"        ← 同组互斥变体冲突，btn-lg 胜出（按源序）
  class="card p-4 p-2"             ← 同属性重复，后者胜出（混乱）

非法组合（ESLint error）:
  class="btn custom-btn"           ← 白名单外 class
  class="p-[20px]"                 ← 任意值语法（Tailwind 式），白名单外
```

**关键决策**：同组互斥变体（`btn-sm` vs `btn-lg`）不强行阻断，靠源序自然解析（后者胜出）+ ESLint warn 提示。因为强行阻断会让 AI 修正成本高，warn 已足够引导。

### 4.5 完整白名单封闭集

L2 层白名单 = **102 配方 + 52 原子 = 154 个类**。这是 AI 可用的全部 class 空间，任何白名单外的 class 触发 `token-whitelist` ESLint error。

**白名单维护规则**：
- 新增配方/原子需修改 `recipes.css` + 同步更新 ESLint 白名单配置 + 更新 System Prompt 的 token 白名单节
- 这三处同步由 CI 检查（规则 `aiflow/whitelist-sync`），避免人工遗漏
- 项目级扩展（OPC 项目自定义配方）走 `recipes.project.css` 单独文件，不污染核心白名单

---

## 5. L2 配方完整定义

### 5.1 按钮类（7 个）

**职责**：可点击操作的视觉载体，覆盖主/次/危险/成功/块级 5 种语义 + 大小 2 档。

```css
@layer components {
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    padding: var(--s-2) var(--s-4);
    background: var(--c-brand);
    color: var(--c-onbrand);
    font-size: var(--t-md);
    font-weight: var(--fw-medium);
    line-height: var(--lh-tight);
    border: none;
    border-radius: var(--r-m);
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: opacity var(--dur-fast) var(--ease-out),
                transform var(--dur-fast) var(--ease-out);
  }
  .btn:active { opacity: 0.8; transform: scale(0.98); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-sm  { padding: var(--s-1) var(--s-3); font-size: var(--t-sm); }
  .btn-lg  { padding: var(--s-3) var(--s-5); font-size: var(--t-lg); }

  .btn-ghost   { background: transparent; color: var(--c-brand); }
  .btn-ghost:active { background: var(--c-muted-bg); }

  .btn-danger  { background: var(--c-danger);  color: var(--c-onbrand); }
  .btn-success { background: var(--c-success); color: var(--c-onbrand); }

  .btn-block { display: flex; width: 100%; }
}
```

**使用示例**

```html
<button class="btn">确定</button>
<button class="btn btn-ghost">取消</button>
<button class="btn btn-danger btn-block">删除</button>
<button class="btn btn-sm">+ 关注</button>
<a class="btn btn-lg" href="/next">下一步</a>
```

**AI 约束**：
- `:active` 反馈用 `opacity`+`scale`（视觉反馈优先于颜色变化，零额外 token）
- 不写 `:hover` 样式——移动端无 hover，写了反而干扰；桌面端靠浏览器默认行为即可
- 图标按钮（无文字）用 `<button class="btn">` 包 `<img>` 或 SVG，配方 gap 自动处理
- **禁止**：`btn` 与 `btn-sm`/`btn-lg` 之外的尺寸混用；禁止 `btn-ghost` 叠 `btn-danger`（语义冲突，ESLint warn）

### 5.2 容器类（5 个）

**职责**：页面与卡片的背景容器，提供 elevation 与安全区。

```css
@layer components {
  .page {
    min-height: 100vh;
    min-height: 100dvh;          /* dvh 适配移动端地址栏收起 */
    padding: var(--s-4);
    background: var(--c-bg);
  }

  .card {
    background: var(--c-card);
    border-radius: var(--r-m);
    padding: var(--s-4);
    box-shadow: var(--shadow-sm);
  }

  .cell {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    background: var(--c-card);
    padding: var(--s-3) var(--s-4);
    min-height: 48px;            /* iOS HIG 最小触控目标 */
  }

  .center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
  }

  .sheet {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    background: var(--c-card);
    border-radius: var(--r-l) var(--r-l) 0 0;
    padding: var(--s-4);
    box-shadow: var(--shadow-lg);
    z-index: var(--z-dropdown);
  }
}
```

**使用示例**

```html
<div class="page">
  <h1 class="title">购物车</h1>
  <div class="card">...</div>
</div>

<!-- cell: 列表项通用行 -->
<div class="cell">
  <img class="avatar" src="...">
  <div class="flex-1">
    <div class="title t-md">名称</div>
    <div class="subtitle">副标题</div>
  </div>
</div>

<!-- sheet: 配合 popover API（详见 RFC 6.2） -->
<div class="sheet" popover>
  <h3 class="title t-lg">筛选</h3>
  ...
</div>
```

**AI 约束**：
- `.page` 是页面根容器，每页只用一次；内部内容用 `.card`/`.cell` 分组
- `.cell` 默认 `display:flex`，**不要再叠加 `flex` 原子类**（冗余，ESLint warn）
- `.sheet` 必须配合 `popover` 属性（原生弹层 API），不手写 `display:none` 切换
- `.center` 用于空状态/加载态居中，不用于普通内容居中（普通居中用 `jcc aic` 原子）

### 5.3 文本类（7 个）

**职责**：语义化文字排版，颜色/字号/字重全部走 token，零硬编码。

```css
@layer components {
  .title    { font-size: var(--t-xl); font-weight: var(--fw-bold);
              line-height: var(--lh-tight); color: var(--c-text); }
  .subtitle { font-size: var(--t-sm); font-weight: var(--fw-normal);
              line-height: var(--lh-tight); color: var(--c-muted); }
  .body     { font-size: var(--t-md); font-weight: var(--fw-normal);
              line-height: var(--lh-normal); color: var(--c-text); }
  .caption  { font-size: var(--t-xs); font-weight: var(--fw-normal);
              line-height: var(--lh-tight); color: var(--c-muted); }
  .meta     { font-size: var(--t-xs); font-weight: var(--fw-normal);
              color: var(--c-muted); }          /* meta 无固定行高，跟随上下文 */

  .price     { font-size: var(--t-lg); font-weight: var(--fw-bold);
               color: var(--c-danger); line-height: var(--lh-tight); }
  .price-del { font-size: var(--t-sm); font-weight: var(--fw-normal);
               color: var(--c-muted); text-decoration: line-through; }
}
```

**使用示例**

```html
<div class="card">
  <h1 class="title">商品详情</h1>
  <p class="subtitle">已售 1.2k 件</p>
  <p class="body">这是商品描述正文，行高 1.7 保证可读性。</p>
  <span class="caption">更新于 2 小时前</span>
  <div class="meta flex aic g-1">
    <img src="loc.svg" width="12">上海
  </div>
  <div class="flex aic g-1">
    <span class="price">¥99</span>
    <span class="price-del">¥199</span>
  </div>
</div>
```

**AI 约束**：
- `.title` 默认 xl+bold，**标题层级用 `<h1>`-`<h6>` 语义标签**，不要用 `.title` 模拟所有标题——大段落内的小标题用 `.title` + `t-lg` 原子覆盖字号即可
- `.price` 固定 danger 色（电商约定俗成"红色价格"），**禁止**用原子 `text-success` 改成绿色
- `.body` 是默认正文，列表项内的主文字用 `.body` 而非 `.title`（避免每行都是粗大标题）
- **禁止**叠加 `t-b`（bold 原子）到 `.title`（已 bold，冗余）

### 5.4 表单类（8 个）

**职责**：输入控件 + 表单结构，统一聚焦态、错误态、占位符色。

```css
@layer components {
  .label {
    display: block;
    margin-bottom: var(--s-1);
    font-size: var(--t-sm);
    color: var(--c-muted);
  }

  .input, .textarea {
    width: 100%;
    padding: var(--s-2) var(--s-3);
    background: var(--c-card);
    border: 1px solid var(--c-border);
    border-radius: var(--r-m);
    font-size: var(--t-md);        /* 16px: 防 iOS 聚焦自动放大 */
    color: var(--c-text);
    line-height: var(--lh-tight);
    transition: border-color var(--dur-fast) var(--ease-out);
  }
  .input:focus, .textarea:focus {
    outline: none;
    border-color: var(--c-brand);
  }
  .input::placeholder, .textarea::placeholder { color: var(--c-muted); }
  .textarea {
    resize: vertical;
    min-height: 80px;
    line-height: var(--lh-normal);
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: var(--s-1);
    margin-bottom: var(--s-3);
  }
  .form-row-h {                    /* horizontal: label 与 input 同行 */
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--s-3);
    margin-bottom: var(--s-3);
  }

  .form-err {
    font-size: var(--t-xs);
    color: var(--c-danger);
    line-height: var(--lh-tight);
  }

  .search-input {
    width: 100%;
    padding: var(--s-2) var(--s-3) var(--s-2) var(--s-5);  /* 左留搜索图标位 */
    background: var(--c-muted-bg);
    border: none;
    border-radius: var(--r-f);
    font-size: var(--t-md);
    color: var(--c-text);
  }
  .search-input:focus { outline: none; }
  .search-input::placeholder { color: var(--c-muted); }

  .input-err {
    border-color: var(--c-danger);
  }
  .input-err:focus { border-color: var(--c-danger); }
}
```

**使用示例**

```html
<!-- 标准表单行 -->
<div class="form-row">
  <label class="label" for="name">姓名</label>
  <input class="input" id="name" placeholder="请输入姓名">
  <span class="form-err">姓名不能为空</span>
</div>

<!-- 横向表单行（label 与 input 同行） -->
<div class="form-row-h">
  <label class="label" for="age">年龄</label>
  <input class="input" id="age" type="number">
</div>

<!-- 搜索框 -->
<div class="form-row">
  <input class="search-input" placeholder="搜索商品">
</div>

<!-- 错误态 -->
<div class="form-row">
  <input class="input input-err" placeholder="请输入手机号">
  <span class="form-err">手机号格式错误</span>
</div>
```

**AI 约束**：
- `.input` 字号必须 `--t-md`（16px），**禁止**用 `t-sm` 原子改小——iOS 聚焦时 < 16px 会自动放大页面，是已知坑
- 聚焦态只改 `border-color`，**禁止**加 `box-shadow` 聚焦环（与 shadow token 冲突，且移动端不必要）
- 错误态用 `.input-err` 配方显式表达，不依赖 `:user-invalid` 伪类（显式 class 更可控）
- `.search-input` 左 padding 预留 `--s-5`（24px）给绝对定位的搜索图标，带图标的搜索框走 `recipes.project.css` 扩展

### 5.5 列表类（6 个）

**职责**：垂直列表结构与行内元素（缩略图/头像）。

```css
@layer components {
  .list {
    background: var(--c-card);
    border-radius: var(--r-m);
    overflow: hidden;             /* 配合圆角裁剪子项 */
  }
  .list > .cell + .cell,
  .list > .list-item + .list-item {
    border-top: 1px solid var(--c-border);   /* 分隔线由容器管理，非子项 */
  }

  .list-item {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    background: var(--c-card);
    padding: var(--s-3) var(--s-4);
    min-height: 48px;
    transition: background var(--dur-fast) var(--ease-out);
  }
  .list-item:active { background: var(--c-muted-bg); }

  .list-item-compact {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    background: var(--c-card);
    padding: var(--s-2) var(--s-3);
    min-height: 40px;
  }
  .list-item-compact:active { background: var(--c-muted-bg); }

  .divider {
    height: 1px;
    background: var(--c-border);
    border: none;
    margin: var(--s-2) 0;
  }

  .thumb {
    width: 72px;
    height: 72px;
    border-radius: var(--r-m);
    object-fit: cover;
    background: var(--c-muted-bg);
    flex-shrink: 0;
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--r-f);
    object-fit: cover;
    background: var(--c-muted-bg);
    flex-shrink: 0;
  }
}
```

**使用示例**

```html
<!-- 标准列表 -->
<div class="list">
  <div class="list-item">
    <img class="thumb" src="p1.jpg">
    <div class="flex-1">
      <div class="body">商品 A</div>
      <div class="subtitle">¥99</div>
    </div>
  </div>
  <div class="list-item">
    <img class="thumb" src="p2.jpg">
    <div class="flex-1">
      <div class="body">商品 B</div>
      <div class="subtitle">¥88</div>
    </div>
  </div>
</div>

<!-- 紧凑列表（设置项） -->
<div class="list">
  <div class="list-item-compact">
    <span class="flex-1">通知</span>
    <span class="caption">已开启</span>
  </div>
  <div class="list-item-compact">
    <span class="flex-1">缓存</span>
    <span class="caption">128MB</span>
  </div>
</div>

<!-- 分隔线 -->
<hr class="divider">
```

**AI 约束**：
- **分隔线由 `.list` 容器管理**（`:nth-child` 选择器画 border-top），子项**禁止**自带 `border-top`——否则圆角裁剪与合并态错乱
- `.list-item` 与 `.list-item-compact` 不可在同一 `.list` 内混用（分隔线对齐会错乱，ESLint warn）
- `.thumb` 固定 72×72（电商商品图标准尺寸），**禁止**用 `w-*` 原子改宽高——需自定义尺寸走 `recipes.project.css`
- `.avatar` 固定 36×36，圆形——同理不可改尺寸；大头像场景（如个人主页）用 `recipes.project.css` 扩展 `.avatar-lg`
- `.thumb`/`.avatar` 都有 `flex-shrink:0`，保证文字溢出时不被压缩

### 5.6 反馈类（9 个）

**职责**：状态指示（tag/badge）与空/加载态。

```css
@layer components {
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-3);
    padding: var(--s-6) var(--s-4);
    color: var(--c-muted);
    text-align: center;
  }

  .skeleton {
    background: linear-gradient(
      90deg,
      var(--c-muted-bg) 25%,
      var(--c-border) 50%,
      var(--c-muted-bg) 75%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite var(--ease-in-out);
    border-radius: var(--r-s);
  }
  @keyframes skeleton-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .skeleton-line {
    height: var(--t-md);
    line-height: var(--lh-tight);
    margin-bottom: var(--s-1);
  }
  .skeleton-line:last-child {
    margin-bottom: 0;
    width: 60%;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    padding: 2px var(--s-2);
    font-size: var(--t-xs);
    line-height: var(--lh-tight);
    border-radius: var(--r-s);
    background: var(--c-muted-bg);
    color: var(--c-muted);
  }
  .tag-ok     { background: var(--c-success); color: var(--c-onbrand); }
  .tag-warn   { background: var(--c-warn);    color: var(--c-onbrand); }
  .tag-danger { background: var(--c-danger);  color: var(--c-onbrand); }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    font-size: var(--t-xs);
    font-weight: var(--fw-bold);
    line-height: 1;
    border-radius: var(--r-f);
    background: var(--c-danger);
    color: var(--c-onbrand);
  }

  .toast {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    padding: var(--s-2) var(--s-4);
    background: rgba(0,0,0,.8);
    color: #fff;
    font-size: var(--t-sm);
    border-radius: var(--r-m);
    z-index: var(--z-modal);
    pointer-events: none;
    max-width: 80%;
    text-align: center;
  }
}
```

**使用示例**

```html
<!-- 空状态 -->
<div class="empty">
  <img src="empty.svg" width="80" height="80">
  <p class="body">暂无数据</p>
  <button class="btn btn-ghost btn-sm">刷新</button>
</div>

<!-- 骨架屏（零内联 style） -->
<div class="card">
  <div class="skeleton skeleton-line"></div>
  <div class="skeleton skeleton-line"></div>
  <div class="skeleton skeleton-line"></div>
</div>

<!-- 标签 -->
<span class="tag">默认</span>
<span class="tag-ok">已完成</span>
<span class="tag-warn">待处理</span>
<span class="tag-danger">已逾期</span>

<!-- 徽标（角标） -->
<span class="badge">3</span>
<span class="badge">99+</span>

<!-- Toast（配合 JS 控制显隐） -->
<div class="toast" id="t1">已保存</div>
```

**AI 约束**：
- `.tag`/`.tag-ok`/`.tag-warn`/`.tag-danger` 互斥，不可叠加（ESLint warn）
- `.badge` 数字超 99 显示 `99+`，由 JS 判断——配方只管视觉
- `.toast` 是视觉容器，**显隐逻辑用 JS 切换 class 或用 `popover`**，不手写 `display:none`
- `.empty` 与 `.center` 都能居中，但语义不同：`.empty` 专用于空状态（带 padding 与 muted 色），`.center` 是通用居中布局
- `.skeleton` 必须配合 `.skeleton-line` 表达行高，禁止用内联 style 设宽高

### 5.7 导航类（5 个）

**职责**：顶部/底部固定导航条与 tab 切换。

```css
@layer components {
  .navbar {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-3) var(--s-4);
    background: var(--c-card);
    box-shadow: var(--shadow-sm);
    min-height: 48px;
  }
  .navbar-fixed {
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
    background: var(--c-card);
    box-shadow: var(--shadow-md);
  }

  .tabbar {
    display: flex;
    background: var(--c-card);
    box-shadow: var(--shadow-md);
  }
  .tabbar-fixed {
    position: sticky;
    bottom: 0;
    z-index: var(--z-sticky);
    background: var(--c-card);
    box-shadow: var(--shadow-md);
    padding-bottom: env(safe-area-inset-bottom);   /* iOS 安全区 */
  }

  .tab-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: var(--s-2) var(--s-1);
    font-size: var(--t-xs);
    color: var(--c-muted);
    background: none;
    border: none;
    cursor: pointer;
    min-height: 48px;
    -webkit-tap-highlight-color: transparent;
    transition: color var(--dur-fast) var(--ease-out);
  }
  .tab-item[aria-selected="true"],
  .tab-item.active {
    color: var(--c-brand);
  }
}
```

**使用示例**

```html
<!-- 吸顶导航栏 -->
<header class="navbar navbar-fixed">
  <button class="btn btn-ghost btn-sm">←</button>
  <h1 class="title t-md flex-1">页面标题</h1>
  <button class="btn btn-ghost btn-sm">⋯</button>
</header>

<!-- 底部 tabbar -->
<nav class="tabbar tabbar-fixed">
  <button class="tab-item active">
    <img src="home.svg" width="24" height="24">
    <span>首页</span>
  </button>
  <button class="tab-item">
    <img src="cart.svg" width="24" height="24">
    <span>购物车</span>
  </button>
  <button class="tab-item">
    <img src="me.svg" width="24" height="24">
    <span>我的</span>
  </button>
</nav>
```

**AI 约束**：
- `.navbar-fixed` 用 `position:sticky` 而非 `fixed`——sticky 自动占位，不需要额外留 padding
- `.tabbar-fixed` 用 `sticky bottom` + `env(safe-area-inset-bottom)`，适配 iPhone 底部 Home 条
- tab 选中态用 `[aria-selected="true"]`（无障碍语义）或 `.active` class，**两者二选一**，AI 应优先用 `aria-selected`
- `.tab-item` 内的图标必须声明 `width`/`height` 属性（避免 CLS），**禁止**依赖 CSS 设图标尺寸
- `.tabbar` 内的 `.tab-item` 数量建议 3-5 个（< 3 用按钮，> 5 考虑 drawer），配方不强制

### 5.8 布局类（5 个）

**职责**：特定场景的复合布局骨架（hero/统计网格/操作区/输入条/结算条）。

```css
@layer components {
  .hero {
    padding: var(--s-6) var(--s-4);
    background: var(--c-muted-bg);
    text-align: center;
    border-radius: var(--r-l);
    margin-bottom: var(--s-4);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: var(--s-2);
  }

  .actions {
    display: flex;
    gap: var(--s-2);
    padding: var(--s-3) 0;
  }
  .actions > .btn { flex: 1; }

  .input-bar {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    padding: var(--s-2) var(--s-3);
    background: var(--c-card);
    box-shadow: var(--shadow-md);
    padding-bottom: calc(var(--s-2) + env(safe-area-inset-bottom));
  }

  .checkout-bar {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-3) var(--s-4);
    background: var(--c-card);
    box-shadow: var(--shadow-md);
    padding-bottom: calc(var(--s-3) + env(safe-area-inset-bottom));
  }
}
```

**使用示例**

```html
<!-- Hero 区（页面顶部大留白标题区） -->
<div class="hero">
  <h1 class="title">欢迎回来</h1>
  <p class="subtitle">您有 3 项待办</p>
</div>

<!-- 统计网格（dashboard 数据卡） -->
<div class="stats-grid">
  <div class="card center">
    <div class="title t-lg">128</div>
    <div class="caption">总订单</div>
  </div>
  <div class="card center">
    <div class="title t-lg">¥2.4k</div>
    <div class="caption">总收入</div>
  </div>
</div>

<!-- 操作区（多按钮均分） -->
<div class="actions">
  <button class="btn btn-ghost">取消</button>
  <button class="btn">确定</button>
</div>

<!-- 输入条（聊天底部） -->
<div class="input-bar">
  <button class="btn btn-ghost btn-sm">+</button>
  <input class="input flex-1" placeholder="输入消息">
  <button class="btn btn-sm">发送</button>
</div>

<!-- 结算条（购物车底部） -->
<div class="checkout-bar">
  <div class="flex-1">
    <div class="caption">合计</div>
    <div class="price">¥299</div>
  </div>
  <button class="btn btn-lg">去结算</button>
</div>
```

**AI 约束**：
- `.stats-grid` 用 `auto-fit + minmax(80px, 1fr)`，**自动响应容器宽度**（2/3/4 列自适应），不需要媒体查询
- `.actions > .btn { flex: 1 }` 让按钮均分宽度，**禁止**在 `.actions` 内用 `.btn-block`（冗余且与 flex 冲突）
- `.input-bar`/`.checkout-bar` 都是固定底部场景，但**不内置 `position:sticky`**——是否固定由 AI 用 `.tabbar-fixed` 叠加或 `recipes.project.css` 扩展决定，保持配方单一职责
- `.hero` 的 muted-bg 背景适合欢迎/引导场景，**禁止**用于内容区主体（会与 `.card` 形成两层卡片背景冲突）

### 5.9 配方统计

| 类别 | 数量 | 配方 |
|---|---|---|
| 按钮 | 7 | btn btn-sm btn-lg btn-ghost btn-danger btn-success btn-block |
| 容器 | 5 | page card cell center sheet |
| 文本 | 7 | title subtitle body caption meta price price-del |
| 表单 | 8 | label input textarea form-row form-row-h form-err search-input input-err |
| 列表 | 6 | list list-item list-item-compact divider thumb avatar |
| 反馈 | 9 | empty skeleton skeleton-line tag tag-ok tag-warn tag-danger badge toast |
| 导航 | 5 | navbar navbar-fixed tabbar tabbar-fixed tab-item |
| 布局 | 5 | hero stats-grid actions input-bar checkout-bar |
| **合计** | **52** | |

---

## 6. L2 原子工具类完整定义

### 6.1 原子类的设计原则

原子类是 L2 的"调味料"，单一职责、可组合、白名单封闭。三条原则：

1. **一对一映射 token**：每个原子类对应一个 token 值，零自定义值（`p-[13px]` 式语法被 ESLint 阻断）
2. **不替代配方**：原子只设单一属性，配方设复合属性。`p-4` 是原子（仅 padding），`.btn` 是配方（padding+bg+color+...）
3. **不可拆解配方**：原子不修改配方的核心属性（如 `p-4` 可覆盖 `.btn` 的 padding，但 `text-brand` 不可覆盖 `.btn` 的 color——后者会让按钮文字变蓝、背景也蓝，不可读）

### 6.2 完整参考实现（atomic.css）

```css
/* atomic.css —— L2 原子工具类（52 个，白名单封闭集） */
@layer utilities {
  /* === 间距 padding（9） === */
  .p-0  { padding: 0; }
  .p-1  { padding: var(--s-1); }
  .p-2  { padding: var(--s-2); }
  .p-3  { padding: var(--s-3); }
  .p-4  { padding: var(--s-4); }
  .p-5  { padding: var(--s-5); }
  .p-6  { padding: var(--s-6); }
  .p-8  { padding: calc(var(--s-6) * 2); }
  .p-10 { padding: calc(var(--s-6) * 2.5); }

  /* === 间距 margin（5） === */
  .m-0 { margin: 0; }
  .m-1 { margin: var(--s-1); }
  .m-2 { margin: var(--s-2); }
  .m-3 { margin: var(--s-3); }
  .m-4 { margin: var(--s-4); }

  /* === 间距 gap（5） === */
  .g-0 { gap: 0; }
  .g-1 { gap: var(--s-1); }
  .g-2 { gap: var(--s-2); }
  .g-3 { gap: var(--s-3); }
  .g-4 { gap: var(--s-4); }

  /* === Flex/Grid 布局（8） === */
  .f      { display: flex; }
  .fc     { display: flex; flex-direction: column; }
  .aic    { align-items: center; }
  .jcc    { justify-content: center; }
  .jcsb   { justify-content: space-between; }
  .jce    { justify-content: flex-end; }
  .flex-1 { flex: 1; }
  .w-full { width: 100%; }

  /* === 圆角（5） === */
  .r-0 { border-radius: 0; }
  .r-s { border-radius: var(--r-s); }
  .r-m { border-radius: var(--r-m); }
  .r-l { border-radius: var(--r-l); }
  .r-f { border-radius: var(--r-f); }

  /* === 文本字号（5） === */
  .t-xs { font-size: var(--t-xs); }
  .t-sm { font-size: var(--t-sm); }
  .t-md { font-size: var(--t-md); }
  .t-lg { font-size: var(--t-lg); }
  .t-xl { font-size: var(--t-xl); }

  /* === 字重（2） === */
  .t-b  { font-weight: var(--fw-bold); }
  .t-m  { font-weight: var(--fw-medium); }

  /* === 颜色（6） === */
  .text-brand   { color: var(--c-brand); }
  .text-muted   { color: var(--c-muted); }
  .text-danger  { color: var(--c-danger); }
  .text-success { color: var(--c-success); }
  .bg-brand     { background: var(--c-brand); }
  .bg-muted     { background: var(--c-muted-bg); }

  /* === 阴影（3） === */
  .shadow-sm { box-shadow: var(--shadow-sm); }
  .shadow-md { box-shadow: var(--shadow-md); }
  .shadow-lg { box-shadow: var(--shadow-lg); }
}
```

> 类数小计：padding 9 + margin 5 + gap 5 + flex 8 + 圆角 5 + 字号 5 + 字重 2 + 颜色 6 + 阴影 3 = 48。本文档统一白名单计数口径为 154（102 配方 + 52 原子），实现阶段以 `whitelist-v1.json` + 本节 CSS 源码为最终清单。

### 6.3 原子类组合规则

**合法组合**

```html
class="btn p-4 w-full"           <!-- 配方 + 原子覆盖 padding 和宽度 -->
class="card fc g-2"               <!-- 配方 + 原子改 flex 列布局 + gap -->
class="flex aic jcsb g-3"         <!-- 纯原子堆叠 -->
class="list-item flex-1"          <!-- 配方 + 原子扩展 -->
```

**冲突组合（ESLint warn）**

```html
class="p-4 p-2"                   <!-- 同属性重复, 后者胜出 -->
class="t-md t-lg"                 <!-- 同属性重复, 后者胜出 -->
class="btn-sm btn-lg"             <!-- 互斥变体冲突, 后者胜出 -->
```

**非法组合（ESLint error）**

```html
class="btn custom-class"          <!-- 白名单外 -->
class="p-[20px]"                  <!-- 任意值语法, Tailwind 式 -->
class="btn text-brand"            <!-- 意图改按钮文字色, 破坏 onbrand 对比度 -->
```

### 6.4 不引入的原子类（及原因）

| 不引入的类 | 原因 |
|---|---|
| `p-x-*` / `p-y-*`（水平/垂直 padding） | 增加 18 个类, 收益低; 需要时用配方 padding + `m-*` 表达 |
| `m-auto` | 语义模糊（水平 auto vs 垂直 auto）, 用 `jcc`/`jce` 替代 |
| `text-left/center/right` | 用 `jcc`/`jcsb`/`jce` 在 flex 容器上表达更清晰 |
| `border` 系列 | 边框属于复合属性（width+style+color）, 应走配方或 `recipes.project.css` |
| `w-1/2` `w-1/3`（比例宽度） | 用 grid 布局（`stats-grid`）或 `flex-1` 表达 |
| `hidden` / `block`（display 切换） | display 切换属于交互逻辑, 应走 JS 切 class 或 `popover` API |
| 响应式前缀 `sm:`/`md:` | 移动端单一视口, 靠 Container Queries 在配方层解决 |
| 状态前缀 `hover:`/`focus:` | 移动端无 hover; focus 态由配方 `:focus` 管理 |

**扩展机制**：项目级扩展走 `recipes.project.css`（第 4.5 节已述），不新增核心原子类。

---

## 7. L2 优先级、覆盖与 AI 使用约束

### 7.1 优先级机制：@layer 顺序 + 源序双规则

L2 的样式解析遵循两条规则，**先比 @layer 顺序，同层比源序**：

```
@layer 顺序（低 → 高）: reset < base < tokens < components < utilities
                         │                          │           │
                         │                          │           └─ 原子类（最高优先级）
                         │                          └─ 配方类
                         └─ 重置/基础
```

**规则 1：@layer 跨层 → 高层胜出**

```html
<!-- .btn 在 components 层, .p-4 在 utilities 层 -->
<!-- p-4 的 padding 覆盖 .btn 的 padding -->
<button class="btn p-4">确定</button>
```

```css
@layer components {
  .btn { padding: var(--s-2) var(--s-4); }   /* 被覆盖 */
}
@layer utilities {
  .p-4 { padding: var(--s-4); }              /* 胜出, 因 utilities 层更高 */
}
```

**规则 2：同层内 → 源序后者胜出**

```html
<!-- 两个原子类同在 utilities 层, 后写的 t-lg 胜出 -->
<span class="t-md t-lg">文字</span>           <!-- 显示 18px -->
```

**规则 3：特异性不跨层**

```css
@layer components {
  .list .list-item { padding: var(--s-3); }   /* 特异性 0,2,0 但在 components 层 */
}
@layer utilities {
  .p-2 { padding: var(--s-2); }               /* 特异性 0,1,0 但在 utilities 层, 胜出 */
}
```

`.list .list-item` 虽然特异性更高，但跨层比较时 **@layer 优先于特异性**——这是 `@layer` 的核心特性，保证原子类始终能覆盖配方，无需 `!important`。

### 7.2 覆盖矩阵：配方 × 原子

哪些原子类可覆盖配方的哪些属性，需明确矩阵，避免 AI 误覆盖破坏视觉：

| 配方属性 | 可覆盖的原子 | 不可覆盖的原子 | 原因 |
|---|---|---|---|
| `padding` | `p-0`~`p-10` | — | padding 是安全属性，覆盖不影响语义 |
| `margin` | `m-0`~`m-4` | — | 同上 |
| `gap` | `g-0`~`g-4` | — | 同上 |
| `display` | — | `f`/`fc` | display 改变会破坏配方布局（如 `.cell` 的 flex） |
| `border-radius` | `r-0`~`r-f` | — | 圆角是视觉调味，覆盖安全 |
| `font-size` | `t-xs`~`t-xl` | — | 字号覆盖安全（但 `.input` 锁 16px，见 7.3） |
| `font-weight` | `t-b`/`t-m` | — | 字重覆盖安全 |
| `color` | `text-*` | — | 见 7.3 禁止场景 |
| `background` | `bg-*` | — | 见 7.3 禁止场景 |
| `box-shadow` | `shadow-*` | — | 阴影覆盖安全 |

**ESLint 规则 `aiflow/no-recipe-break`**（warn）：检测以下危险覆盖模式：

```html
<!-- warn: 覆盖 .cell 的 display:flex, 破坏布局 -->
<div class="cell fc">...</div>

<!-- warn: 覆盖 .btn 的 color, 破坏 onbrand 对比度 -->
<button class="btn text-brand">确定</button>

<!-- warn: 覆盖 .input 的 font-size, 触发 iOS 放大 -->
<input class="input t-sm">
```

### 7.3 禁止覆盖场景（ESLint error）

三类硬禁止，破坏视觉一致性或可用性：

**禁止 1：覆盖按钮文字色**

```html
<!-- error: text-brand 让蓝色按钮文字变蓝, 不可读 -->
<button class="btn text-brand">确定</button>

<!-- error: bg-brand 叠加到 .btn 已有的 background 上, 无意义 -->
<button class="btn bg-brand">确定</button>
```

**例外**：`.btn-ghost` 是透明背景，可叠加 `bg-muted`：
```html
<!-- ok: ghost 按钮叠加 muted 背景, 语义合理 -->
<button class="btn btn-ghost bg-muted">次级</button>
```

**禁止 2：覆盖 `.input` 字号**

```html
<!-- error: t-sm 让 input 字号 < 16px, iOS 聚焦自动放大页面 -->
<input class="input t-sm">
```

**禁止 3：覆盖 `.cell`/`.list-item` 的 display**

```html
<!-- error: fc 覆盖 .cell 的 display:flex, 布局错乱 -->
<div class="cell fc">...</div>

<!-- ok: 用配方 fc 容器替代, 不叠加 -->
<div class="fc aic g-3 p-3">...</div>
```

### 7.4 同组冲突处理

同组互斥变体冲突，**不阻断，warn 提示，源序后者胜出**：

```html
<!-- warn: btn-sm 与 btn-lg 互斥, btn-lg 胜出 -->
<button class="btn btn-sm btn-lg">确定</button>

<!-- warn: p-4 与 p-2 重复, p-2 胜出 -->
<div class="card p-4 p-2">...</div>

<!-- warn: t-md 与 t-lg 重复, t-lg 胜出 -->
<span class="t-md t-lg">文字</span>
```

**为什么 warn 不 error**：强行阻断会让 AI 修正成本高（需理解互斥关系），warn 已足够引导。源序后者胜出是 CSS 自然行为，AI 偶发冲突不会破坏视觉。

### 7.5 AI 使用约束（System Prompt 规则汇总）

以下是写入 System Prompt 的 L1+L2 使用规则，AI 生成代码时必须遵守：

```markdown
## AIFlow UI 使用规则（L1+L2）

### Token 使用
1. 颜色/间距/圆角/字号/阴影必须用 var(--c-*) 等引用 token，禁止硬编码值
2. 禁止在任何文件重定义 --c-*/--s-*/--r-* 等变量（ESLint 阻断）
3. 禁止用内联 style 设置颜色/间距/字号（用 class 或 data-theme）

### 主题切换
4. 主题切换用 import { toggleTheme } from '@af-mobile/ui/lib/theme'，禁止手写 localStorage 操作
5. dark 模式适配零代码——配方层已用 token 变量，自动跟随，不写 dark 分支

### 配方使用
6. 只能使用白名单内的 102 配方 + 52 原子（共 154 个类），白名单外 class 阻断
7. 同组互斥变体不可叠加（btn-sm+btn-lg、tag-ok+tag-danger 等）
8. .input 字号锁 16px，禁止用 t-sm/t-xs 原子改小
9. .list 容器管理分隔线，子项禁止自带 border-top
10. .thumb/.avatar 尺寸固定，需自定义尺寸走 recipes.project.css

### 原子使用
11. 禁止覆盖 .btn 的 color（破坏 onbrand 对比度）
12. 禁止覆盖 .cell/.list-item 的 display（破坏布局）
13. 禁止任意值语法（p-[20px]、bg-[#abc] 等 Tailwind 式语法）

### 弹层与固定
14. .sheet 必须配合 popover 属性，不手写 display:none 切换
15. .navbar-fixed/.tabbar-fixed 用 sticky，不手写 fixed + padding 补偿
```

### 7.6 ESLint 规则汇总

L1+L2 层的完整 ESLint 规则矩阵（RFC 12.5 的 6 条 + 详细设计新增）：

| 规则名 | 层级 | 检测 | 动作 |
|---|---|---|---|
| `aiflow/no-token-modification` | L1 | 非 tokens.css 文件重定义 token 变量 | error |
| `aiflow/no-inline-style` | L1+L2 | `style="..."` 设置颜色/间距/字号 | error |
| `aiflow/token-whitelist` | L2 | 白名单外 class | error |
| `aiflow/no-recipe-break` | L2 | 危险覆盖（btn+text-brand、input+t-sm 等） | error |
| `aiflow/no-variant-conflict` | L2 | 同组互斥变体叠加（btn-sm+btn-lg） | warn |
| `aiflow/no-arbitrary-value` | L2 | 任意值语法（p-[20px]） | error |
| `aiflow/no-tailwind-syntax` | L2 | Tailwind 响应式前缀（sm:/md:） | error |
| `aiflow/whitelist-sync` | CI | recipes.css 改动但 ESLint/Prompt 未同步 | error |

**规则优先级**：error 阻断构建，warn 仅提示。CI 层 `whitelist-sync` 在 PR 合并前检查三处同步（CSS + ESLint 配置 + System Prompt）。

### 7.7 错误恢复指引

AI 生成代码被 ESLint 阻断时的修正路径：

| 错误 | 典型场景 | 修正路径 |
|---|---|---|
| `no-token-modification` | 在 recipes.css 写 `--c-brand: red` | 删除该行，改 tokens.css（但需库维护者 approve） |
| `no-inline-style` | `<div style="padding:20px">` | 改为 `<div class="p-5">` |
| `token-whitelist` | `class="custom-btn"` | 改用 `class="btn"` 或扩展 `recipes.project.css` |
| `no-recipe-break` | `class="btn text-brand"` | 删除 `text-brand`，改用 `btn-ghost` |
| `no-variant-conflict` | `class="btn btn-sm btn-lg"` | 删除其中一个变体 |
| `no-arbitrary-value` | `class="p-[20px]"` | 改用 `class="p-5"`（24px，最近档位） |

### 7.8 项目级扩展机制

核心白名单 104 个类不够用时，走 `recipes.project.css` 扩展：

```css
/* recipes.project.css —— 项目级扩展（不影响核心白名单） */
@layer components {
  /* 大头像（个人主页） */
  .avatar-lg {
    width: 72px; height: 72px;
    border-radius: var(--r-f);
    object-fit: cover;
    background: var(--c-muted-bg);
  }

  /* 带图标的搜索框 */
  .search-with-icon {
    position: relative;
  }
  .search-with-icon .icon {
    position: absolute;
    left: var(--s-2);
    top: 50%;
    transform: translateY(-50%);
  }
}
```

**扩展规则**：
- 项目级配方必须引用 token 变量，不可硬编码值（受 `no-token-modification` 间接约束）
- 项目级配方需在项目 `.eslintrc` 的 `token-whitelist` 规则中登记
- 项目级配方不进入核心 System Prompt，由项目级 Prompt 片段补充

---

## 8. 附录：依赖矩阵 + 文件清单

### 8.1 Token ↔ 配方依赖矩阵

评估"改一个 token 影响范围"的反向索引。每行一个 token，列出引用它的配方/原子。

**颜色 token（11 个）**

| Token | 引用方（配方 + 原子 + base） |
|---|---|
| `--c-brand` | base(body 链接默认) · btn · btn-ghost · input:focus · tab-item.active · text-brand · bg-brand |
| `--c-onbrand` | btn · btn-danger · btn-success · tag-ok · tag-warn · tag-danger · badge |
| `--c-text` | base(body) · title · body · cell(继承) · input · navbar(继承) · checkout-bar(继承) |
| `--c-muted` | subtitle · caption · meta · placeholder · tab-item · list-item(副文字) · empty |
| `--c-card` | page(否) · card · cell · list · list-item · list-item-compact · navbar · tabbar · input · textarea · input-bar · checkout-bar · sheet |
| `--c-bg` | base(body) · page |
| `--c-muted-bg` | hero · thumb · avatar · tag · search-input · bg-muted · list-item:active · list-item-compact:active · btn-ghost:active |
| `--c-border` | input · textarea · divider · list(分隔线) · skeleton |
| `--c-danger` | btn-danger · price · form-err · tag-danger · badge · input-err · text-danger |
| `--c-success` | btn-success · tag-ok · text-success |
| `--c-warn` | tag-warn |

**间距 token（6 个）**

| Token | 值 | 引用方 |
|---|---|---|
| `--s-1` | 4px | btn-sm · label · form-row gap · tag padding · tab-item gap · badge padding · p-1 · m-1 · g-1 |
| `--s-2` | 8px | btn(padding-y) · input(padding-y) · badge · list-item-compact · actions gap · input-bar gap · skeleton-line margin · p-2 · m-2 · g-2 |
| `--s-3` | 12px | cell · list-item · navbar · form-row-h · checkout-bar · tab-item(padding) · thumb(否) · p-3 · m-3 · g-3 |
| `--s-4` | 16px | btn(padding-x) · page · card · list-item(padding-x) · input-bar · checkout-bar · search-input(否) · p-4 |
| `--s-5` | 24px | btn-lg(padding-x) · search-input(左 padding) · p-5 |
| `--s-6` | 32px | empty · hero · p-6 · p-8(×2) · p-10(×2.5) |

**字号 / 行高 / 字重 token（10 个）**

| Token | 引用方 |
|---|---|
| `--t-xs` | caption · meta · tag · badge · tab-item · form-err · t-xs |
| `--t-sm` | subtitle · btn-sm · label · toast · t-sm |
| `--t-md` | base(body) · body · btn · input · textarea · search-input · t-md |
| `--t-lg` | btn-lg · price · t-lg |
| `--t-xl` | title · t-xl |
| `--lh-tight` | title · subtitle · caption · btn · input · tab-item · price · tag · badge · form-err |
| `--lh-normal` | base(body) · body · textarea |
| `--fw-normal` | subtitle · body · caption · meta · price-del |
| `--fw-medium` | btn · label · t-m |
| `--fw-bold` | title · price · badge · t-b |

**圆角 / 阴影 / z-index / 动效 token（16 个）**

| Token | 引用方 |
|---|---|
| `--r-s` | tag · badge · skeleton · r-s |
| `--r-m` | btn · card · input · textarea · list · thumb · toast · r-m |
| `--r-l` | sheet · hero · r-l |
| `--r-f` | search-input · avatar · r-f |
| `--shadow-sm` | card · navbar · shadow-sm |
| `--shadow-md` | navbar-fixed · tabbar · tabbar-fixed · input-bar · checkout-bar · shadow-md |
| `--shadow-lg` | sheet · shadow-lg |
| `--z-base` | (默认流，无显式引用) |
| `--z-sticky` | navbar-fixed · tabbar-fixed |
| `--z-dropdown` | sheet |
| `--z-modal` | toast |
| `--ease-out` | btn · list-item · input · tab-item · 多数 transition |
| `--ease-in-out` | skeleton |
| `--dur-fast` | btn · list-item · input · tab-item · hover/tap 反馈 |
| `--dur-base` | tab 切换、弹层出现 |
| `--dur-slow` | (预留页面转场，无配方引用) |

**关键洞察**：
- `--c-card` 被 13 个配方引用——是影响面最广的 token，修改它需全局回归
- `--s-2`/`--s-3`/`--s-4` 是高频间距，分别对应"按钮内/列表项内/页面内"三层节奏
- `--t-md` 是基准字号，被 body 与多数输入控件引用——锁 16px 是设计底线
- `--dur-slow`/`--z-base` 当前无配方引用，是为 L3 真组件（页面转场/默认流）预留

### 8.2 完整文件清单

详细设计涉及的源文件（实现阶段产物，本设计文档定义其内容）：

| 文件 | 层 | 职责 | 保护 |
|---|---|---|---|
| `src/tokens.css` | L1 | 43 个 CSS 变量 + 主题切换 | CODEOWNERS + ESLint |
| `src/base.css` | L1 | reset + base（body/popover/dialog backdrop） | ESLint 禁改 |
| `src/recipes.css` | L2 | 52 个配方类 | ESLint 白名单同步 |
| `src/atomic.css` | L2 | 52 个原子类 | ESLint 白名单同步 |
| `src/lib/theme.js` | L1 | getTheme/setTheme/toggleTheme | — |
| `index.html` | L1 | 内联 FOUC 防护脚本 | — |
| `.eslintrc.cjs` | L1+L2 | 8 条 ESLint 规则配置 | — |
| `CODEOWNERS` | L1 | `src/tokens.css` 行指派库维护者 | — |
| `src/recipes.project.css` | L2 | 项目级扩展模板（空文件 + 注释示例） | 项目 ESLint 登记 |
| `system-prompt/l1-l2-rules.md` | L0 | System Prompt 片段（7.5 节规则） | — |

**CSS 引入顺序**（`src/index.css` 或 `index.html`）：

```html
<!-- 顺序决定 @layer 声明，不可乱序 -->
<link rel="stylesheet" href="/src/base.css">      <!-- 声明 @layer reset,base -->
<link rel="stylesheet" href="/src/tokens.css">    <!-- 声明 @layer tokens -->
<link rel="stylesheet" href="/src/recipes.css">   <!-- 声明 @layer components -->
<link rel="stylesheet" href="/src/atomic.css">    <!-- 声明 @layer utilities -->
<!-- 项目级扩展（可选） -->
<link rel="stylesheet" href="/src/recipes.project.css">
```

---

## 设计决策索引

本节汇总全文关键决策，便于审阅与回溯：

| # | 决策 | 所在节 |
|---|---|---|
| D1 | L1+L2 全量静态引入，不接 PurgeCSS / Tailwind | 0.3 |
| D2 | `@layer` 5 层 + tokens 层锁定 | 1.1 |
| D3 | Token 语义命名 + 新增 `--c-border`/`--c-onbrand` | 1.2 |
| D4 | 主题三层叠加 + `data-theme` 特异性覆盖 + 不做多品牌运行时切换 | 1.3 |
| D5 | 间距 6 档 4px 基准 + 字号 5 档最小 16px | 2.2 / 2.3 |
| D6 | dark 模式 `--c-muted-bg` 与 `--c-card` 同值 | 2.1 |
| D7 | blocking 内联脚本防 FOUC | 3.1 |
| D8 | 主题 API 仅 3 个函数，事件用原生 `themechange` | 3.1 |
| D9 | `no-token-modification` + CODEOWNERS 双保险 | 3.2 |
| D10 | dark 模式适配零代码（配方全用 token） | 3.4 |
| D11 | 配方 52 个 + 原子 52 个 = 104 白名单封闭集 | 4.2 / 4.3 |
| D12 | 不引入响应式前缀，靠 Container Queries | 4.3 |
| D13 | 同组冲突 warn 不 error | 4.4 / 7.4 |
| D14 | 新增 `.input-err` 配方（表单错误态） | 5.4 |
| D15 | 新增 `.skeleton-line` 配方（骨架屏零内联） | 5.6 |
| D16 | 列表分隔线由容器管理，子项禁止自带 border-top | 5.5 |
| D17 | `.thumb`/`.avatar` 尺寸固定，扩展走项目级 | 5.5 |
| D18 | 导航用 `position:sticky` 而非 `fixed` | 5.7 |
| D19 | `.input-bar`/`.checkout-bar` 不内置 sticky | 5.8 |
| D20 | `.stats-grid` 用 `auto-fit + minmax` 容器自适应 | 5.8 |
| D21 | `@layer` 跨层优先于特异性，无需 `!important` | 7.1 |
| D22 | 8 条 ESLint 规则（6 error + 1 warn + 1 CI 同步） | 7.6 |
| D23 | 项目级扩展走 `recipes.project.css` | 7.8 |
