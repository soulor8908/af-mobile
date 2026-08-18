#!/usr/bin/env node
// create-af-mobile —— npm create 约定薄壳：npm create af-mobile my-app
// 定位已安装的 @af-mobile/ui CLI 并透传参数；默认注入 create 子命令
// （npm create 约定已隐含 create，用户无需再输；skill 子命令原样透传）
// 优先尝试 monorepo 相对路径（CI 中 npm workspace 不自引用 @af-mobile/ui），
// 兜底到 npm 包解析（独立消费场景）。
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const selfDir = dirname(fileURLToPath(import.meta.url));
const cli = (
  // monorepo：bin.mjs 在 <root>/create-af-mobile/bin.mjs，CLI 在 <root>/scripts/af-mobile.mjs
  existsSync(join(selfDir, '..', 'scripts', 'af-mobile.mjs'))
) ? join(selfDir, '..', 'scripts', 'af-mobile.mjs')
  // 独立消费：通过 npm 包 resolution 定位 @af-mobile/ui
  : join(dirname(dirname(createRequire(import.meta.url).resolve('@af-mobile/ui'))), 'scripts/af-mobile.mjs');
const args = process.argv.slice(2);
if (args[0] !== 'create' && args[0] !== 'skill') args.unshift('create');

const r = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit' });
process.exit(r.status ?? 1);
