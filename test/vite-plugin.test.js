// vite-plugin.test.js —— afMobileTrimLazy 构建期裁剪 LAZY 表（OPT-4）
import { describe, it, expect } from 'vitest';
import afMobileTrimLazy, { trimLazyCode, collectRegisterTags } from '../src/vite.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

// 与 src/index.js 同构的 LAZY 片段（gen:lazy 标记指纹 + kebab 字面量表）
const FAKE_ENTRY = `// ===== gen:entry:start
export { AfDialog, AfToast } from './components/af-dialog.js';
// ===== gen:entry:end

// ===== gen:lazy:start（由 scripts/gen-entry.mjs 自动生成，勿手改）
const LAZY = {
  'af-dialog': () => import('./components/af-dialog.js').then((m) => m.AfDialog),
  'af-toast': () => import('./components/af-toast.js').then((m) => m.AfToast),
  'af-picker': () => import('./components/af-picker.js').then((m) => m.AfPicker),
};
// ===== gen:lazy:end

export async function register(...names) {}`;

describe('trimLazyCode', () => {
  it('只保留实际 register() 到的组件，import 路径与类名对应', () => {
    const next = trimLazyCode(FAKE_ENTRY, new Set(['af-dialog', 'af-picker']));
    expect(next).toBeTruthy();
    expect(next).toContain("'af-dialog': () => import('./components/af-dialog.js').then((mod) => mod.AfDialog)");
    expect(next).toContain("'af-picker': () => import('./components/af-picker.js').then((mod) => mod.AfPicker)");
    expect(next).not.toContain('af-toast');
    expect(next).toContain('gen:lazy:end');
  });

  it('全量使用时不裁剪（返回 null）', () => {
    expect(trimLazyCode(FAKE_ENTRY, new Set(['af-dialog', 'af-toast', 'af-picker']))).toBeNull();
  });

  it('无 gen:lazy 标记或空 tags 时返回 null（全量保底）', () => {
    expect(trimLazyCode('const x = 1;', new Set(['af-dialog']))).toBeNull();
    expect(trimLazyCode(FAKE_ENTRY, new Set())).toBeNull();
    expect(trimLazyCode(FAKE_ENTRY, null)).toBeNull();
  });
});

describe('collectRegisterTags', () => {
  const makeProject = (files) => {
    const dir = mkdtempSync(join(tmpdir(), 'af-trim-'));
    const src = join(dir, 'src');
    for (const [name, content] of Object.entries(files)) {
      const p = join(src, name);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, content);
    }
    return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
  };

  it('收集多文件 register() 字面量 tag', () => {
    const { dir, cleanup } = makeProject({
      'main.js': `register('af-dialog', 'af-toast');`,
      'pages/list.js': `register(\n  'af-picker'\n);`,
    });
    try {
      const { tags, dynamic } = collectRegisterTags(join(dir, 'src'));
      expect(dynamic).toBe(false);
      expect([...tags].sort()).toEqual(['af-dialog', 'af-picker', 'af-toast']);
    } finally {
      cleanup();
    }
  });

  it('动态参数标记 dynamic（放弃裁剪）', () => {
    const { dir, cleanup } = makeProject({
      'main.js': `register('af-dialog');\nconst t = 'af-toast';\nregister(t);`,
    });
    try {
      const { tags, dynamic } = collectRegisterTags(join(dir, 'src'));
      expect(dynamic).toBe(true);
      expect(tags.has('af-dialog')).toBe(true);
    } finally {
      cleanup();
    }
  });

  it('node_modules 与隐藏目录不扫描', () => {
    const { dir, cleanup } = makeProject({
      'main.js': `register('af-dialog');`,
      'node_modules/pkg/index.js': `register('af-toast');`,
      '.cache/x.js': `register('af-picker');`,
    });
    try {
      const { tags, dynamic } = collectRegisterTags(join(dir, 'src'));
      expect([...tags]).toEqual(['af-dialog']);
      expect(dynamic).toBe(false);
    } finally {
      cleanup();
    }
  });
});

describe('afMobileTrimLazy 插件', () => {
  it('transform 裁剪命中 index.js 指纹的模块（扫描到字面量 register）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'af-trim-plugin-'));
    const src = join(dir, 'src');
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, 'main.js'), `register('af-dialog', 'af-picker');`);
    try {
      const plugin = afMobileTrimLazy({ scanDir: src });
      plugin.configResolved({ root: dir });
      const res = plugin.transform(FAKE_ENTRY, '/x/@af-mobile/ui/src/index.js');
      expect(res).toBeTruthy();
      expect(res.code).toContain('mod.AfDialog');
      expect(res.code).not.toContain('af-toast');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('不含 gen:lazy 指纹的文件不动（含消费端同名 src/index.js）', () => {
    const plugin = afMobileTrimLazy({ scanDir: 'fixtures-nonexist' });
    plugin.configResolved({ root: '/tmp/proj' });
    expect(plugin.transform('const LAZY = {};', '/tmp/proj/src/index.js')).toBeNull();
  });

  it('扫描不到 register() 时全量保底', () => {
    const dir = mkdtempSync(join(tmpdir(), 'af-trim-empty-'));
    const src = join(dir, 'src');
    mkdirSync(src, { recursive: true });
    try {
      const plugin = afMobileTrimLazy({ scanDir: src });
      plugin.configResolved({ root: dir });
      expect(plugin.transform(FAKE_ENTRY, '/x/@af-mobile/ui/src/index.js')).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
