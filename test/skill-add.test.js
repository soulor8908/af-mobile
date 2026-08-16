// skill-add.mjs 安装器测试：多目标落盘 + AGENTS.md 幂等
import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts/skill-add.mjs');

function runInstall(dir) {
  return execFileSync('node', [SCRIPT, dir], { encoding: 'utf8' });
}

describe('skill-add installer', () => {
  it('安装到三个目标路径且内容与源一致', () => {
    const dir = mkdtempSync(join(tmpdir(), 'aiflow-skill-'));
    runInstall(dir);
    const src = readFileSync(join(ROOT, 'skills/aiflow-grill/SKILL.md'), 'utf8');
    for (const rel of [
      'skills/aiflow-grill/SKILL.md',
      '.trae/skills/aiflow-grill/SKILL.md',
      '.claude/skills/aiflow-grill/SKILL.md',
    ]) {
      expect(existsSync(join(dir, rel)), rel).toBe(true);
      expect(readFileSync(join(dir, rel), 'utf8')).toBe(src);
    }
  });

  it('生成 AGENTS.md 指引段且重复执行幂等', () => {
    const dir = mkdtempSync(join(tmpdir(), 'aiflow-skill-'));
    runInstall(dir);
    runInstall(dir); // 第二次应无副作用
    const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('<!-- aiflow:skill-grill -->');
    expect(agents).toContain('skills/aiflow-grill/SKILL.md');
    expect(agents.match(/<!-- aiflow:skill-grill -->/g)).toHaveLength(1);
  });
});
