// Tree Shaking 失效回归防护（三类历史事故的模式化钉死）：
//
// R1 变量化动态 import()：import(path) 拿到形参变量，Rollup/esbuild 无法静态分析，
//    产物保留裸相对路径 → 运行时请求不存在的 chunk → MIME/404（曾致 gen-entry LAZY
//    辅助函数包装、playground 场景模板导入两处线上级故障）。
// R2 入口层隐性 ctor 集合：index.js 顶层导出含组件构造器的同步容器（原 REGISTRY 形态）
//    等于建立对全部组件的真实引用 —— 任何 import 单一导出（哪怕只用 register）的消费者
//    都被迫携带全量组件，树摇整体失效。
// R3 分包真实性冒烟：register 按需加载机制要求动态目标被切成独立 chunk；
//    单巨型产物 = 分包链路断裂。esbuild 以子进程运行，规避 jsdom 环境 realm 冲突。
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

function* walkJs(dir) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) yield* walkJs(p);
    else if (/\.m?js$/.test(f.name)) yield p;
  }
}

describe('R1 · 变量化动态 import() 禁令', () => {
  it('src/**/*.js 中 import() 参数必须是字符串字面量', () => {
    const offenders = [];
    // 参数首字符不是引号 = 变量化导入（标识符/成员表达式 alike），一律拦截；
    // 引号开头（含无插值模板串）为可静态分析的字面量，放行
    const re = /import\(\s*(?!['"`])/g;
    for (const f of walkJs(SRC)) {
      if (f.endsWith('.d.ts')) continue;
      const code = readFileSync(f, 'utf8')
        // CRLF 统一为 LF（\r 会使下方 $ 锚点失配）；再剥注释避免「动态 import()」等说明性文字误报（保留换行便于定位）
        .replace(/\r\n/g, '\n')
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        .split('\n')
        .map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1'))
        .join('\n');
      let m;
      while ((m = re.exec(code))) {
        offenders.push(`${f.replace(SRC, 'src')} @offset ${m.index}`);
      }
    }
    // 修复指引见 scripts/gen-entry.mjs renderLazy 注释（逐项内联字面量）
    expect(offenders).toEqual([]);
  });
});

describe('R2 · 入口层 tag→Ctor 同步容器禁令', () => {
  it('主库入口不再导出 REGISTRY 形态的 ctor 集合（tag 清单一律走 LAZY 派生）', async () => {
    const mod = await import('../src/index.js');
    expect(Array.isArray(mod.COMPONENT_TAGS)).toBe(true);
    expect(mod.COMPONENT_TAGS.length).toBeGreaterThanOrEqual(30);
    for (const t of mod.COMPONENT_TAGS) expect(t).toMatch(/^af-/);
    expect('REGISTRY' in mod).toBe(false);
  });
});

describe('R3 · register 按需分包冒烟', () => {
  it("import {register}+'af-list' 的产物被切分为多 chunk，且单 chunk 不携带全量组件", () => {
    const tmp = join(ROOT, '.ts-smoke-tmp');
    const outdir = join(tmp, 'out');
    const helper = join(tmp, 'run.mjs');
    mkdirSync(outdir, { recursive: true });
    try {
      // 子进程跑 esbuild：与 jsdom 测试 realm 隔离；splitting 需要异步 API，故用 .mjs 顶屋 await
      writeFileSync(
        helper,
        [
          "import { build } from 'esbuild';",
          "await build({",
          `  stdin: { contents: "import { register } from './index.js';\\nawait register('af-list');", resolveDir: ${JSON.stringify(SRC)}, loader: 'js' },`,
          '  bundle: true, minify: true, format: "esm", splitting: true,',
          `  outdir: ${JSON.stringify(outdir)}, logLevel: "silent",`,
          '});',
        ].join('\n'),
      );
      execFileSync(process.execPath, [helper], { cwd: ROOT, stdio: 'pipe' });

      const chunks = readdirSync(outdir).filter((f) => f.endsWith('.js'));
      // 至少：entry + af-list chunk + 共享依赖 chunk
      expect(chunks.length).toBeGreaterThan(2);
      // 任一单个 chunk 均不得接近全量体积（全量 22.9KB gzip；回归内联时会逼近 20KB+）
      const maxGz = Math.max(...chunks.map((f) => gzipSync(readFileSync(join(outdir, f))).length));
      expect(maxGz).toBeLessThan(8 * 1024);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
