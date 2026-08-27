// 包资产快照同步闸门（pkg-publish 设计 §3.7）
// 验证 syncAssetsTo 的同步逻辑：对临时目录执行同步后，产物必须与仓库真相源逐字节一致
// 快照本身已去提交化（gitignore），闸门改为把关"同步函数"而非"提交态文件"
import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncAssetsTo, ASSETS } from '../scripts/sync-pkg-assets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const dirs = ['mcp', 'prompt'].map((name) =>
  mkdtempSync(join(tmpdir(), `af-mobile-assets-${name}-`)),
);

afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

describe('syncAssetsTo 同步逻辑', () => {
  it.each(dirs.map((_, i) => [i === 0 ? 'mcp' : 'prompt']))(
    '%s 快照产物与源逐字节一致',
    (name) => {
      const dir = dirs[name === 'mcp' ? 0 : 1];
      expect(syncAssetsTo(dir)).toBe(ASSETS.length);
      for (const [src, flat] of ASSETS.filter(([, flat]) => flat !== 'models')) {
        expect(
          readFileSync(join(dir, flat), 'utf8'),
          `${flat} 与 ${src} 不一致`,
        ).toBe(readFileSync(join(ROOT, src), 'utf8'));
      }
      // models 目录：文件清单一致（内容逐文件比对）
      const srcModels = readdirSync(join(ROOT, 'prompt/models')).sort();
      expect(readdirSync(join(dir, 'models')).sort()).toEqual(srcModels);
      for (const f of srcModels) {
        expect(
          readFileSync(join(dir, 'models', f), 'utf8'),
          `models/${f} 与 prompt/models/${f} 不一致`,
        ).toBe(readFileSync(join(ROOT, 'prompt/models', f), 'utf8'));
      }
    },
  );
});
