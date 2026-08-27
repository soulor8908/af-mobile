---
name: "af-mobile-r2"
description: "R2 k-vocabulary cross-model experiment collector. Collects ONE model family's data point per invocation: validity precheck, closed-book generation of t1-t5, save to results/<model>/, score with run.mjs, rework up to 3 rounds, append row to results/summary.md. Invoke when the user wants to collect an R2 data point (needs a FRESH session on an untested model family)."
---

# af-mobile R2 采集器 —— 单模型数据点采集

把「采一个模型的 R2 数据」变成确定性流程：**有效性自检 → 闭卷作答 → 落盘评分 → 返工 ≤3 轮 → 记录指标行**。
协议全文见 `experiments/r2/README.md`（本 skill 是其单模型执行视角）。单次调用只采集**一个条件臂**（A 或 B）；另一臂必须在**另一个全新会话**采集（顺序平衡：奇数序模型先 A 后 B，偶数先 B 后 A）。

## 0. 有效性前提（任一不满足 = 本次采集作废，直接终止并告知用户）

1. **全新会话**：本会话在收到本任务前没有接触过 k 相关材料（词表卡讲解 / src/k/ 源码 / 实验结论）。
2. **未测家族**：本会话的模型家族不在 `experiments/r2/results/summary.md` 已有行中。
3. **闭卷**：作答阶段被试只允许看到词表卡与任务卡两个文件的内容；禁止读取 `src/k/`、`test/k.test.js` 或其他 k 相关源码。
4. **禁元信息**：被试不得获知实验目的 / 对比假设 / B3 结论。

## 1. 采集模式（二选一）

**调度式（推荐，当前会话可能已接触 k 时唯一合法模式）**：
当前代理作编排者，派一个零上下文子代理作被试。子代理提示词 = 统一引导语 + 词表卡全文 + 任务卡全文 + 交付格式要求，并明确「不要使用任何工具、不要读取任何文件」。编排者自己**不得**代写答案。返工时把评分器输出原文 + 被试上一版代码回传给被试修复（子代理不可寻址时新建代理并附完整上下文，记入备注）。

**自管式（仅当本会话本身满足 §0 全部前提）**：
本代理自身作被试，直接读两卡作答。固有局限：被试经由本 skill 知晓实验存在性，元信息泄露风险高于人工贴卡协议（README §五仍是金标准），必须在备注中注明「自管式」。

## 2. 作答（闭卷）

1. 读条件卡：`experiments/r2/prompts/promptA.md`（A 臂）或 `experiments/r2/prompts/promptB.md`（B 臂）
2. 读任务卡：`experiments/r2/prompts/tasks.md`
3. 只依据两卡生成 t1.mjs ~ t5.mjs（每个导出 `mount(el, opts)`；禁止 af-* 组件；只输出代码不解释）

## 3. 落盘与评分

```bash
mkdir -p experiments/r2/results/<模型家族名>/solX   # X 为 A 或 B，如 solA
# 把 5 个生成文件原样写入（剥 markdown 围栏，禁止手工修改内容）
cd experiments/r2 && node run.mjs X all results/<模型家族名>/solX
```

## 4. 返工（每任务上限 3 轮）

评分失败时：把评分器输出**原文**与被试上一版失败文件一起回传，要求「修复失败项，只输出修改后的完整文件」，整文件重写后重新评分。
禁止：手工修码绕过、跳过任务、修改评分器或任务卡。

## 5. 指标与记录

- 一次通过率：首轮 SUMMARY 行 PASS 数 / 5
- 返工轮数：每任务通过前的返工次数（上限 3）
- 代码 tokens：两臂都完成后 `node tokens.mjs results/<模型>/solA results/<模型>/solB`
- 幻觉/回避：按 README §六人工判定（幻觉 = 卡外框架级 API；回避 = 核心 UI 逻辑绕开词表用原生 DOM）
- 追加一行到 `experiments/r2/results/summary.md`；采集方式、协议偏差、异常情况写入备注

## 6. 边界

- 单次采集**不做** H1/H2 判定（需 ≥4 异构家族全部回收，见 README §九）
- 不修改 `prompts/`、`run.mjs`、`runtime/`（改了 = 与 B3 基线不可比）
- 不修改 `results/` 中其他模型的已有行
