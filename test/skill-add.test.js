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
  it('安装到中立路径 skills/ 且内容与源一致', () => {
    const dir = mkdtempSync(join(tmpdir(), 'af-mobile-skill-'));
    runInstall(dir);
    const src = readFileSync(join(ROOT, 'skills/af-mobile-grill/SKILL.md'), 'utf8');
    expect(readFileSync(join(dir, 'skills/af-mobile-grill/SKILL.md'), 'utf8')).toBe(src);
    // 不再写工具特定目录（用户可能用 Cursor/Codex/Copilot 等而非 TRAE/Claude Code）
    expect(existsSync(join(dir, '.trae/skills/af-mobile-grill/SKILL.md'))).toBe(false);
    expect(existsSync(join(dir, '.claude/skills/af-mobile-grill/SKILL.md'))).toBe(false);
  });

  it('生成 AGENTS.md 指引段且重复执行幂等', () => {
    const dir = mkdtempSync(join(tmpdir(), 'af-mobile-skill-'));
    runInstall(dir);
    runInstall(dir); // 第二次应无副作用
    const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('<!-- af-mobile:skill-grill -->');
    expect(agents).toContain('skills/af-mobile-grill/SKILL.md');
    expect(agents.match(/<!-- af-mobile:skill-grill -->/g)).toHaveLength(1);
  });
});
