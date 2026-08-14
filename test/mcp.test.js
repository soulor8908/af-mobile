// MCP Server 3 工具测试
import { describe, it, expect } from 'vitest';
import { checkCompliance, fixCode, generatePage } from '../mcp/index.mjs';

describe('MCP / check_compliance', () => {
  it('违规代码返回 errors（自定义 class + 内联 style）', async () => {
    const r = await checkCompliance({ code: '<div class="my-btn" style="color:red">x</div>' });
    expect(r.passed).toBe(false);
    expect(r.errorCount).toBeGreaterThan(0);
    const rules = r.errors.map(e => e.rule);
    expect(rules).toContain('aiflow/token-whitelist');
    expect(rules).toContain('aiflow/no-inline-style');
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
});

describe('MCP / fix_code（手动模式）', () => {
  it('违规代码返回 fixPrompt + errors', async () => {
    const r = await fixCode({ code: '<div class="my-btn" style="color:red">x</div>' });
    expect(r.passed).toBe(false);
    expect(r.fixPrompt).toContain('ESLint');
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('合规代码 passed=true', async () => {
    const r = await fixCode({ code: '<div class="card p-4">x</div>' });
    expect(r.passed).toBe(true);
  });
});

describe('MCP / generate_page（手动模式）', () => {
  it('tailored 模式返回裁剪后的 systemPrompt', async () => {
    const r = await generatePage({ prompt: '登录页：手机号验证码' });
    expect(r.passed).toBe(false);
    expect(r.mode).toBe('manual');
    expect(r.systemPrompt).toContain('page-login');
    // tailored 应不含 page-list few-shot
    expect(r.systemPrompt).not.toContain('## 示例 1：page-list');
  });

  it('full 模式返回全量 systemPrompt', async () => {
    const r = await generatePage({ prompt: '登录页', promptMode: 'full' });
    expect(r.mode).toBe('manual');
    // full 模式含全部 few-shot
    expect(r.systemPrompt).toContain('page-login');
    expect(r.systemPrompt).toContain('page-list');
  });
});
