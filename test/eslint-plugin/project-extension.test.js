// 项目级扩展体系测试（project-extension 设计 §3.3/§8）：约定块解析 / 自动注册 / 规则放行
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RuleTester } from 'eslint';
import { projectClassesFromCss, loadProjectClasses } from '../../eslint-plugin-aiflow/utils/helpers.js';
import aiflow, { withProjectRules } from '../../eslint-plugin-aiflow/index.js';
import tokenWhitelist from '../../eslint-plugin-aiflow/rules/token-whitelist.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const CSS = `/* 项目级扩展配方 */
/* === 1. 大头像 === */
.avatar-lg { width: 64px; height: 64px; }
.avatar-lg-sm { width: 48px; }

/* === 2. 筛选条 === */
.filter-bar { display: flex; }
.filter-bar .avatar-lg { border-radius: 50%; }

.outside-block { color: red; }
`;

describe('projectClassesFromCss（约定块解析）', () => {
  it('只提取 /* === N. 用途 === */ 块内的 class，跨块去重', () => {
    expect(projectClassesFromCss(CSS)).toEqual(['avatar-lg', 'avatar-lg-sm', 'filter-bar']);
  });

  it('块外 CSS 不登记（强制文档化）', () => {
    expect(projectClassesFromCss(CSS)).not.toContain('outside-block');
  });

  it('无约定块 / 空输入返回 []', () => {
    expect(projectClassesFromCss('.a { color: red; }')).toEqual([]);
    expect(projectClassesFromCss('')).toEqual([]);
    expect(projectClassesFromCss(null)).toEqual([]);
  });
});

describe('loadProjectClasses（文件读取）', () => {
  let dir;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'aiflow-ext-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('读取约定文件并提取 class', () => {
    const p = join(dir, 'recipes.project.css');
    writeFileSync(p, CSS);
    expect(loadProjectClasses(p)).toEqual(['avatar-lg', 'avatar-lg-sm', 'filter-bar']);
  });

  it('文件缺失静默返回 []（lint 配置不崩，AGENTS #6）', () => {
    expect(loadProjectClasses(join(dir, 'nope.css'))).toEqual([]);
  });
});

describe('withProjectRules（自动接线）', () => {
  let dir;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'aiflow-ext-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('约定块 class 并入 extraClass，af-data extraComponents 保留', () => {
    const p = join(dir, 'recipes.project.css');
    writeFileSync(p, CSS);
    const rules = withProjectRules(p);
    const [, opts] = rules['aiflow/token-whitelist'];
    expect(opts.extraClass).toEqual(['avatar-lg', 'avatar-lg-sm', 'filter-bar']);
    expect(opts.extraComponents).toContain('af-data');
    // 其余规则原样保留
    expect(rules['aiflow/no-inline-style']).toBe('error');
  });

  it('文件缺失时 extraClass 为空数组（等价 recommended）', () => {
    const rules = withProjectRules(join(dir, 'nope.css'));
    expect(rules['aiflow/token-whitelist'][1].extraClass).toEqual([]);
  });

  it('挂载在 default export 上（消费端 aiflow.withProjectRules 一行接入）', () => {
    expect(typeof aiflow.withProjectRules).toBe('function');
  });
});

describe('登记 class 经 token-whitelist 规则放行（端到端）', () => {
  it('约定块内 class 不再报 unknownClass', () => {
    const rules = withProjectRules(undefined, {
      'aiflow/token-whitelist': ['error', { extraClass: ['avatar-lg'] }],
    });
    const [, opts] = rules['aiflow/token-whitelist'];
    ruleTester.run('token-whitelist', tokenWhitelist, {
      valid: [{ code: 'const html = `<div class="avatar-lg">x</div>`;', options: [opts] }],
      invalid: [],
    });
  });
});
