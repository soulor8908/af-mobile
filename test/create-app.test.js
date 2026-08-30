// create-app.mjs 脚手架测试：模板完整性 + npm 版本依赖 + skill 自举 + 守卫
import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts/create-app.mjs');

function scaffold(dir, ...flags) {
  return execFileSync('node', [SCRIPT, dir, ...flags], { encoding: 'utf8' });
}

describe('create-app scaffold', () => {
  it('生成最小工程模板且依赖为 npm 版本号', () => {
    const parent = mkdtempSync(join(tmpdir(), 'af-mobile-create-'));
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
      'test/setup.js',
    ]) {
      expect(existsSync(join(dir, rel)), rel).toBe(true);
    }

    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('my-habit-app');
    expect(pkg.dependencies['@af-mobile/ui']).toMatch(/^\^/); // 禁 file: 本地依赖
    expect(pkg.dependencies['@af-mobile/ui']).not.toContain('file:');
    // 测试链路开箱即用：test script + vitest/jsdom 依赖 + setup 桩
    expect(pkg.scripts.test).toBe('vitest run');
    expect(pkg.devDependencies.vitest).toBeDefined();
    expect(pkg.devDependencies.jsdom).toBeDefined();

    const vite = readFileSync(join(dir, 'vite.config.js'), 'utf8');
    expect(vite).toContain("environment: 'jsdom'");
    expect(vite).toContain("setupFiles: ['./test/setup.js']");

    const setup = readFileSync(join(dir, 'test/setup.js'), 'utf8');
    expect(setup).toContain('IntersectionObserver');
    expect(setup).toContain('ResizeObserver');
    expect(setup).toContain('showModal');

    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    expect(html).toContain('localStorage.getItem(\'theme\')'); // 暗色 FOUC 内联脚本

    // 子路径部署适配：vite base + manifest start_url + 配件引用全部相对路径
    expect(vite).toContain("base: './'");
    const manifest = JSON.parse(readFileSync(join(dir, 'public/manifest.webmanifest'), 'utf8'));
    expect(manifest.start_url).toBe('./');
    expect(html).toContain('href="./manifest.webmanifest"');
    expect(html).toContain('href="./favicon.ico"');
    expect(html).toContain('href="./icon-192.png"');
    expect(html).toContain('content="./icon-512.png"');
    expect(html).not.toMatch(/(href|content)="\/(manifest|favicon|icon)/);

    const main = readFileSync(join(dir, 'src/main.js'), 'utf8');
    expect(main).toContain("start('#app', { hash: true })");

    // 页面范式收敛到 createPage（grill 与脚手架同构，AGENTS.md §3）
    const home = readFileSync(join(dir, 'src/pages/home.js'), 'utf8');
    expect(home).toContain('createPage(');
    expect(home).toContain(':value="derived.pct"');            // :bind 响应式绑定
    expect(home).toContain('page.mount(ctx.outlet)');
    expect(home).toContain("ctx.signal.addEventListener('abort'"); // 路由离开级联清理
    const docs = readFileSync(join(dir, 'src/pages/docs.js'), 'utf8');
    expect(docs).toContain('createPage(');
    expect(docs).toContain('page.mount(ctx.outlet)');
  });

  it('--flywheel 生成 .mcp.json（显式 opt-in），默认不生成', () => {
    const parent = mkdtempSync(join(tmpdir(), 'af-mobile-create-'));
    const withFw = join(parent, 'app-fw');
    const withoutFw = join(parent, 'app-plain');
    scaffold(withoutFw);
    scaffold(withFw, '--flywheel');

    expect(existsSync(join(withoutFw, '.mcp.json'))).toBe(false);
    const mcp = JSON.parse(readFileSync(join(withFw, '.mcp.json'), 'utf8'));
    expect(mcp.mcpServers['af-mobile'].args).toContain('@af-mobile/mcp');
  });

  it('自举安装 af-mobile-grill skill 到中立路径 + AGENTS.md', () => {
    const parent = mkdtempSync(join(tmpdir(), 'af-mobile-create-'));
    const dir = join(parent, 'app');
    scaffold(dir);

    const src = readFileSync(join(ROOT, 'skills/af-mobile-grill/SKILL.md'), 'utf8');
    expect(readFileSync(join(dir, 'skills/af-mobile-grill/SKILL.md'), 'utf8')).toBe(src);
    // 不再写工具特定目录（用户可能用 Cursor/Codex/Copilot 等而非 TRAE/Claude Code）
    expect(existsSync(join(dir, '.trae/skills/af-mobile-grill/SKILL.md'))).toBe(false);
    expect(existsSync(join(dir, '.claude/skills/af-mobile-grill/SKILL.md'))).toBe(false);
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toContain('<!-- af-mobile:skill-grill -->');
  });

  it('拒绝覆盖非空目录', () => {
    const dir = mkdtempSync(join(tmpdir(), 'af-mobile-create-'));
    writeFileSync(join(dir, 'keep.txt'), 'x');
    expect(() => scaffold(dir)).toThrow();
  });

  it('空目录可以生成（目录已存在但为空）', () => {
    const parent = mkdtempSync(join(tmpdir(), 'af-mobile-create-'));
    const dir = join(parent, 'nested', 'app');
    mkdirSync(dir, { recursive: true });
    scaffold(dir);
    expect(existsSync(join(dir, 'package.json'))).toBe(true);
  });
});
