// 数据飞轮 v2 —— 通用 lint 采集 CLI 测试（任意路径，零 LLM）
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lintAndHarvest } from '../scripts/lint-flywheel.mjs';
import { readTelemetry } from '../eval/telemetry.mjs';

let tmpDir;
let savedTelemetryDir;
let savedCI;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'aiflow-lint-'));
  savedTelemetryDir = process.env.AIFLOW_TELEMETRY_DIR;
  savedCI = process.env.CI;
  process.env.AIFLOW_TELEMETRY_DIR = tmpDir;
  delete process.env.CI;
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  if (savedTelemetryDir === undefined) delete process.env.AIFLOW_TELEMETRY_DIR;
  else process.env.AIFLOW_TELEMETRY_DIR = savedTelemetryDir;
  if (savedCI === undefined) delete process.env.CI;
  else process.env.CI = savedCI;
});

describe('lint-flywheel / 违规采集', () => {
  it('违规文件：lint 出错 + 遥测落盘 + 退出码 1', async () => {
    const fixtureDir = join(tmpDir, 'fixtures');
    mkdirSync(fixtureDir);
    // 字符串里的违规标记会被 token-whitelist / no-inline-style 检出
    writeFileSync(join(fixtureDir, 'bad.html'), '<div class="my-custom-card" style="color:red">x</div>');
    const r = await lintAndHarvest([fixtureDir], { source: 'cli' });
    expect(r.exitCode).toBe(1);
    const bad = r.byFile.find(f => f.file.endsWith('bad.html'));
    const rules = bad.messages.map(m => m.rule);
    expect(rules).toContain('aiflow/token-whitelist');
    expect(rules).toContain('aiflow/no-inline-style');
    // 遥测：违规文件默认记录
    const events = readTelemetry();
    expect(events).toHaveLength(1);
    expect(events[0].source).toBe('cli');
    expect(events[0].passed).toBe(false);
    expect(events[0].violations.some(v => v.rule === 'aiflow/token-whitelist')).toBe(true);
  });

  it('干净文件：退出码 0 + 默认不记录遥测', async () => {
    const fixtureDir = join(tmpDir, 'fixtures');
    mkdirSync(fixtureDir);
    writeFileSync(join(fixtureDir, 'clean.html'), '<div class="card p-4">x</div>');
    const r = await lintAndHarvest([fixtureDir], { source: 'cli' });
    expect(r.exitCode).toBe(0);
    expect(readTelemetry()).toHaveLength(0);
  });

  it('--record-clean 记录干净运行', async () => {
    const fixtureDir = join(tmpDir, 'fixtures');
    mkdirSync(fixtureDir);
    writeFileSync(join(fixtureDir, 'clean.html'), '<div class="card p-4">x</div>');
    await lintAndHarvest([fixtureDir], { source: 'ci', recordClean: true });
    const events = readTelemetry();
    expect(events).toHaveLength(1);
    expect(events[0].source).toBe('ci');
    expect(events[0].passed).toBe(true);
  });

  it('不存在路径跳过不崩，空输入退出码 0', async () => {
    const r = await lintAndHarvest([join(tmpDir, 'nope')], { source: 'cli' });
    expect(r.exitCode).toBe(0);
    expect(r.linted).toBe(0);
  });
});
