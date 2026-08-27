// skill 文档代码块可执行性检查测试（防 API 漂移，如 registerAll 已移除仍被文档教学）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCodeBlocks, extractImportedNames, extractRegisterTags, checkMarkdown, extractPkgExports } from '../scripts/check-skill-exports.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exports = extractPkgExports(readFileSync(join(ROOT, 'src/index.js'), 'utf8'));

describe('skill-exports / extractCodeBlocks', () => {
  it('提取 fenced 代码块，忽略行内代码', () => {
    const md = '前文 `import { X }` 说明\n```js\nimport { AfList } from \'@af-mobile/ui\';\n```\n后文';
    const blocks = extractCodeBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('AfList');
  });
});

describe('skill-exports / extractImportedNames', () => {
  it('识别包名与 node_modules 路径的具名导入，as 别名取源名（校验的是包导出存在性）', () => {
    const code = `
      import { AfList, AfDialog as Dialog } from '@af-mobile/ui';
      import { register } from 'node_modules/@af-mobile/ui/src/index.js';
      import { x } from 'other-pkg';`;
    expect(extractImportedNames(code)).toEqual(new Set(['AfList', 'AfDialog', 'register']));
  });
});

describe('skill-exports / extractRegisterTags', () => {
  it('提取 register() 的字符串标签', () => {
    expect(extractRegisterTags("register('af-list', 'af-dialog');")).toEqual(new Set(['af-list', 'af-dialog']));
  });
});

describe('skill-exports / checkMarkdown', () => {
  const components = new Set(['af-list', 'af-dialog']);

  it('已移除的 API（registerAll）被教学时报告', () => {
    const md = '```js\nimport { registerAll } from \'@af-mobile/ui\';\nregisterAll();\n```';
    const problems = checkMarkdown(md, { exports, components });
    expect(problems.some(p => p.includes("'registerAll'"))).toBe(true);
  });

  it('未知组件标签报告', () => {
    const md = '```js\nregister(\'af-not-exist\');\n```';
    expect(checkMarkdown(md, { exports, components }, 't.md')).toEqual(['t.md register(\'af-not-exist\') 的标签不在组件注册表中']);
  });

  it('合法写法通过', () => {
    const md = '```js\nimport { AfList, register } from \'@af-mobile/ui\';\nregister(\'af-list\');\n```';
    expect(checkMarkdown(md, { exports, components })).toEqual([]);
  });

  it('代码块外的"禁止"语境不误报', () => {
    const md = '禁止 `registerAll()`，禁止 `import { registerAll } from \'@af-mobile/ui\'`（正文非代码块）';
    expect(checkMarkdown(md, { exports, components })).toEqual([]);
  });
});

describe('skill-exports / 仓库基线', () => {
  it('src/index.js 静态解析含核心导出（createPage/register/AfList）', () => {
    for (const n of ['createPage', 'register', 'AfList', 'route', 'start', 'afterEach', 'COMPONENT_TAGS']) {
      expect(exports.has(n), `missing export: ${n}`).toBe(true);
    }
  });
});
