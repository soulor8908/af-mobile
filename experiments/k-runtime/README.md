# k-runtime 实验：词表卡运行时 + B3 密封对照

按 k 设计文档实现的最小响应式运行时（词表卡驱动 AI 编码），及其 AI 任务成本对照实验。**实验分支，不合入主线产品代码。**

## 内容

- `k-flow.js` — k 运行时实现（gzip 2.1KB）：`html\`\`` 四绑定 + `Show/For/Switch` + `render/clean`，响应式核心直接复用 `src/lib/state.js`（不重复造 signals）
- `wordcard.md` — 词表卡 v2（10 词，351 tokens）。目标：随包分发，替代 system-prompt 中运行时部分的 AI 教学
- `test.mjs` — 运行时自测（9 用例，jsdom）
- `b3/` — B3 密封双代理对照实验全量产物（任务卡、两臂 prompt、确定性评分器、两臂解、token 计量）

## B3 实验协议

两个密封子代理并行执行（互不知对方存在、不知这是对比实验、无会话上下文、禁止阅读运行时源码），唯一变量 = API 词表：

- **A 臂**：af-mobile 运行时速查（520 tokens，提取自 `prompt/system-prompt.md`：signal/effect + 手动 DOM 惯用法）
- **B 臂**：k 词表卡 v1（292 tokens，html 四绑定 + For/Show/Switch）

5 个相同任务（计数器/待办增删/异步五态/搜索过滤/表单预览），统一 `mount(el, opts)` 契约，jsdom 确定性交互断言评分，cl100k 分词计量。裁判 `run.mjs` 与运行时 md5 封存校验。

## 结果（2026-08-24，单模型家族，N=5）

| 指标 | A 现状速查 | B k 词表卡 | B/A |
|---|---|---|---|
| 首轮一次通过 | 5/5（零返工） | 5/5（零返工） | 持平 |
| 代码量 | 1197 tokens / 129 行 | 930 tokens / 85 行 | 77.7% |
| 会话成本（prompt+代码） | 1717 | 1222 | 71.2% |

词表卡 v2 微调后复测：B 代码 920 tokens、会话 1271（B/A 74.0%），方向不变。v1（作者在上下文内）与 v2（密封）两轮协议数字收敛（代码量 79.6% → 77.7%），说明节省是结构性的：声明式绑定消灭手动 DOM 同步样板（innerHTML 重拼、display 切换、按钮增删）。

## 实验产出的修订（已应用）

词表卡 v1 → v2（依据 B 臂代理自报的 8 处疑惑点）：

1. `For` 的 key 写明语义："字段名字符串，省略则以项本身为键"（原示例写死 `'id'`，迫使 string[] 数据强行 map）
2. `mount` → `render`：消除与页面契约导出 `mount(el, opts)` 的撞名（代理只能别名绕过）
3. 写明 `Show/For/Switch` 返回节点、可直接放 `${}` 子位
4. 写明 `signal.set` 后 DOM 同步更新、`effect` 创建即执行一次
5. `batch` 补一行说明（原在 import 清单却无解释，全程零使用的死词）；`Switch` 的 `def` 写明也是函数
6. 运行时 bug 修复：响应式子位 getter 返回数组时渲染多节点（原实现会 `String()` 成逗号文本）

## 局限（如实）

- **同模型家族**：密封消除了"看过实现"的偏差，消不掉"框架作者与被试代理同属一个模型"的分布优势。k 设计文档的 R2 风险（词表在训练分布外）未被证伪，下一步需异构模型按同协议重跑
- **N=5 且任务域窄**：纯运行时任务，无组件/CSS/路由/i18n，af-mobile 组件层与治理层优势未参与测试
- 体积参照：k-flow gzip 2.1KB（state 0.69 + 模板/控制流 1.44），k 设计文档"核心 ≤3KB"预算成立；对照组 Vue 3 约 13KB、Preact 约 4.5KB

## 复现

```bash
npm i -D jsdom gpt-tokenizer
node experiments/k-runtime/test.mjs            # 运行时自测 9 用例
cd experiments/k-runtime/b3
node run.mjs A all && node run.mjs B all       # B3 双臂评分（确定性断言）
node tokens.mjs                                # token 计量
```

## 对主线的建议（仅实验结论，未实施）

1. 词表卡随包分发：`wordcard.md` 可直接替换 system-prompt 的运行时切片（520 → 351 tokens，AI 产出代码 -23%）
2. `html\`\`` 四绑定协议可替换 `:bind` 字符串管道：绑定从运行时 regex 解析变为真实 JS 值，对 tsc/lint 可见
3. `createPage`/`:bind`/`data-ref` 为幽灵运行时（仓库自身 starter/demo/blocks 零使用），Phase 1 删除候选；导出面 48 符号 → 词表 10 词
4. `register()` 静态引用全量组件注册表导致 tree-shaking 失效（典型页 25.5KB vs 直注册 10.5KB gzip），与本次实验无关、可立即修复
