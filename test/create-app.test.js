// create-app.mjs 脚手架测试：模板完整性 + npm 版本依赖 + skill 自举 + 守卫
import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts/create-app.mjs');

function scaffold(dir) {
  return execFileSync('node', [SCRIPT, dir], { encoding: 'utf8' });
}

describe('create-app scaffold', () => {
  it('生成最小工程模板且依赖为 npm 版本号', () => {
    const parent = mkdtempSync(join(tmpdir(), 'aiflow-create-'));
    const dir = join(parent, 'my-habit-app');
    scaffold(dir);

    for (const rel of [
      'package.json',
      'index.html',
      'vite.config.js',
      'eslint.config.js',
      '.gitignore',
      'src/main.js',
      'src/styles.css',
      'src/pages/home.js',
      'src/pages/docs.js',
    ]) {
      expect(existsSync(join(dir, rel)), rel).toBe(true);
    }

    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('my-habit-app');
    expect(pkg.dependencies['@af-mobile/ui']).toMatch(/^\^/); // 禁 file: 本地依赖
    expect(pkg.dependencies['@af-mobile/ui']).not.toContain('file:');

    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    expect(html).toContain('localStorage.getItem(\'theme\')'); // 暗色 FOUC 内联脚本

    const main = readFileSync(join(dir, 'src/main.js'), 'utf8');
    expect(main).toContain("start('#app', { hash: true })");
  });

  it('自举安装 aiflow-grill skill 到三个目标 + AGENTS.md', () => {
    const parent = mkdtempSync(join(tmpdir(), 'aiflow-create-'));
    const dir = join(parent, 'app');
    scaffold(dir);

    const src = readFileSync(join(ROOT, 'skills/aiflow-grill/SKILL.md'), 'utf8');
    for (const rel of [
      'skills/aiflow-grill/SKILL.md',
      '.trae/skills/aiflow-grill/SKILL.md',
      '.claude/skills/aiflow-grill/SKILL.md',
    ]) {
      expect(readFileSync(join(dir, rel), 'utf8')).toBe(src);
    }
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toContain('<!-- aiflow:skill-grill -->');
  });

  it('拒绝覆盖非空目录', () => {
    const dir = mkdtempSync(join(tmpdir(), 'aiflow-create-'));
    writeFileSync(join(dir, 'keep.txt'), 'x');
    expect(() => scaffold(dir)).toThrow();
  });

  it('空目录可以生成（目录已存在但为空）', () => {
    const parent = mkdtempSync(join(tmpdir(), 'aiflow-create-'));
    const dir = join(parent, 'nested', 'app');
    mkdirSync(dir, { recursive: true });
    scaffold(dir);
    expect(existsSync(join(dir, 'package.json'))).toBe(true);
  });
});
