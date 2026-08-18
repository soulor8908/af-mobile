import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDts, parseDefineProps, renderMarkdown } from '../../scripts/gen-docs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const readDts = () => readFileSync(join(ROOT, 'src/index.d.ts'), 'utf8');

describe('gen-docs 解析 index.d.ts', () => {
  it('从 af-dialog 段解析出属性/方法/事件', () => {
    const c = parseDts(readDts()).find((x) => x.tag === 'af-dialog');
    expect(c).toBeTruthy();
    expect(c.desc).toMatch(/模态框/);
    const names = c.props.map((p) => p.name);
    expect(names).toContain('title');
    expect(names).toContain('closeOnEsc');
    expect(c.events.map((e) => e.name)).toEqual(['af-dialog:open', 'af-dialog:close']);
    expect(c.methods.map((m) => m.name)).toContain('open');
  });

  it('属性注释来自上一行 JSDoc', () => {
    const c = parseDts(readDts()).find((x) => x.tag === 'af-dialog');
    const title = c.props.find((p) => p.name === 'title');
    expect(title.doc).toMatch(/标题/);
    expect(title.readonly).toBe(false);
  });
});

describe('gen-docs 解析 defineProp 默认值', () => {
  it('从组件源码提取默认值', () => {
    const src = readFileSync(join(ROOT, 'src/components/af-dialog.js'), 'utf8');
    const defs = parseDefineProps(src);
    expect(defs.title).toBe('');
    expect(defs.closeOnEsc).toBe(true);
  });
});

describe('gen-docs 渲染 markdown', () => {
  it('输出含 marker 的 API 表格且幂等', () => {
    const c = {
      tag: 'af-dialog', desc: '模态框',
      props: [{ name: 'title', type: 'string', doc: '标题', readonly: false, def: '' }],
      events: [{ name: 'af-dialog:close' }],
      methods: [{ name: 'open', sig: 'open(): void', doc: '打开' }],
    };
    const md = renderMarkdown(c);
    expect(md).toContain('<!-- gen:start:api -->');
    expect(md).toContain('<!-- gen:end:api -->');
    expect(md).toContain('| title |');
    expect(renderMarkdown(c)).toBe(md);
  });
});
