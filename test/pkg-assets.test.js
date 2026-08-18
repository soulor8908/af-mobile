// 包资产快照漂移闸门（pkg-publish 设计 §3.7）
// mcp/assets 与 prompt/assets 必须与仓库真相源逐字节一致，防止发布快照过期
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ASSETS = [
  ['eslint-plugin-af-mobile/utils/whitelist-v1.json', 'whitelist-v1.json'],
  ['src/recipes.css', 'recipes.css'],
  ['src/atomic.css', 'atomic.css'],
  ['prompt/system-prompt.md', 'system-prompt.md'],
  ['prompt/system-prompt.template.md', 'system-prompt.template.md'],
];

describe('pkg-assets 漂移闸门', () => {
  for (const target of ['mcp/assets', 'prompt/assets']) {
    it(`${target} 与源一致（漂移时跑 npm run pkg:assets）`, () => {
      for (const [src, flat] of ASSETS) {
        expect(
          readFileSync(join(ROOT, target, flat), 'utf8'),
          `${target}/${flat} 与 ${src} 不一致，请跑 npm run pkg:assets`,
        ).toBe(readFileSync(join(ROOT, src), 'utf8'));
      }
      // models 目录：文件清单一致（内容逐文件比对）
      const srcModels = readdirSync(join(ROOT, 'prompt/models')).sort();
      expect(readdirSync(join(ROOT, target, 'models')).sort()).toEqual(srcModels);
      for (const f of srcModels) {
        expect(
          readFileSync(join(ROOT, target, 'models', f), 'utf8'),
          `${target}/models/${f} 与 prompt/models/${f} 不一致`,
        ).toBe(readFileSync(join(ROOT, 'prompt/models', f), 'utf8'));
      }
    });
  }
});
