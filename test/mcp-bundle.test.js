// MCP bundle 发布态冒烟（pkg-publish 设计 §4）
// 原位构建 mcp/dist/index.mjs → import → 验证资产解析（get_prompt）与内嵌 ESLint 配置（check_compliance）
import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'mcp/dist/index.mjs');

let savedTelemetryDir;
let createdTelemetryDir;

beforeAll(() => {
  savedTelemetryDir = process.env.AFMOBILE_TELEMETRY_DIR;
  createdTelemetryDir = mkdtempSync(join(tmpdir(), 'af-mobile-mcp-bundle-'));
  process.env.AFMOBILE_TELEMETRY_DIR = createdTelemetryDir;
  // 原位构建（bundle 的资产解析依赖 dist 相对位置，不能构建到临时目录）
  execFileSync('node', [join(ROOT, 'scripts/build-mcp.mjs')], { stdio: 'pipe' });
  execFileSync('node', [join(ROOT, 'scripts/build-prompt-pkg.mjs')], { stdio: 'pipe' });
  return () => {
    if (savedTelemetryDir === undefined) delete process.env.AFMOBILE_TELEMETRY_DIR;
    else process.env.AFMOBILE_TELEMETRY_DIR = savedTelemetryDir;
    // 清 beforeAll 创建的临时目录（恢复 env 后再读 env 会拿到 '' 误删 cwd）；best-effort 防沙箱 shim 拦截
    try { rmSync(createdTelemetryDir, { recursive: true, force: true }); } catch { /* 临时目录残留无害 */ }
  };
});

describe('mcp bundle 发布态冒烟', () => {
  it('dist 存在且 get_prompt(tailored) 从包内 assets 产出规范', async () => {
    expect(existsSync(DIST)).toBe(true);
    const m = await import(DIST);
    const r = await m.getPrompt({ prompt: '商品列表页带图', promptMode: 'tailored' });
    expect(r.systemPrompt.length).toBeGreaterThan(1000);
    expect(r.systemPrompt).toContain('白名单');
  });

  it('check_compliance 用内嵌配置检出白名单外 class', async () => {
    const m = await import(DIST);
    const bad = await m.checkCompliance({ code: '<div class="my-custom-card">x</div>', filename: 't.html' });
    expect(bad.passed).toBe(false);
    expect(bad.errors.some(e => e.rule === 'af-mobile/token-whitelist')).toBe(true);
    const ok = await m.checkCompliance({ code: '<div class="card">x</div>', filename: 't2.html' });
    expect(ok.passed).toBe(true);
  });

  it('flywheel_report 读取 cwd 隔离目录的遥测不崩', async () => {
    const m = await import(DIST);
    const r = await m.flywheelReport({ topN: 3 });
    expect(r).toHaveProperty('total');
  });

  it('prompt bundle 从包内 assets 产出 system prompt', async () => {
    const { buildPrompt } = await import(join(ROOT, 'prompt/dist/index.mjs'));
    const p = buildPrompt({ userPrompt: '商品列表页带图' });
    expect(p.length).toBeGreaterThan(1000);
    expect(p).toContain('白名单');
  });
});
