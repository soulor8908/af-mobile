// L4 §4 ai-fix.mjs 3 轮修正流程测试
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCode, buildFixPrompt, runAiFixLoop } from '../scripts/ai-fix.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = join(ROOT, '.cache/ai-fix-tests');

// 写临时测试文件到 .cache/ai-fix-tests/（不被 git 跟踪，ESLint 仍能找到 ROOT 下的 flat config）
function writeTmp(name, content) {
  mkdirSync(TMP, { recursive: true });
  const p = join(TMP, name);
  writeFileSync(p, content);
  return p;
}

beforeEach(() => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe('ai-fix / extractCode', () => {
  it('JS 文件直接返回 raw，html 为 null', () => {
    const p = writeTmp('a.js', 'const x = 1;\n');
    const r = extractCode(p);
    expect(r.js).toBe('const x = 1;\n');
    expect(r.html).toBeNull();
  });

  it('mjs 文件同 JS 处理', () => {
    const p = writeTmp('a.mjs', 'export const y = 2;\n');
    const r = extractCode(p);
    expect(r.js).toBe('export const y = 2;\n');
    expect(r.html).toBeNull();
  });

  it('HTML 无 <script> → 只含 html literal', () => {
    const raw = '<div class="btn">x</div>';
    const p = writeTmp('a.html', raw);
    const r = extractCode(p);
    expect(r.html).toBe(raw);
    // js 应含 export const __html = JSON.stringify(raw)
    expect(r.js).toContain('export const __html =');
    expect(r.js).toContain('"<div class=\\"btn\\">x</div>"');
  });

  it('HTML 含 <script> → 提取 script + html literal', () => {
    const raw = '<script>const a = 1;</script>\n<div class="btn">x</div>';
    const p = writeTmp('a.html', raw);
    const r = extractCode(p);
    expect(r.html).toBe(raw);
    expect(r.js).toContain('const a = 1;');
    expect(r.js).toContain('export const __html =');
  });

  it('HTML 含多个 <script> 块 → 合并', () => {
    const raw = '<script>const a = 1;</script>\n<script>const b = 2;</script>';
    const p = writeTmp('a.html', raw);
    const r = extractCode(p);
    expect(r.js).toContain('const a = 1;');
    expect(r.js).toContain('const b = 2;');
    // 多 script 用 \n;\n 分隔
    expect(r.js).toMatch(/const a = 1;[^]*;\n[^]*const b = 2;/);
  });

  it('HTML 内反引号正确转义（JSON.stringify 处理）', () => {
    const raw = '<div class="btn">`backtick` content</div>';
    const p = writeTmp('a.html', raw);
    const r = extractCode(p);
    // js 是合法 JS（无未转义反引号）
    expect(r.js).toContain('export const __html =');
    expect(r.js).not.toMatch(/`[^`]*`[^`]*`[^`]*`/); // 不应出现成对未转义反引号
  });
});

describe('ai-fix / buildFixPrompt', () => {
  it('无 messages 也输出标题', () => {
    const p = buildFixPrompt([], '');
    expect(p).toContain('# 上次生成的代码违反以下 ESLint 规则');
    expect(p).toContain('请输出完整修正后的代码');
  });

  it('error 含规则名、行号、message、对应 hint', () => {
    const msgs = [{
      severity: 'error', line: 5, rule: 'af-mobile/token-whitelist',
      message: "Class 'custom-btn' not in whitelist",
    }];
    const p = buildFixPrompt(msgs, '');
    expect(p).toContain('## 错误 1（第 5 行）— af-mobile/token-whitelist');
    expect(p).toContain("Class 'custom-btn' not in whitelist");
    expect(p).toContain('【建议】');
    expect(p).toContain('该 class 不在白名单封闭集内');
  });

  it('warn 列出但不强制修改（截断到 5 条）', () => {
    const warns = Array.from({ length: 8 }, (_, i) => ({
      severity: 'warn', line: i + 1, rule: 'af-mobile/atomic-duplicate',
      message: `dup ${i}`,
    }));
    const p = buildFixPrompt(warns, '');
    expect(p).toContain('## 警告（8 条，可参考但不强制修改）');
    // 只列出前 5 条
    expect(p).toContain('dup 0');
    expect(p).toContain('dup 4');
    expect(p).not.toContain('dup 5');
  });

  it('未知规则使用 fallback hint', () => {
    const msgs = [{
      severity: 'error', line: 1, rule: 'af-mobile/unknown-rule', message: 'x',
    }];
    const p = buildFixPrompt(msgs, '');
    expect(p).toContain('（无具体建议，请查阅设计文档）');
  });

  it('每条已知规则都有对应 hint', () => {
    const knownRules = [
      'af-mobile/no-token-modification', 'af-mobile/no-inline-style', 'af-mobile/token-whitelist',
      'af-mobile/no-recipe-break', 'af-mobile/no-variant-conflict', 'af-mobile/no-arbitrary-value',
      'af-mobile/no-tailwind-syntax', 'af-mobile/prefer-component', 'af-mobile/atomic-duplicate',
      'af-mobile/wc-light-no-style', 'af-mobile/wc-shadow-use-token', 'af-mobile/wc-part-naming',
      'af-mobile/wc-event-naming', 'af-mobile/wc-aria-required', 'af-mobile/wc-cleanup',
    ];
    for (const rule of knownRules) {
      const p = buildFixPrompt([{ severity: 'error', line: 1, rule, message: 'x' }], '');
      expect(p).toContain('【建议】');
      // 不应出现 fallback 提示
      expect(p).not.toContain('无具体建议');
    }
  });
});

describe('ai-fix / runAiFixLoop', () => {
  it('无 ESLint error → 第 1 轮即通过', async () => {
    const p = writeTmp('clean.html', '<!doctype html>\n<div class="btn btn-block">OK</div>');
    const r = await runAiFixLoop(p, null);
    expect(r.ok).toBe(true);
    expect(r.rounds).toBe(1);
    expect(r.exitCode).toBe(0);
    expect(r.lastErrors).toEqual([]);
  });

  it('有 error 且无 llmCaller → 手动模式（exitCode=2，返回 systemPrompt+fixPrompt+originalCode）', async () => {
    const p = writeTmp('bad.html', '<div class="custom-btn">Bad</div>');
    const r = await runAiFixLoop(p, null);
    expect(r.ok).toBe(false);
    expect(r.exitCode).toBe(2);
    expect(r.rounds).toBe(1);
    expect(r.lastErrors.length).toBeGreaterThan(0);
    expect(r.fixPrompt).toContain('af-mobile/token-whitelist');
    expect(r.fixPrompt).toContain('custom-btn');
    expect(r.systemPrompt).toContain('af-mobile UI');
    expect(r.originalCode).toContain('custom-btn');
    // 不应修改原文件
    expect(readFileSync(p, 'utf8')).toBe('<div class="custom-btn">Bad</div>');
  });

  it('llmCaller 第 1 轮修复成功 → 第 2 轮通过', async () => {
    const p = writeTmp('bad.html', '<div class="custom-btn">Bad</div>');
    const fixedHtml = '<div class="btn">OK</div>';
    const llmCaller = async () => fixedHtml;
    const r = await runAiFixLoop(p, llmCaller);
    expect(r.ok).toBe(true);
    expect(r.rounds).toBe(2);
    expect(r.exitCode).toBe(0);
    // 原文件被覆写为修正后的代码
    expect(readFileSync(p, 'utf8')).toBe(fixedHtml);
  });

  it('llmCaller 3 轮都修不动 → exitCode=1，文件末尾打 AFMOBILE_LINT_FAILED 标记', async () => {
    const p = writeTmp('bad.html', '<div class="custom-btn">Bad</div>');
    // LLM 一直返回同样有问题的代码（无法修复）
    const llmCaller = async () => '<div class="another-bad">Still bad</div>';
    const r = await runAiFixLoop(p, llmCaller);
    expect(r.ok).toBe(false);
    expect(r.exitCode).toBe(1);
    expect(r.rounds).toBe(3);
    expect(r.lastErrors.length).toBeGreaterThan(0);
    const final = readFileSync(p, 'utf8');
    expect(final).toContain('<!-- AFMOBILE_LINT_FAILED');
    expect(final).toContain('another-bad');
  });

  it('llmCaller 抛异常 → exitCode=3，含 error 字段', async () => {
    const p = writeTmp('bad.html', '<div class="custom-btn">Bad</div>');
    const llmCaller = async () => { throw new Error('network down'); };
    const r = await runAiFixLoop(p, llmCaller);
    expect(r.ok).toBe(false);
    expect(r.exitCode).toBe(3);
    expect(r.error).toBe('network down');
  });

  it('llmCaller 返回空字符串 → exitCode=3，error="LLM 返回空内容"', async () => {
    const p = writeTmp('bad.html', '<div class="custom-btn">Bad</div>');
    const llmCaller = async () => '';
    const r = await runAiFixLoop(p, llmCaller);
    expect(r.ok).toBe(false);
    expect(r.exitCode).toBe(3);
    expect(r.error).toBe('LLM 返回空内容');
  });

  it('llmCaller 返回空白字符串 → 同上（空白也视为空）', async () => {
    const p = writeTmp('bad.html', '<div class="custom-btn">Bad</div>');
    const llmCaller = async () => '   \n  ';
    const r = await runAiFixLoop(p, llmCaller);
    expect(r.ok).toBe(false);
    expect(r.exitCode).toBe(3);
    expect(r.error).toBe('LLM 返回空内容');
  });

  it('llmCaller 返回代码块包裹的代码 → 提取代码块后写入', async () => {
    const p = writeTmp('bad.html', '<div class="custom-btn">Bad</div>');
    const llmCaller = async () => '```html\n<div class="btn">OK</div>\n```';
    const r = await runAiFixLoop(p, llmCaller);
    expect(r.ok).toBe(true);
    expect(r.rounds).toBe(2);
    // 写回的是代码块内容（不含 ```html / ``` 围栏）
    expect(readFileSync(p, 'utf8')).toBe('<div class="btn">OK</div>');
  });

  it('llmCaller 返回 javascript 围栏的代码 → 同样提取', async () => {
    const p = writeTmp('bad.js', 'const x = `<div class="custom"></div>`;\n');
    const llmCaller = async () => '```javascript\nconst x = `<div class="btn"></div>`;\n```';
    const r = await runAiFixLoop(p, llmCaller);
    expect(r.ok).toBe(true);
    expect(r.rounds).toBe(2);
    // 围栏内的代码（围栏尾部换行被剥离）
    expect(readFileSync(p, 'utf8')).toBe('const x = `<div class="btn"></div>`;');
  });

  it('JS 文件输入：error 同样触发修复流程', async () => {
    const p = writeTmp('bad.js', 'const html = `<div class="custom-btn">x</div>`;\n');
    const r = await runAiFixLoop(p, null);
    expect(r.ok).toBe(false);
    expect(r.exitCode).toBe(2);
    expect(r.fixPrompt).toContain('custom-btn');
  });

  it('连续 2 轮失败 + 第 3 轮成功 → ok=true, rounds=3', async () => {
    const p = writeTmp('bad.html', '<div class="custom-btn">Bad</div>');
    let calls = 0;
    const llmCaller = async () => {
      calls++;
      // 前 2 次返回错误代码，第 3 次返回正确代码
      if (calls < 3) return '<div class="bad-' + calls + '">still bad</div>';
      return '<div class="btn">OK</div>';
    };
    const r = await runAiFixLoop(p, llmCaller);
    expect(r.ok).toBe(true);
    expect(r.rounds).toBe(3);
    expect(r.exitCode).toBe(0);
    expect(readFileSync(p, 'utf8')).toBe('<div class="btn">OK</div>');
  });
});
