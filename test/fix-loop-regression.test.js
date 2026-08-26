// 修复循环回归：违规代码 → 修正 prompt 引导力验证（AGENTS §5.1 工作流第 3 步的质量闸门）
// 验证两点：
//   1. buildFixPrompt 对每条违规给出规则 ID + 行号 + 具体 RULE_HINTS 修正建议 + 保结构指令
//      （错误恢复表的实际引导力——AI 拿到 fixPrompt 应能定向修正而非重写整页）
//   2. RULE_HINTS 覆盖插件全部规则（新增规则忘补 hint → fixPrompt 退化为"无具体建议"弱引导，此测试拦下）
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAiFixLoop, RULE_HINTS } from '../scripts/ai-fix.mjs';
import plugin from '../eslint-plugin-af-mobile/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = join(ROOT, '.cache/fix-loop-tests');

// 典型违规样本：覆盖 AI 生成 HTML 的高频违规族
// error 族：白名单外 class / 内联 style / 配方破坏 / Tailwind 语法
// warn 族：互斥变体 / 原子重复 / emoji 图标
const BAD_HTML = [
  '<!doctype html>',
  '<html><body>',
  '<div class="page">',
  '  <button class="btn btn-sm btn-lg text-brand" style="padding: 16px;">购买</button>',
  '  <span class="tab-item">📋 首页</span>',
  '  <div class="my-custom-card p-4 p-2 md:hidden">内容</div>',
  '</div>',
  '</body></html>',
].join('\n');

// error 级违规：fixPrompt 必须带规则 ID + 具体修正建议
const ERROR_RULES = [
  'af-mobile/token-whitelist',     // my-custom-card
  'af-mobile/no-inline-style',     // style="padding: 16px"
  'af-mobile/no-recipe-break',     // btn + text-brand
  'af-mobile/no-tailwind-syntax',  // md:hidden
];
// warn 级违规：fixPrompt 至少列出规则 ID（供 AI 参考 + autofix 兜底）
const WARN_RULES = [
  'af-mobile/no-variant-conflict', // btn-sm + btn-lg
  'af-mobile/atomic-duplicate',    // p-4 + p-2
  'af-mobile/no-emoji-icon',       // 📋 当图标
];

beforeEach(() => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
});
afterEach(() => rmSync(TMP, { recursive: true, force: true }));

// ESLint snippet 落盘目录隔离：默认 .cache/ai-fix 会被并行测试文件（ai-fix.test.js）争抢删除
const ESLINT_OPTS = { tmpDir: join(TMP, 'eslint-snippet') };

describe('修复循环 / fixPrompt 引导力（错误恢复表回归）', () => {
  it('违规 HTML 的 fixPrompt 含全部违规规则 ID + 保结构指令', async () => {
    const f = join(TMP, 'bad.html');
    writeFileSync(f, BAD_HTML);
    const r = await runAiFixLoop(f, null, null, ESLINT_OPTS); // 手动模式：返回 fixPrompt 供断言
    expect(r.ok).toBe(false);
    expect(r.exitCode).toBe(2);
    expect(r.fixPrompt).toBeTruthy();
    // error 族：规则 ID 逐一出现
    for (const rule of ERROR_RULES) {
      expect(r.fixPrompt, rule).toContain(rule);
    }
    // warn 族：规则 ID 至少出现在警告区
    for (const rule of WARN_RULES) {
      expect(r.fixPrompt, rule).toContain(rule);
    }
    // 保结构指令：防 AI 修正时重写整页丢内容（原型返工的主因之一）
    expect(r.fixPrompt).toContain('只改违规点');
    expect(r.fixPrompt).toContain('保持不变');
  }, 30000);

  it('error 修正建议是具体映射而非"无具体建议"（RULE_HINTS 命中）', async () => {
    const f = join(TMP, 'bad2.html');
    writeFileSync(f, BAD_HTML);
    const r = await runAiFixLoop(f, null, null, ESLINT_OPTS);
    // token-whitelist：指向白名单替代（且不含过时的硬编码计数——白名单计数随版本变，硬编码必腐化）
    expect(r.fixPrompt).toContain(RULE_HINTS['af-mobile/token-whitelist']);
    expect(r.fixPrompt).toContain('白名单封闭集');
    expect(r.fixPrompt).not.toMatch(/不在 \d+ 白名单/);
    // no-inline-style：给 p-4 类映射
    expect(r.fixPrompt).toContain('p-4');
    // no-tailwind-syntax：指明禁用前缀语法
    expect(r.fixPrompt).toContain('Tailwind 前缀');
  }, 30000);

  it('干净代码不产出 fixPrompt（ok=true 短路）', async () => {
    const f = join(TMP, 'clean.html');
    writeFileSync(f, '<div class="card p-4"><button class="btn btn-block">确定</button></div>');
    const r = await runAiFixLoop(f, null, null, ESLINT_OPTS);
    expect(r.ok).toBe(true);
    expect(r.fixPrompt).toBeUndefined();
  }, 30000);
});

describe('修复循环 / RULE_HINTS 完整性（新增规则同步闸门）', () => {
  it('RULE_HINTS 覆盖插件全部规则（忘补 hint = 修正循环退化，此测试拦下）', () => {
    const missing = Object.keys(plugin.rules)
      .map(name => `af-mobile/${name}`)
      .filter(id => !RULE_HINTS[id] || !RULE_HINTS[id].trim());
    expect(missing).toEqual([]);
  });

  it('hint 文案不含硬编码白名单计数（计数随版本变，硬编码必腐化——曾出过 "115 白名单" 陈旧文案）', () => {
    for (const [rule, hint] of Object.entries(RULE_HINTS)) {
      expect(hint, rule).not.toMatch(/\d+ (个)?白名单/);
    }
  });
});
