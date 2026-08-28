// MCP Server 5 工具测试（全部零 LLM 配置）
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkCompliance, fixCode, generatePage, getPrompt, flywheelReport } from '../mcp/index.mjs';
import { readTelemetry, recordRun } from '../eval/telemetry.mjs';

let tmpDir;
let savedTelemetryDir;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'af-mobile-mcp-'));
  savedTelemetryDir = process.env.AFMOBILE_TELEMETRY_DIR;
  process.env.AFMOBILE_TELEMETRY_DIR = tmpDir;
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  if (savedTelemetryDir === undefined) delete process.env.AFMOBILE_TELEMETRY_DIR;
  else process.env.AFMOBILE_TELEMETRY_DIR = savedTelemetryDir;
});

describe('MCP / check_compliance', () => {
  it('违规代码返回 errors（自定义 class + 内联 style）', async () => {
    const r = await checkCompliance({ code: '<div class="my-btn" style="color:red">x</div>' });
    expect(r.passed).toBe(false);
    expect(r.errorCount).toBeGreaterThan(0);
    const rules = r.errors.map(e => e.rule);
    expect(rules).toContain('af-mobile/token-whitelist');
    expect(rules).toContain('af-mobile/no-inline-style');
  });

  it('合规代码 passed=true', async () => {
    const r = await checkCompliance({ code: '<div class="card p-4">x</div>' });
    expect(r.errorCount).toBe(0);
    expect(r.passed).toBe(true);
  });

  it('JS 文件也支持', async () => {
    const r = await checkCompliance({ code: 'const x = 1;', filename: 'test.js' });
    expect(r.passed).toBe(true);
  });

  it('每次检查写入飞轮遥测（含干净运行），落盘消息已脱敏', async () => {
    await checkCompliance({ code: '<div class="my-btn" style="color:red">x</div>', filename: 'a.html' });
    await checkCompliance({ code: '<div class="card p-4">x</div>', filename: 'b.html' });
    const events = readTelemetry();
    expect(events).toHaveLength(2);
    expect(events[0].passed).toBe(false);
    expect(events[0].source).toBe('mcp');
    expect(events[0].violations.length).toBeGreaterThan(0);
    expect(events[1].passed).toBe(true);
    // 隐私红线：style 值不得落盘
    const persisted = JSON.stringify(events);
    expect(persisted).not.toContain('color:red');
    expect(persisted).toContain('[style]');
  });
});

describe('MCP / fix_code（手动模式，零 LLM）', () => {
  it('违规代码返回 fixPrompt + errors，并记录遥测', async () => {
    const r = await fixCode({ code: '<div class="my-btn" style="color:red">x</div>' });
    expect(r.passed).toBe(false);
    expect(r.fixPrompt).toContain('ESLint');
    expect(r.errors.length).toBeGreaterThan(0);
    const events = readTelemetry();
    expect(events).toHaveLength(1);
    expect(events[0].passed).toBe(false);
  });

  it('合规代码 passed=true，遥测记干净运行', async () => {
    const r = await fixCode({ code: '<div class="card p-4">x</div>' });
    expect(r.passed).toBe(true);
    expect(readTelemetry()[0].passed).toBe(true);
  });
});

describe('MCP / get_prompt（零 LLM）', () => {
  it('tailored 模式返回裁剪后的 systemPrompt', async () => {
    const r = await getPrompt({ prompt: '登录页：手机号验证码' });
    expect(r.promptMode).toBe('tailored');
    expect(r.systemPrompt).toContain('page-login');
    expect(r.systemPrompt).not.toContain('## 示例 1：page-list');
  });

  it('full 模式返回全量 systemPrompt（含 page-list）', async () => {
    const r = await getPrompt({ prompt: '登录页', promptMode: 'full' });
    expect(r.systemPrompt).toContain('page-login');
    expect(r.systemPrompt).toContain('page-list');
  });
});

describe('MCP / generate_page（手动模式）', () => {
  it('tailored 模式返回裁剪后的 systemPrompt', async () => {
    // 零 LLM 契约测试：屏蔽环境里可能存在的真实 API 配置（否则 callLLM 真调远端导致超时）
    const savedUrl = process.env.AFMOBILE_AI_API_URL;
    const savedKey = process.env.AFMOBILE_AI_API_KEY;
    delete process.env.AFMOBILE_AI_API_URL;
    delete process.env.AFMOBILE_AI_API_KEY;
    try {
      const r = await generatePage({ prompt: '登录页：手机号验证码' });
      expect(r.passed).toBe(false);
      expect(r.mode).toBe('manual');
      expect(r.systemPrompt).toContain('page-login');
      // tailored 应不含 page-list few-shot
      expect(r.systemPrompt).not.toContain('## 示例 1：page-list');
    } finally {
      if (savedUrl !== undefined) process.env.AFMOBILE_AI_API_URL = savedUrl;
      if (savedKey !== undefined) process.env.AFMOBILE_AI_API_KEY = savedKey;
    }
  });

  it('full 模式返回全量 systemPrompt', async () => {
    const savedUrl = process.env.AFMOBILE_AI_API_URL;
    const savedKey = process.env.AFMOBILE_AI_API_KEY;
    delete process.env.AFMOBILE_AI_API_URL;
    delete process.env.AFMOBILE_AI_API_KEY;
    try {
      const r = await generatePage({ prompt: '登录页', promptMode: 'full' });
      expect(r.mode).toBe('manual');
      // full 模式含全部 few-shot
      expect(r.systemPrompt).toContain('page-login');
      expect(r.systemPrompt).toContain('page-list');
    } finally {
      if (savedUrl !== undefined) process.env.AFMOBILE_AI_API_URL = savedUrl;
      if (savedKey !== undefined) process.env.AFMOBILE_AI_API_KEY = savedKey;
    }
  });
});

describe('MCP / flywheel_report（零 LLM）', () => {
  it('无数据时给出喂数据指引', async () => {
    const r = await flywheelReport();
    expect(r.total).toBe(0);
    expect(r.message).toContain('飞轮暂无数据');
  });

  it('有数据时返回 Top 规则 / 白名单候选 / 收敛度', async () => {
    recordRun({
      source: 'mcp', tool: 'trae-code', file: 'a.html', passed: false,
      violations: [
        { rule: 'af-mobile/token-whitelist', severity: 'error', line: 1, message: "Class 'card-wrap' not in whitelist. Use recipe" },
      ],
    });
    recordRun({ source: 'mcp', tool: 'trae-code', file: 'b.html', passed: true, violations: [] });
    const r = await flywheelReport({ topN: 5 });
    expect(r.total).toBe(2);
    expect(r.topRules[0].rule).toBe('af-mobile/token-whitelist');
    expect(r.whitelistCandidates.classes[0].name).toBe('card-wrap');
    expect(r.convergence['trae-code']).toEqual({ runs: 2, passed: 1 });
  });
});
