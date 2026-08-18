// create-af-mobile 薄壳测试：默认注入 create 子命令 + skill 透传 + 端到端生成工程
import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BIN = join(ROOT, 'create-af-mobile/bin.mjs');

function runShell(args) {
  return execFileSync('node', [BIN, ...args], { encoding: 'utf8' });
}

describe('create-af-mobile 薄壳', () => {
  it('默认注入 create 子命令：直接传目录名即生成工程 + skill 自举', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'af-shell-')), 'my-app');
    const out = runShell([dir]);
    expect(out).toContain('+ package.json');
    expect(existsSync(join(dir, 'src/main.js'))).toBe(true);
    // skill 至少落到中立路径 skills/（node_modules 里的发布版可能仍写 .trae/.claude，
    // 不假设其状态——本测试只关心 AGENTS.md 引导真相源 skills/ 是否就绪）
    expect(existsSync(join(dir, 'skills/af-mobile-grill/SKILL.md'))).toBe(true);
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toContain('<!-- af-mobile:skill-grill -->');
  });

  it('显式 create 子命令原样透传（幂等写法）', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'af-shell-')), 'app2');
    const out = runShell(['create', dir]);
    expect(out).toContain(`✓ 项目已生成：${dir}`);
  });

  it('skill 子命令透传：可补装 skill 到已有目录', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'af-shell-')), 'app3');
    const out = runShell(['skill', 'add', dir]);
    expect(out).toContain('+ skills/af-mobile-grill/SKILL.md');
    // 断言与转发目标的真相源一致（开发态 node_modules 是 registry 发布版，非仓库源）
    const source = readFileSync(
      join(ROOT, 'node_modules/@af-mobile/ui/skills/af-mobile-grill/SKILL.md'), 'utf8',
    );
    const installed = readFileSync(join(dir, 'skills/af-mobile-grill/SKILL.md'), 'utf8');
    expect(installed).toBe(source);
  });
});
