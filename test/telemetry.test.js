// 数据飞轮 v2 —— 遥测事件库测试
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, appendFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordRun, readTelemetry, detectTool, SOURCE_WEIGHTS, telemetryDir, sanitizeMessage } from '../eval/telemetry.mjs';

let tmpDir;
const ENV_KEYS = ['AIFLOW_TOOL', 'CLAUDECODE', 'CURSOR_AGENT', 'CI'];
const savedEnv = {};

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'aiflow-tel-'));
  if (savedEnv.AIFLOW_TELEMETRY_DIR === undefined) savedEnv.AIFLOW_TELEMETRY_DIR = process.env.AIFLOW_TELEMETRY_DIR;
  process.env.AIFLOW_TELEMETRY_DIR = tmpDir;
  for (const k of ENV_KEYS) { savedEnv[k] = process.env[k]; delete process.env[k]; }
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  for (const k of ['AIFLOW_TELEMETRY_DIR', ...ENV_KEYS]) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe('telemetry / recordRun + readTelemetry', () => {
  it('写入并读回事件（含违规明细）', () => {
    recordRun({
      source: 'mcp', tool: 'trae-code', file: 'src/a.html', passed: false,
      violations: [{ rule: 'aiflow/token-whitelist', severity: 'error', line: 3, message: "Class 'card-w' not in whitelist" }],
    });
    const events = readTelemetry();
    expect(events).toHaveLength(1);
    expect(events[0].source).toBe('mcp');
    expect(events[0].tool).toBe('trae-code');
    expect(events[0].passed).toBe(false);
    expect(events[0].violations[0].rule).toBe('aiflow/token-whitelist');
    expect(events[0].v).toBe(1);
  });

  it('干净运行（violations 空 + passed=true）可记录', () => {
    recordRun({ source: 'mcp', file: 'b.html', passed: true, violations: [] });
    const events = readTelemetry();
    expect(events[0].passed).toBe(true);
    expect(events[0].violations).toHaveLength(0);
  });

  it('坏行跳过不崩（AGENTS #6）', () => {
    appendFileSync(join(tmpDir, 'telemetry.jsonl'), '{broken json\n');
    recordRun({ source: 'cli', file: 'c.js', passed: false, violations: [{ rule: 'x', message: '' }] });
    appendFileSync(join(tmpDir, 'telemetry.jsonl'), 'also broken\n');
    const events = readTelemetry();
    expect(events).toHaveLength(1);
    expect(events[0].file).toBe('c.js');
  });

  it('无遥测文件时返回空数组', () => {
    expect(readTelemetry()).toEqual([]);
    expect(existsSync(join(tmpDir, 'telemetry.jsonl'))).toBe(false);
  });
});

describe('telemetry / sanitizeMessage（隐私红线）', () => {
  it('no-inline-style：整个 style 属性值剥离，语义前缀保留', () => {
    const out = sanitizeMessage('aiflow/no-inline-style', "Inline style 'color:red;background:url(secrets)' is forbidden. Use class instead");
    expect(out).toBe("Inline style '[style]' is forbidden. Use class instead");
    expect(out).not.toContain('color:red');
    expect(out).not.toContain('secrets');
  });

  it('wc-shadow-use-token：整条 CSS 声明剥离', () => {
    const out = sanitizeMessage('aiflow/wc-shadow-use-token', "'color: #fff' in Shadow CSS must use var(--*). Use token variables for cross-theme visual consistency");
    expect(out).toBe("'[css]' in Shadow CSS must use var(--*). Use token variables for cross-theme visual consistency");
  });

  it('class/组件名等标识符保留（挖掘器依赖）', () => {
    const out = sanitizeMessage('aiflow/token-whitelist', "Class 'card-wrap' not in whitelist. Use recipe/atomic or register");
    expect(out).toContain("'card-wrap'");
  });

  it('未知规则超长消息截断 200 兜底（防未来规则嵌入大段代码）', () => {
    const long = 'x'.repeat(500);
    const out = sanitizeMessage('aiflow/future-rule', long);
    expect(out.length).toBe(201); // 200 + 省略号
    expect(out.endsWith('…')).toBe(true);
  });

  it('recordRun 落盘的是脱敏后消息', () => {
    recordRun({
      source: 'mcp', file: 'a.html', passed: false,
      violations: [{ rule: 'aiflow/no-inline-style', severity: 'error', line: 1, message: "Inline style 'color:red' is forbidden. Use class instead" }],
    });
    const events = readTelemetry();
    expect(events[0].violations[0].message).toBe("Inline style '[style]' is forbidden. Use class instead");
  });
});

describe('telemetry / detectTool', () => {
  it('AIFLOW_TOOL 显式指定优先', () => {
    process.env.AIFLOW_TOOL = 'trae-work';
    expect(detectTool()).toBe('trae-work');
  });

  it('识别 claude-code / cursor 标记', () => {
    process.env.CLAUDECODE = '1';
    expect(detectTool()).toBe('claude-code');
    delete process.env.CLAUDECODE;
    process.env.CURSOR_AGENT = '1';
    expect(detectTool()).toBe('cursor');
  });

  it('无任何标记时 unknown', () => {
    expect(detectTool()).toBe('unknown');
  });
});

describe('telemetry / 常量', () => {
  it('来源权重：真实使用 > 合成 eval', () => {
    expect(SOURCE_WEIGHTS.mcp).toBeGreaterThan(SOURCE_WEIGHTS.eval);
    expect(SOURCE_WEIGHTS.cli).toBeGreaterThan(SOURCE_WEIGHTS.eval);
  });

  it('AIFLOW_TELEMETRY_DIR 覆盖默认目录', () => {
    expect(telemetryDir()).toBe(tmpDir);
  });
});
