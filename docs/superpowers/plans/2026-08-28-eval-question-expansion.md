# 题集扩容（第一批 12 题）+ 交互序列评测基建 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 087–098 共 12 道评测题（6 trap + 6 stress），并为 visual.mjs 实现线性 steps 交互断言（click/fill/pressKey/scroll/waitFor），judge 输出 byDifficulty 与错误模式标签，verdict.mjs 输出复合判据结论。

**Architecture:** steps 以「assert 局部前置动作」实现于 `eval/visual.mjs` 的 renderCapture（每条 assert 先执行 steps 再求值）；纯函数（校验/错误格式化/错误模式归类/判据比较）拆到 `eval/steps.mjs`、`eval/judge.mjs`、`eval/verdict.mjs` 便于 vitest 直测；不改被测库 src/。

**Tech Stack:** Node ESM 脚本 + Playwright（chromium）+ vitest + ESLint（af-mobile 规则，0 warning 门禁）。

**对 spec 的三处修订（随 Task 0 更新 spec 文档）：**
1. §2.1 动作表增加第 5 个原语 `scroll`（098 上拉加载需要；spec 原 4 个）
2. §2.2 删除「af-number-keyboard 补进强开名单」顺手项——强开会掩盖「弹层未开」考点（087/076 类题的检测前提是基建**不**代开）
3. §2 新增 `noAutoOpen` 题级字段：stress 题（093–098）声明后，renderCapture 跳过弹层强制打开与 dialog 升级等待，否则交互链被基建代开污染；§3 判据数据来源从 flywheel.mjs 改为 judge.mjs fullJudge 报告（flywheel 只消费 raw，读不到 report 聚合）

---

## Task 0: spec 文档同步修订

**Files:**
- Modify: `docs/superpowers/specs/2026-08-28-eval-question-expansion-design.md`

- [ ] **Step 1: 按「对 spec 的三处修订」更新 spec**

§2.1 表追加一行：`| scroll | window.scrollTo(0, top) 或滚动 sel 宿主/其 shadow 内滚动容器 | 098 上拉加载 |`。
§2.2 删除最后一行「顺手项：把 af-number-keyboard 补进 visual.mjs 弹层强制打开名单（076 残留尾巴）」，替换为：
`- 强开名单不新增 af-number-keyboard：强开会掩盖「弹层未开」考点（087/076 类题要求模型自己调 open()）`
`- 题级 noAutoOpen 字段：声明后 renderCapture 跳过弹层强开与升级等待（stress 题 093–098 使用，避免交互链被基建代开污染）`
§2.1 DSL 段补一句：`题级可选 "noAutoOpen":true`。
§3 判据表「来源」列：`report.byDifficulty` → `judge.mjs fullJudge 报告 byDifficulty`；`失败按错误模式标签归类` → `judge.mjs fullJudge 报告 errorModes`。

- [ ] **Step 2: 提交**

```bash
git add docs/superpowers/specs/2026-08-28-eval-question-expansion-design.md
git commit -m "docs: spec 修订——scroll 原语/取消键盘强开/新增 noAutoOpen"
```

---

## Task 1: eval/steps.mjs 纯函数模块（TDD）

**Files:**
- Create: `eval/steps.mjs`
- Test: `test/eval-steps.test.js`

- [ ] **Step 1: 写失败测试**

```js
// test/eval-steps.test.js
import { describe, it, expect } from 'vitest';
import { STEP_ACTIONS, validateSteps, formatStepError } from '../eval/steps.mjs';

describe('eval steps DSL', () => {
  it('STEP_ACTIONS 含 5 个原语', () => {
    expect(STEP_ACTIONS).toEqual(['click', 'fill', 'pressKey', 'scroll', 'waitFor']);
  });

  it('合法 steps 通过校验', () => {
    expect(() => validateSteps([
      { action: 'click', sel: '#ck-2' },
      { action: 'fill', sel: 'af-search-bar input', value: '果' },
      { action: 'pressKey', sel: 'af-search-bar input', key: 'Enter' },
      { action: 'scroll', top: 9999 },
      { action: 'waitFor', sel: 'af-toast', timeout: 3000 },
    ])).not.toThrow();
  });

  it('未知 action 抛错', () => {
    expect(() => validateSteps([{ action: 'hover', sel: '#x' }])).toThrow(/未知 action/);
  });

  it('缺必填字段抛错（fill 缺 value / pressKey 缺 key / click 缺 sel）', () => {
    expect(() => validateSteps([{ action: 'fill', sel: '#x' }])).toThrow(/value/);
    expect(() => validateSteps([{ action: 'pressKey', sel: '#x' }])).toThrow(/key/);
    expect(() => validateSteps([{ action: 'click' }])).toThrow(/sel/);
  });

  it('formatStepError 带序号/action/首行错误', () => {
    const msg = formatStepError(1, { action: 'fill', sel: '#user', value: 'x' }, new Error('a\nb'));
    expect(msg).toBe('step#2 fill "#user" → a');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/eval-steps.test.js`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 eval/steps.mjs**

```js
// eval/steps.mjs —— 交互断言 steps DSL 纯函数（执行器在 visual.mjs，本文件只做校验与错误格式化，便于单测）
export const STEP_ACTIONS = ['click', 'fill', 'pressKey', 'scroll', 'waitFor'];

// 每个 action 的必填字段
const REQUIRED = {
  click: ['sel'],
  fill: ['sel', 'value'],
  pressKey: ['sel', 'key'],
  scroll: [],            // sel/top 均可选：缺省滚 window
  waitFor: ['sel'],
};

export function validateSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) throw new Error('steps 必须是非空数组');
  steps.forEach((s) => {
    if (!s || !STEP_ACTIONS.includes(s.action)) throw new Error(`未知 action: ${s && s.action}`);
    for (const f of REQUIRED[s.action]) {
      if (s[f] === undefined) throw new Error(`action=${s.action} 缺少必填字段 ${f}`);
    }
  });
}

export function formatStepError(index, step, err) {
  const sel = step.sel ? ` "${step.sel}"` : '';
  const reason = String(err && err.message ? err.message : err).split('\n')[0];
  return `step#${index + 1} ${step.action}${sel} → ${reason}`;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run test/eval-steps.test.js`
Expected: PASS（6 用例）

- [ ] **Step 5: 提交**

```bash
git add eval/steps.mjs test/eval-steps.test.js
git commit -m "feat: eval steps DSL 校验与错误格式化纯函数"
```

---

## Task 2: visual.mjs 执行 steps + noAutoOpen

**Files:**
- Modify: `eval/visual.mjs`（renderCapture 内，约 L96–L217）

- [ ] **Step 1: 顶部导入与执行器**

在 `import { chromium } from 'playwright';` 之后加：

```js
import { validateSteps, formatStepError } from './steps.mjs';
```

在 `export async function renderCapture(...)` 前加执行器（模块级函数）：

```js
// 执行一条 assert 的 steps 序列；全部成功返回 null，失败返回错误描述
// click 用 locator.click()（真实坐标点击，穿透 shadow 命中内部元素），禁 evaluate(el.click())——宿主合成点击不触发 shadow 内监听
async function runSteps(page, steps) {
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    try {
      if (s.action === 'click') {
        await page.locator(s.sel).first().click({ timeout: 2000 });
      } else if (s.action === 'fill') {
        // 赋 value 后派发 input/change；宿主无 value 时穿透 light/shadow 找 input/textarea
        await page.locator(s.sel).first().evaluate((el, v) => {
          const t = 'value' in el ? el
            : el.querySelector('input,textarea') || (el.shadowRoot && el.shadowRoot.querySelector('input,textarea')) || el;
          t.value = v;
          t.dispatchEvent(new Event('input', { bubbles: true }));
          t.dispatchEvent(new Event('change', { bubbles: true }));
        }, s.value);
      } else if (s.action === 'pressKey') {
        await page.locator(s.sel).first().evaluate((el, k) => {
          for (const type of ['keydown', 'keypress', 'keyup']) {
            el.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true }));
          }
        }, s.key);
      } else if (s.action === 'scroll') {
        // sel 缺省滚 window；给 sel 时滚该元素（无滚动高度则尝试 shadow 内首个可滚动容器）
        await page.evaluate(({ sel, top }) => {
          if (!sel) { window.scrollTo(0, top); return; }
          const el = document.querySelector(sel);
          if (!el) throw new Error(sel + ' not found');
          const scrollers = [el, ...(el.shadowRoot ? [...el.shadowRoot.querySelectorAll('*')] : [])]
            .filter((n) => n.scrollHeight > n.clientHeight + 1);
          if (!scrollers.length) throw new Error(sel + ' 无可滚动容器');
          scrollers[0].scrollTop = top;
        }, { sel: s.sel, top: s.top ?? 9999 });
      } else if (s.action === 'waitFor') {
        await page.waitForSelector(s.sel, { state: 'visible', timeout: s.timeout || 3000 });
      }
    } catch (e) {
      return formatStepError(i, s, e);
    }
  }
  return null;
}
```

- [ ] **Step 2: renderCapture 支持 noAutoOpen + assert 求值前跑 steps**

`renderCapture(htmlPath, expects, { port, outDir })` 签名改为 `renderCapture(htmlPath, expects, { port, outDir, noAutoOpen = false })`。

强开弹层代码块（L156–L168 的 waitForFunction + 强开 evaluate + `waitForTimeout(300)`）整体包进条件：

```js
    // 等待弹层类组件完成升级（源码直引时 register 为异步链，未 upgrade 时 open() 调用无效）
    // noAutoOpen：交互断言题跳过强开——基建代开会掩盖「弹层未开/未接线」考点
    if (!noAutoOpen) {
      await page.waitForFunction(/* 原有代码不动 */).catch(() => {});
      await page.evaluate(/* 原有强开代码不动 */).catch(() => {});
      await page.waitForTimeout(300);
    }
```

assert 求值循环（`for (const a of asserts)`）开头、`const n = await page.locator(a.sel)...` 之前插入：

```js
      if (a.steps) {
        try { validateSteps(a.steps); } catch (e) { fails.push(`${a.sel} steps 非法: ${e.message}`); continue; }
        const stepErr = await runSteps(page, a.steps);
        if (stepErr) { fails.push(`${a.sel} ${stepErr}`); continue; }
      }
```

- [ ] **Step 3: 门禁**

Run: `npx eslint eval/ --max-warnings 0; npx vitest run test/eval-steps.test.js`
Expected: ESLint 0 警告；测试 PASS

- [ ] **Step 4: 提交**

```bash
git add eval/visual.mjs
git commit -m "feat: visual.mjs 支持交互断言 steps（click/fill/pressKey/scroll/waitFor）与题级 noAutoOpen"
```

---

## Task 3: judge.mjs — byDifficulty 分组 + 错误模式标签（TDD）

**Files:**
- Modify: `eval/judge.mjs`
- Test: `test/eval-judge-modes.test.js`

- [ ] **Step 1: 写失败测试**

```js
// test/eval-judge-modes.test.js
import { describe, it, expect } from 'vitest';
import { tagErrorModes } from '../eval/judge.mjs';

describe('judge 错误模式标签', () => {
  it('lint 错误归类：token 越界 / 事件名错 / 错误引路', () => {
    const modes = tagErrorModes(
      [{ errors: [
        { rule: 'af-mobile/token-whitelist', message: "Class 'h-full' not in whitelist" },
        { rule: 'af-mobile/wc-event-naming', message: '事件名必须 af-x:y' },
        { rule: 'af-mobile/semantic-visual', message: "The requested module '/af-mobile.js' does not provide an export named 'registerChart'" },
      ] }],
      [],
    );
    expect(modes).toEqual({ 'token 越界': 1, '事件名错': 1, '错误引路': 1 });
  });

  it('视觉失败归类：弹层组件不可见=弹层未开，普通组件不可见/缺少=漏-register', () => {
    const modes = tagErrorModes([], [
      { fails: ['af-number-keyboard 不可见', 'af-tabbar 不可见', '缺少 af-toast'] },
    ]);
    expect(modes).toEqual({ '弹层未开': 1, '漏-register': 2 });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/eval-judge-modes.test.js`
Expected: FAIL（tagErrorModes 不存在）

- [ ] **Step 3: judge.mjs 实现纯函数 + loadPromptMap 扩展 + fullJudge 聚合**

在 judge.mjs 的 `judge()` 函数之后追加（judgeVisual 之前）：

```js
// ===== 错误模式标签：把 lint/视觉失败归到教材反例区登记的错误模式（与 prompt 反例区同步维护）=====
const POPOVER_TAGS = ['af-dialog', 'af-action-sheet', 'af-picker', 'af-cascade-picker', 'af-number-keyboard', 'af-dropdown'];
export function tagErrorModes(lintFailures = [], visualResults = []) {
  const modes = {};
  const bump = (l) => { modes[l] = (modes[l] || 0) + 1; };
  for (const f of lintFailures) {
    for (const e of f.errors || []) {
      const msg = e.message || '';
      if (e.rule === 'af-mobile/token-whitelist') bump('token 越界');
      else if (e.rule === 'af-mobile/wc-event-naming') bump('事件名错');
      else if (/export named 'register(Chart|Chat)'/.test(msg)) bump('错误引路');
      else if (e.rule === 'af-mobile/semantic-visual') bump(/不可见/.test(msg) ? '漏-register' : '漏-register');
    }
  }
  for (const v of visualResults) {
    for (const f of v.fails || []) {
      const tag = (f.split(' ')[0] || '').replace(/:not.*/, '');
      if (/不可见/.test(f) && POPOVER_TAGS.includes(tag)) bump('弹层未开');
      else if (/不可见|缺少/.test(f)) bump('漏-register');
    }
  }
  return modes;
}
```

`loadPromptMap()` 的 map 值加 difficulty：`if (o.id) map[o.id] = { prompt: o.prompt || '', expects: o.expects || [], asserts: o.asserts || [], difficulty: o.difficulty || 'none', noAutoOpen: o.noAutoOpen === true };`

`judgeVisual` 中 renderCapture 调用传 noAutoOpen：

```js
      const dom = await renderCapture(r.best.codePath, [...(r.expects || []), ...semantic], { port, outDir: shotsDir, noAutoOpen: p.noAutoOpen === true });
```

`fullJudge` 在合并 byCategory 之后、return 之前追加：

```js
  // difficulty 分组（trap/stress/none）+ 错误模式标签
  const promptMap = opts.promptMap || loadPromptMap();
  const byDifficulty = {};
  for (const r of results) {
    const d = (promptMap[r.id] || {}).difficulty || 'none';
    if (!byDifficulty[d]) byDifficulty[d] = { total: 0, lintPassed: 0, visualPassed: 0 };
    byDifficulty[d].total++;
    if (r.passed) byDifficulty[d].lintPassed++;
  }
  for (const v of visual.visualResults) {
    const item = results.find((x) => x.id === v.id);
    const d = item ? ((promptMap[item.id] || {}).difficulty || 'none') : 'none';
    if (v.passed && byDifficulty[d]) byDifficulty[d].visualPassed++;
  }
  const errorModes = tagErrorModes(lint.lintFailures, visual.visualResults);
```

return 行改为：`return { ...lint, ...visual, byCategory, byDifficulty, errorModes };`

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run test/eval-judge-modes.test.js`
Expected: PASS

- [ ] **Step 5: 门禁 + 提交**

Run: `npx eslint eval/ --max-warnings 0; npx vitest run`

```bash
git add eval/judge.mjs test/eval-judge-modes.test.js
git commit -m "feat: judge 输出 byDifficulty 分组与错误模式标签；renderCapture 透传 noAutoOpen"
```

---

## Task 4: eval/verdict.mjs 复合判据（TDD）

**Files:**
- Create: `eval/verdict.mjs`
- Test: `test/eval-verdict.test.js`

- [ ] **Step 1: 写失败测试**

```js
// test/eval-verdict.test.js
import { describe, it, expect } from 'vitest';
import { compareVerdict } from '../eval/verdict.mjs';

const report = (trapWin, trapLose, modes) => ({ byDifficulty: { trap: { total: 6, visualPassed: trapWin } }, errorModes: modes });

describe('复合判据', () => {
  it('判据①：trap 净胜 ≥2 成立', () => {
    const v = compareVerdict(report(5, 0, {}), report(3, 0, {}));
    expect(v.trapNetWin).toBe(2);
    expect(v.passed).toBe(true);
    expect(v.reasons).toContain('①A类trap净胜2题≥2');
  });

  it('判据②：错误模式计数差 ≥3 成立', () => {
    const v = compareVerdict(report(3, 0, {}), report(3, 0, { '漏-register': 4, '弹层未开': 1 }));
    expect(v.modeDiff).toBe(5);
    expect(v.passed).toBe(true);
  });

  it('双不达标不成立', () => {
    const v = compareVerdict(report(3, 0, { 'token 越界': 2 }), report(4, 0, { 'token 越界': 1 }));
    expect(v.passed).toBe(false);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/eval-verdict.test.js`
Expected: FAIL

- [ ] **Step 3: 实现 eval/verdict.mjs**

```js
// eval/verdict.mjs —— 教材增量复合判据（spec §3）
// ① current 在 trap 题上视觉净胜 ≥2 题，或 ② nofewshot 臂错误模式计数比 current 多 ≥3 次 → 增量成立
// 用法：node eval/verdict.mjs eval/results/report-46v-trap-current.json eval/results/report-46v-trap-nofewshot.json
export function compareVerdict(current, base) {
  const trapC = (current.byDifficulty && current.byDifficulty.trap?.visualPassed) || 0;
  const trapB = (base.byDifficulty && base.byDifficulty.trap?.visualPassed) || 0;
  const trapNetWin = trapC - trapB;
  const labels = new Set([...Object.keys(current.errorModes || {}), ...Object.keys(base.errorModes || {})]);
  let modeDiff = 0;
  const modeDetail = {};
  for (const l of labels) {
    const d = (base.errorModes?.[l] || 0) - (current.errorModes?.[l] || 0);
    modeDetail[l] = d;
    if (d > 0) modeDiff += d;
  }
  const reasons = [];
  if (trapNetWin >= 2) reasons.push(`①A类trap净胜${trapNetWin}题≥2`);
  if (modeDiff >= 3) reasons.push(`②错误模式计数差${modeDiff}次≥3`);
  return { trapNetWin, modeDiff, modeDetail, reasons, passed: reasons.length > 0 };
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('eval/verdict.mjs');
if (isMain) {
  const { readFileSync } = await import('node:fs');
  const [cur, base] = process.argv.slice(2);
  if (!cur || !base) { console.error('用法: node eval/verdict.mjs <report-current.json> <report-nofewshot.json>'); process.exit(2); }
  const v = compareVerdict(JSON.parse(readFileSync(cur, 'utf8')), JSON.parse(readFileSync(base, 'utf8')));
  console.log(JSON.stringify(v, null, 2));
  console.error(v.passed ? `✓ 教材增量成立：${v.reasons.join('；')}` : `✗ 12 题规模下未检出增量（trap 净胜 ${v.trapNetWin}，模式差 ${v.modeDiff}）`);
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run test/eval-verdict.test.js`
Expected: PASS

- [ ] **Step 5: 门禁 + 提交**

Run: `npx eslint eval/ --max-warnings 0; npx vitest run`

```bash
git add eval/verdict.mjs test/eval-verdict.test.js
git commit -m "feat: verdict 复合判据——trap 净胜或错误模式计数差任一达标即成立"
```

---

## Task 5: 写入 12 道新题（prompts.jsonl 087–098）

**Files:**
- Modify: `eval/prompts.jsonl`（文件末尾追加 12 行）

- [ ] **Step 1: 追加以下 12 行（单行 JSON，原样粘贴）**

```
{"id":"087","category":"form","difficulty":"trap","prompt":"收银台页：af-navbar 标题「收银台」+ 订单金额 ¥256.00；af-picker 选择银行卡（columns 二维数组：['招商银行','工商银行','建设银行']）；af-number-keyboard（random）输入 6 位支付密码，输满触发 complete 后 af-toast.show() 提示「支付成功」；进入页面即弹出数字键盘供输入","expects":["af-navbar","af-picker","af-number-keyboard","af-toast"],"asserts":[{"sel":"af-number-keyboard","visible":true},{"sel":"af-picker","visible":true},{"sel":"af-navbar","visible":true}]}
{"id":"088","category":"detail","difficulty":"trap","prompt":"周报数据页：af-navbar 标题「周报」；两张 .card 卡片上下排布：上卡 af-chart-bar（labels：周一到周日，series 名「销量」一组数值），下卡 af-chart-line（labels 同上，series 名「访问量」，variant=area）","expects":["af-navbar","af-chart-bar","af-chart-line"],"asserts":[{"sel":"af-chart-bar","visible":true},{"sel":"af-chart-line","visible":true},{"sel":"af-navbar","visible":true}]}
{"id":"089","category":"form","difficulty":"trap","prompt":"收货地址编辑页：af-field 四项（label：收货人/手机号/所在地区/详细地址）+ af-switch「设为默认地址」默认开启 + 底部「保存」按钮，点击后 af-toast 提示「已保存」","expects":["af-field","af-switch","af-toast"],"asserts":[{"sel":"af-field","count":4},{"sel":"af-switch","visible":true},{"sel":"af-toast"}]}
{"id":"090","category":"detail","difficulty":"trap","prompt":"个人中心页：af-navbar 标题「我的」；头部卡片：圆形头像区（品牌色边框）+ 用户名「柚子」+ 三列统计横排（收藏 128 / 关注 56 / 粉丝 1024，数字加粗、品牌色）；下方通用列表三项（收货地址/我的订单/客服中心，每项右箭头）；吸底 af-tabbar 四个标签（首页/分类/购物车/我的，当前「我的」高亮）","expects":["af-navbar","af-tabbar"],"asserts":[{"sel":"af-navbar","visible":true},{"sel":"af-tabbar","visible":true}]}
{"id":"091","category":"form","difficulty":"trap","prompt":"地址选择页：af-cascade-picker（title 选择地区，tree：浙江省→杭州市/宁波市，广东省→广州市）；确认选择后把选中的省市回显到页面 .caption 节点（文案含省市名）","expects":["af-cascade-picker"],"asserts":[{"sel":"af-cascade-picker","visible":true}]}
{"id":"092","category":"detail","difficulty":"trap","prompt":"审批详情页：af-steps（提交申请→部门审批→财务审批→已通过，当前进行到第 2 步）；审批意见 af-field（type=textarea）；底部「同意」按钮：点击弹 af-dialog（标题「确认同意」）二次确认，确认后 af-toast 提示「已通过」","expects":["af-steps","af-field","af-dialog","af-toast"],"asserts":[{"sel":"text=已通过","steps":[{"action":"click","sel":"button:has-text(\"同意\")"},{"action":"click","sel":"af-dialog >> button:has-text(\"确定\")"},{"action":"waitFor","sel":"text=已通过"}]}]}
{"id":"093","category":"complex","difficulty":"stress","noAutoOpen":true,"prompt":"购物车页：3 件商品列表（每项 .list-item 内：名称 + 单价 .caption）+ 每项 af-switch（id：ck-1/ck-2/ck-3，第 1 项默认选中）；单价分别为 88.00/66.00/45.00；顶部合计金额节点 id=\"total\"（初始显示 88.00），勾选变化实时联动；「去结算」按钮 id=\"checkout\"，点击弹 af-dialog 确认（含合计金额），确认后 af-toast 提示「下单成功」","expects":["af-switch","af-dialog","af-toast"],"asserts":[{"sel":"#total","text":"88.00"},{"sel":"#total","text":"154.00","steps":[{"action":"click","sel":"#ck-2"}]},{"sel":"af-dialog","visible":true,"steps":[{"action":"click","sel":"#checkout"}]},{"sel":"text=下单成功","steps":[{"action":"click","sel":"#checkout"},{"action":"click","sel":"af-dialog >> button:has-text(\"确定\")"},{"action":"waitFor","sel":"text=下单成功"}]}]}
{"id":"094","category":"form","difficulty":"stress","noAutoOpen":true,"prompt":"登录页：af-field 手机号 id=\"user\"（placeholder 请输入手机号）+ af-field 密码 id=\"pass\"（input-type=password）+ 登录按钮 id=\"login\"；空表单点击登录：手机号 af-field 显示错误提示「请输入用户名或手机号」；输入手机号 13800000000 与密码 123456 后点击登录：af-toast 提示「登录成功」","expects":["af-field","af-toast"],"asserts":[{"sel":"text=请输入用户名或手机号","steps":[{"action":"click","sel":"#login"}]},{"sel":"text=登录成功","steps":[{"action":"fill","sel":"#user","value":"13800000000"},{"action":"fill","sel":"#pass","value":"123456"},{"action":"click","sel":"#login"},{"action":"waitFor","sel":"text=登录成功"}]}]}
{"id":"095","category":"list","difficulty":"stress","noAutoOpen":true,"prompt":"搜索页：af-search-bar（placeholder 搜索商品）+ 商品列表 .list（.list-item 共 6 项：苹果/芒果/草莓/香蕉/柠檬/蓝莓）；输入关键字实时过滤（input 事件即可，无需等防抖），只显示名称含关键字的项；无匹配项时显示空态节点 id=\"empty\"（文案「没有找到相关商品」）","expects":["af-search-bar"],"asserts":[{"sel":".list-item","count":6},{"sel":".list-item","count":2,"steps":[{"action":"fill","sel":"af-search-bar input","value":"果"}]},{"sel":"#empty","visible":true,"steps":[{"action":"fill","sel":"af-search-bar input","value":"榴莲"}]}]}
{"id":"096","category":"complex","difficulty":"stress","noAutoOpen":true,"prompt":"会务预订页：af-stepper id=\"people\"（value=1，min=1，max=10）选择人数；af-calendar id=\"cal\" 选择日期（默认当月）；汇总节点 id=\"summary\" 实时显示「N 人 · YYYY-MM-DD」（如 3 人 · 2026-09-01），人数或日期任一变化立即更新","expects":["af-stepper","af-calendar"],"asserts":[{"sel":"#summary","text":"1 人"},{"sel":"#summary","text":"3 人","steps":[{"action":"fill","sel":"af-stepper","value":"3"}]},{"sel":"#summary","text":"15","steps":[{"action":"click","sel":"af-calendar >> text=15"}]}]}
{"id":"097","category":"nav","difficulty":"stress","noAutoOpen":true,"prompt":"内容中心页：af-tabs id=\"tt\" 三个标签（推荐/关注/热榜）+ 三个内容面板 section（id：panel-1/panel-2/panel-3，各含一句文案），切换标签只显示对应面板（默认显示推荐）","expects":["af-tabs"],"asserts":[{"sel":"#panel-1","visible":true},{"sel":"#panel-3","visible":true,"steps":[{"action":"click","sel":"af-tabs >> text=热榜"}]}]}
{"id":"098","category":"list","difficulty":"stress","noAutoOpen":true,"prompt":"信息流页：af-pull-refresh 包裹 af-list id=\"list\"；初始 5 条数据（title：信息 1 到 信息 5），滚动到底触发 loadmore 追加 5 条（信息 6 到 信息 10），追加完成后节点 id=\"more\"（.caption）文案变为「已加载全部 10 条」","expects":["af-pull-refresh","af-list"],"asserts":[{"sel":"af-list .list-item","count":5},{"sel":"af-list .list-item","count":10,"steps":[{"action":"scroll","sel":"af-list","top":9999}]},{"sel":"#more","text":"已加载全部 10 条","steps":[{"action":"scroll","sel":"af-list","top":9999},{"action":"waitFor","sel":"#more"}]}]}
```

- [ ] **Step 2: dry-run 校验格式**

Run: `npm run eval:dry`
Expected: `✓ dry-run：prompts.jsonl 格式正确`（94 条）

- [ ] **Step 3: 提交**

```bash
git add eval/prompts.jsonl
git commit -m "feat: 题集扩容第一批 12 题（trap 087-092 + stress 093-098）"
```

---

## Task 6: 校准批实测（glm-4.6v，人工盯跑）

**Files:** 无代码改动（发现问题回 Task 2/3/5 修）

- [ ] **Step 1: 切模型**

确认 Machine 级 `AFMOBILE_AI_MODEL=glm-4.6v`（PowerShell：`[Environment]::GetEnvironmentVariable('AFMOBILE_AI_MODEL','Machine')`，非 4.6v 则由用户改）。

- [ ] **Step 2: 跑 A 类校准批（纯静态断言，快速验题）**

```powershell
$env:AFMOBILE_AI_API_URL=[Environment]::GetEnvironmentVariable('AFMOBILE_AI_API_URL','Machine'); $env:AFMOBILE_AI_API_KEY=[Environment]::GetEnvironmentVariable('AFMOBILE_AI_API_KEY','Machine'); $env:AFMOBILE_AI_MODEL=[Environment]::GetEnvironmentVariable('AFMOBILE_AI_MODEL','Machine'); node eval/run.mjs --ids "087,088,089,090,091,092" --variant 46v-trap-current
```

随后 `node eval/judge.mjs eval/results/raw-46v-trap-current.json --visual`。
Expected: 每题 domPass 至少一条路径可判；断言错（基建问题）与模型错逐条区分记录。

- [ ] **Step 3: 跑 B 类（验证 steps 全链路）**

```powershell
node eval/run.mjs --ids "093,094,095,096,097,098" --variant 46v-trap-current
```

重点核验：steps 执行顺序、shadow 穿透选择器（`af-search-bar input`、`af-dialog >> button:has-text(...)`）、fill 派发事件是否驱动 af-field/af-stepper/af-search-bar、scroll 是否触发 af-list loadmore。steps 报错按 `step#N action → reason` 归因。

- [ ] **Step 4: 修基建 → 失败题复跑直到「基建零嫌疑」**

改断言/基建后仅重跑受影响 id（run.mjs --ids 覆写对应 k0 文件）。

- [ ] **Step 5: 两臂全量正式跑 + 判据**

```powershell
node eval/run.mjs --ids "087,088,089,090,091,092,093,094,095,096,097,098" --variant 46v-trap-nofewshot
node eval/judge.mjs eval/results/raw-46v-trap-current.json --visual
node eval/judge.mjs eval/results/raw-46v-trap-nofewshot.json --visual
node eval/verdict.mjs eval/results/report-46v-trap-current.json eval/results/report-46v-trap-nofewshot.json
```

Expected: verdict 输出 trapNetWin / modeDetail / passed，并落结论（4.7 抽查有区分度的题另存 47v-trap-* variant）。

- [ ] **Step 6: 全量门禁 + 归档提交**

```bash
npx eslint src/ test/ scripts/ e2e/ prompt/ eval/ mcp/ eslint-plugin-af-mobile/ adapters/ starter/src/ --max-warnings 0; npx vitest run
git add eval/ docs/superpowers/specs/
git commit -m "chore: 46v-trap 校准与双臂全量结果归档 + 复合判据结论"
```

---

## Self-Review 结论

- **Spec 覆盖**：§1 十二题→Task 5；§2 steps→Task 1/2（含 noAutoOpen）；§3 判据→Task 3/4；§4 流程→Task 6；§5 边界（不改 src/）全程未触碰。三处 spec 修订在 Task 0 同步。
- **占位符**：无 TBD/TODO；12 题题面与断言为完整可粘贴内容。
- **类型一致性**：`validateSteps/formatStepError`（Task 1）与 Task 2 调用一致；`tagErrorModes`（Task 3）与 Task 4 `compareVerdict` 消费的 `errorModes` 结构一致；`noAutoOpen` 贯穿 prompts.jsonl → loadPromptMap → renderCapture。
- **已知校准风险**（Task 6 逐一核验）：af-stepper 的 fill 赋值是否触发 change、af-calendar 文本点击是否派发 select、af-list loadmore 的滚动容器定位、`text=` 引擎对 shadow 内容的命中。
