# 题集扩容（第一批 12 题）+ 交互序列评测基建 设计文档

> 日期：2026-08-28　状态：已确认
> 背景：glm-4.7 双臂 24 题复测中，pass@3 后两臂双双饱和（24/24），通过率指标失去区分度（见 eval/results/report-47-*-FINAL.json 与 report-47p3-*）。本设计扩容题集并扩展交互评测基建，重新获得教材增量（fewshot/system-prompt 教材 vs 无教材）的可测信号。

## 0. 已确认决策

| 决策点 | 结论 |
|---|---|
| 目标 | D 混合：A 类易错题（验证教材）+ B 类压难题（测能力上限/找教材盲区） |
| 规模与节奏 | C 分批：第一批 12 题（易错 6 + 压难 6），断言校准后再补第二批 |
| 被测模型 | glm-4.6v（弱模型区分度大）；有区分度的题用 4.7 抽查留档 |
| 交互基建 | B 最小扩展：asserts 增加线性 steps（click/fill/pressKey/waitFor），不做 agent 自主探索 |
| 成功判据 | D 复合：①A 类通过率净胜 ≥2 题 或 ②错误模式计数差 ≥3 次，任一达标即成立；轮数差作辅助证据 |

## 1. 题目构成（id 087–098）

沿用 prompts.jsonl 格式，新增 `difficulty` 字段（`trap` / `stress`）。题面措辞与现有 86 题风格一致，保持中性——不得暗示正确做法（诱导即失真）。

### A 类易错题 ×6（trap，每题对应教材反例区一个已登记错误模式）

| id | 考点（教材反例对应） | 场景 |
|---|---|---|
| 087 | 弹层需显式 open() | 支付页：af-picker 选银行卡 + af-number-keyboard 输金额，进页即弹键盘 |
| 088 | charts 必须子库引入 + registerChart | 报表页：af-chart-bar + af-chart-line 同屏各一组数据 |
| 089 | 漏 register 主入口 | 收货地址表单：af-field×4 + af-switch 默认项 + af-toast 保存反馈 |
| 090 | token-whitelist（禁 Tailwind 等） | 个人中心：navbar + tabbar + 原子类卡片布局（题面只给视觉描述不给 class） |
| 091 | 数组属性须 await register 后 JS 注入 | af-cascade-picker 省市区三级联动 + 确认回显 |
| 092 | 事件名契约 af-{组件}:{动作} | 审批流：af-steps + af-dialog 确认 + af-toast 结果通知 |

### B 类压难题 ×6（stress，全部依赖 steps 基建测行为链）

| id | 行为链 | 断言要点 |
|---|---|---|
| 093 | 购物车：列表勾选 → 合计联动 → 结算 dialog → toast | steps: click×N + 文案断言 |
| 094 | 登录表单：输入 → 校验错误提示 → 修正 → 成功提示 | fill + click + waitFor |
| 095 | 搜索：af-search-bar 输入 → 列表过滤 → 空态展示 | fill + DOM 数量断言 |
| 096 | af-stepper 选人数 → af-calendar 选日期 → 汇总 | click + 文案断言 |
| 097 | af-tabs 切换 → 三个面板按需渲染 | click×3 + 各面板断言 |
| 098 | af-pull-refresh + af-list 加载 | 滚动触发 + 加载态断言 |

断言两层：`expects`（组件升级完成）+ `asserts`（静态/交互后状态）。

## 2. steps 交互基建（visual.mjs 最小扩展）

### 2.1 DSL

asserts 数组内每条 assert 可选 `steps` 字段，语义：**按序执行完 steps 后，再对该条 assert 求值**。

```jsonc
{
  "sel": "af-toast",
  "visible": true,
  "steps": [
    { "action": "click",    "sel": "#cart-item-1" },
    { "action": "fill",     "sel": "af-search-bar input", "value": "手机" },
    { "action": "pressKey", "sel": "af-search-bar input", "key": "Enter" },
    { "action": "waitFor",  "sel": "af-toast", "timeout": 3000 }
  ]
}
```

| action | 实现 | 备注 |
|---|---|---|
| `click` | `el.click()`；shadow 内元素用现有 shadow-piercing 查询 | |
| `fill` | 赋 `value` property + 派发 `input`/`change` 事件 | 组件靠事件响应，必须派发 |
| `pressKey` | `dispatchEvent(new KeyboardEvent(...))` | 补 fill 不够的场景 |
| `waitFor` | 轮询 selector 出现/可见，默认超时 3s | 异步链路必需 |

### 2.2 设计约束

- steps 是 assert 局部的，非页面全局脚本——不同断言可走不同 steps，避免顺序耦合
- step 失败 = 该 assert 失败，错误信息含 step 序号与 action（如 `step#2 fill → af-search-bar input not found`），区分模型错 vs 基建错
- 截图时机：全部 asserts 求值后截一张终态图；调试期可加中间态开关
- 兼容：无 steps 的 assert 走现有逻辑，86 道旧题零改动
- 顺手项：把 af-number-keyboard 补进 visual.mjs 弹层强制打开名单（076 残留尾巴）

## 3. 复合判据（D）的计算

variant：`46v-trap-current` / `46v-trap-nofewshot`。flywheel.mjs 增加 `difficulty` 分组统计。

| 判据 | 达标线 | 来源 |
|---|---|---|
| ① A 类通过率净胜 | current 净胜 ≥2 题（6 道 trap） | report.byDifficulty |
| ② 错误模式计数差 | nofewshot 犯「教材反例区登记过的错误」比 current 多 ≥3 次 | 失败按错误模式标签归类 |
| ③ 轮数差（辅助） | 只记录，不作达标项 | attempts[].rounds |

**①或②任一达标 → 教材增量成立**；均不达标 → 「12 题规模下未检出增量」，并用错误模式分布决定教材下一轮补什么。

错误模式标签（写死在 judge.mjs，与教材反例区同步登记）：漏-register / 错误引路（主入口引子库）/ 弹层未开 / token 越界 / 事件名错 / 数组属性时机错。

## 4. 执行流程

```
Day 1  ① visual.mjs 补 af-number-keyboard 强开名单
       ② 实现 steps DSL + 单测（mock 页面验证 4 种 action）
       ③ 写 12 题 + --dry-run 校验 prompts.jsonl
Day 2  ④ 4.6v 跑 A 类校准批（--ids 087-092，纯静态断言，快速验题）
       ⑤ 修断言/基建问题，失败题复跑确认基建无误
       ⑥ 跑 B 类（093-098，验证 steps 全链路）
Day 3  ⑦ 两臂全量正式跑 + flywheel 复合判据报告
       ⑧ 有区分度的题用 4.7 抽查留档，出结论
```

门禁关联：visual.mjs / judge.mjs 改动 → ESLint + vitest（judge 补 steps 解析用例）；prompts.jsonl → `--dry-run`；不触碰 src/ 与 prompt/，prompt 快照不受影响。

## 5. 边界与不做的事

- 不改被测库 src/ 一行代码；教材缺口只改 prompt/ 层
- 不做 agent 自主探索交互
- steps 不做条件分支/循环——线性序列覆盖当前 6 道压难题，出现循环需求再扩展（YAGNI）
- 残留评测产物（074/083/raw-nofewshot-47 改动）与本设计无关，另行处理
