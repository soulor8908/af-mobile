// CSS Tree Shaking 脚本测试
// 测试夹具含非白名单 class 字符串（如 'should-ignore' / 'btn-danger'），按 AGENTS.md §1 测试夹具例外豁免
/* eslint-disable af-mobile/token-whitelist */
import { describe, it, expect } from 'vitest';
import { scanUsedClasses, shakeCss, extractAnimationNames } from '../scripts/css-tree-shake.mjs';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('css-tree-shake / extractAnimationNames', () => {
  it('从 animation 简写提取动画名', () => {
    expect(extractAnimationNames('spinner-rotate 0.8s linear infinite')).toEqual(['spinner-rotate']);
  });

  it('排除时长和关键字', () => {
    expect(extractAnimationNames('skeleton-shimmer 1.5s infinite ease-in-out')).toEqual(['skeleton-shimmer']);
  });

  it('多动画逗号分隔', () => {
    expect(extractAnimationNames('a 1s, b 2s')).toEqual(['a', 'b']);
  });

  it('animation-name 单值', () => {
    expect(extractAnimationNames('switch-spin')).toEqual(['switch-spin']);
  });
});

describe('css-tree-shake / shakeCss', () => {
  it('保留用到的 class，删除未用 class', () => {
    const css = `.btn { color: red; }\n.btn-danger { color: red; }\n.rate { color: red; }`;
    const out = shakeCss(css, new Set(['btn']));
    expect(out).toContain('.btn');
    expect(out).not.toContain('.btn-danger');
    expect(out).not.toContain('.rate');
  });

  it('保留 af-* 组件宿主样式（即使 class 未在白名单）', () => {
    const css = `af-list { display: block; }\naf-list [data-role="x"] { height: 0; }\naf-list .list { overflow: auto; }`;
    const out = shakeCss(css, new Set());
    expect(out).toContain('af-list {');
    expect(out).toContain('[data-role="x"]');
    // af-list .list 中 .list 未在白名单，但 selector 含 af-list tag → 保留
    expect(out).toContain('.list');
  });

  it('保留无 class 的 selector（:root / * / body）', () => {
    const css = `:root { --x: 1; }\nbody { margin: 0; }\n.btn { color: red; }`;
    const out = shakeCss(css, new Set());
    expect(out).toContain(':root');
    expect(out).toContain('body');
    expect(out).not.toContain('.btn');
  });

  it('多 selector 规则，部分保留部分删除', () => {
    const css = `.input, .textarea { padding: 4px; }`;
    const out = shakeCss(css, new Set(['input']));
    expect(out).toContain('.input');
    expect(out).not.toContain('.textarea');
  });

  it('删除未被引用的 @keyframes', () => {
    const css = `
      .spinner { animation: spinner-rotate 0.8s; }
      @keyframes spinner-rotate { to { transform: rotate(360deg); } }
      @keyframes unused-anim { to { opacity: 0; } }
    `;
    const out = shakeCss(css, new Set(['spinner']));
    expect(out).toContain('@keyframes spinner-rotate');
    expect(out).not.toContain('@keyframes unused-anim');
  });

  it('删除未用 class 后，其引用的 @keyframes 也删除', () => {
    const css = `
      .spinner { animation: spinner-rotate 0.8s; }
      @keyframes spinner-rotate { to { transform: rotate(360deg); } }
    `;
    const out = shakeCss(css, new Set());
    expect(out).not.toContain('.spinner');
    expect(out).not.toContain('@keyframes spinner-rotate');
  });

  it('清理空的 @layer 容器', () => {
    const css = `@layer components {\n  .btn { color: red; }\n  .rate { color: red; }\n}`;
    const out = shakeCss(css, new Set());
    // 两个 class 都未用 → 整个 @layer 应被清理
    expect(out).not.toContain('@layer');
    expect(out).not.toContain('.btn');
  });

  it('保留 @layer 中有用到的 class', () => {
    const css = `@layer components {\n  .btn { color: red; }\n  .rate { color: red; }\n}`;
    const out = shakeCss(css, new Set(['btn']));
    expect(out).toContain('@layer components');
    expect(out).toContain('.btn');
    expect(out).not.toContain('.rate');
  });

  it('嵌套 @media 内的规则也裁剪', () => {
    const css = `@media (max-width: 600px) {\n  .btn { color: red; }\n  .rate { color: red; }\n}`;
    const out = shakeCss(css, new Set(['btn']));
    expect(out).toContain('@media');
    expect(out).toContain('.btn');
    expect(out).not.toContain('.rate');
  });

  it('组合 selector：.btn.btn-danger 全用上才保留', () => {
    const css = `.btn.btn-danger { color: red; }`;
    expect(shakeCss(css, new Set(['btn', 'btn-danger']))).toContain('.btn.btn-danger');
    expect(shakeCss(css, new Set(['btn']))).not.toContain('.btn.btn-danger');
  });
});

describe('css-tree-shake / scanUsedClasses', () => {
  it('从 HTML class="..." 提取', () => {
    const dir = mkdtempSync(join(tmpdir(), 'css-shake-'));
    writeFileSync(join(dir, 'a.html'), '<div class="btn btn-danger"></div><span class="rate"></span>');
    const used = scanUsedClasses(dir);
    expect([...used].sort()).toEqual(['btn', 'btn-danger', 'rate']);
    rmSync(dir, { recursive: true, force: true });
  });

  it('从 JSX className="..." 提取', () => {
    const dir = mkdtempSync(join(tmpdir(), 'css-shake-'));
    writeFileSync(join(dir, 'a.jsx'), '<button className="btn btn-lg">x</button>');
    const used = scanUsedClasses(dir);
    expect([...used].sort()).toEqual(['btn', 'btn-lg']);
    rmSync(dir, { recursive: true, force: true });
  });

  it('忽略 node_modules / dist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'css-shake-'));
    writeFileSync(join(dir, 'a.html'), '<div class="btn"></div>');
    const nm = join(dir, 'node_modules');
    mkdirSync(nm);
    writeFileSync(join(nm, 'x.html'), '<div class="should-ignore"></div>');
    const used = scanUsedClasses(dir);
    expect(used.has('btn')).toBe(true);
    expect(used.has('should-ignore')).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });
});
