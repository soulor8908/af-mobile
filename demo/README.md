# af-mobile Demo

af-mobile UI 的可交互 demo 站——原生 Web Components 优先，不用 Storybook。每个组件一页，配属性面板实时调参；另含全量范式页、性能监测、联动场景与交互调试台。

在线访问：<https://soulor8908.github.io/af-mobile/demo/index.html>

## 本地运行

```bash
npm run demo      # = vite，端口 5180，自动打开 /index.html
npm run demo:build   # 产物输出到 demo-dist/（用于 GitHub Pages 部署）
```

> **base 前缀坑**：`vite.config.js` 设 `base: '/af-mobile/demo/'`（为 GitHub Pages 子路径部署）。本地 dev 也吃这个前缀，访问地址是 `http://localhost:5180/af-mobile/demo/index.html`，不是根路径。
>
> **CSS 404 坑**：demo HTML 用 `<link href="../src/index.css">` 引用源码，但 `vite root=demo`，浏览器把相对路径按 URL 解析成 `/af-mobile/src/*`（base 上一层），dev server 默认不服务该路径 → 404。`vite.config.js` 的 `serveSrcOutsideRoot()` 中间件把 `/af-mobile/src/*` 映射回磁盘 `src/` 目录（带路径穿越防护），dev 才正常；build 时 Vite 按磁盘路径正常打包，生产不受影响。

## 目录结构

```
demo/
├── index.html              # 总入口：核心/交互/图表三类组件导航
├── kitchen-sink.html       # "云境咖啡"全量范式页（路由+状态+i18n+主题+按需注册）
├── perf.html               # web-vitals 性能监测
├── playground.html          # 交互调试台：手机壳 + props 面板，import.meta.glob 装载场景
├── props-panel.js           # 共享属性面板工厂（createPropsPanel），组件 demo 统一引用
├── components/              # 组件单页 demo（35 个，每组件一页）
│   ├── af-list.html
│   ├── af-dialog.html
│   └── ...                  # 命名约定：af-{组件}.html，与组件标签同名
├── scenarios/              # 场景配置（.js）+ 联动场景页（.html）
│   ├── af-list.js          #  playground.html 用 import.meta.glob('./scenarios/*.js') 静态装载
│   ├── af-toast.js         #  每个 .js default export 一个场景配置（见下方"场景配置协议"）
│   └── af-chart.html       #  图表 KPI 联动场景（独立入口，非 playground 装载）
└── playground/             # playground 多页入口（index.html + playground.css + playground.js）
```

## 五类入口

| 入口 | 文件 | 作用 |
|---|---|---|
| 组件单页 demo | `components/af-*.html` | 每组件一页：属性配置 + 事件演示 + 源码对照，挂 `props-panel.js` 实时调参 |
| 联动场景 | `scenarios/af-chart.html` | 图表 KPI 卡 + tabs 切换 + 主题切换 + reduced-motion |
| 全量范式页 | `kitchen-sink.html` | "云境咖啡"集成 demo：History 路由 + 信号状态 + i18n 中英切换 + 主题 + 按需注册 33 组件 + 5 图表 |
| 性能监测 | `perf.html` | web-vitals（LCP/FID/CLS 等）实时指标卡 |
| 交互调试台 | `playground.html` | 手机壳 + props 面板，`import.meta.glob` 装载 `scenarios/*.js` 场景 |

## 新增组件 demo

1. 在 `components/` 新建 `af-{组件}.html`，文件名必须与组件标签同名——`vite.config.js` 的 `componentInputs()` 自动扫描 `components/*.html` 收为 build 入口，**无需改配置**。
2. 在 `index.html` 对应分类（核心/交互/图表）下加一行 `<a class="cell" href="components/af-{组件}.html">`。
3. 引用源码用相对路径 `../../src/...`（组件实现）/ `../src/index.css`（样式）。
4. 属性面板复用共享工厂：`import { createPropsPanel } from '../props-panel.js'`。
5. 组件按需注册：`import { AfXxx } from '../../src/components/af-xxx.js'; customElements.define('af-xxx', AfXxx);`（禁止 `registerAll()` / UMD 直引，见主 README）。

## 约定

- **源码引用**：demo 是库开发态，直接 `import` 磁盘 `../src/` 源码（非 `@af-mobile/ui` 包名），改组件源码即时热更新。
- **组件注册**：组件单页 demo 与 `kitchen-sink.html` 按需注册本页用到的组件（铁律同消费端）；`playground.html` 是例外——它需按 URL 参数 `?c=af-xxx` 装载任意组件，故按场景 HTML 中出现的 af-* 标签动态 `register()`（charts/chat 等子库组件由各自场景模块自注册）。
- **主题防闪**：含交互的页面在 `<head>` 内联同步脚本先于 paint 读 localStorage 设 `data-theme`（见 `kitchen-sink.html` L9）。
- **场景配置协议**：`scenarios/af-{组件}.js` 的 default export 形如 `{ tag, name, scenarios: [{ name, html, main, props, events, styleTokens, init }] }`，`playground.html` 按文件名（`af-{组件}.js` ↔ `?c=af-{组件}`）匹配装载到手机壳内，props 控件复用 `props-panel.js` 的 schema 协议。
