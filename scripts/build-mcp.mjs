// AIFlow —— @af-mobile/mcp 打包（pkg-publish 设计 §3.5）
// 产物：mcp/dist/index.mjs（自包含 bundle：telemetry/build-prompt/ai-fix/generate/flywheel 全内联）
// external：sdk（运行时依赖）、eslint（peer，动态 import）
import { build } from 'esbuild';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

await build({
  entryPoints: [join(ROOT, 'mcp/index.mjs')],
  outfile: join(ROOT, 'mcp/dist/index.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  external: ['@modelcontextprotocol/sdk', 'eslint'],
  banner: { js: '#!/usr/bin/env node\n' },
  logLevel: 'info',
});
console.log('✓ mcp/dist/index.mjs (bundled, assets via <pkg>/assets)');
