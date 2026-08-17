#!/usr/bin/env node
// create-af-mobile —— npm create 约定薄壳：npm create af-mobile my-app
// 定位已安装的 @af-mobile/ui CLI 并透传参数；默认注入 create 子命令
// （npm create 约定已隐含 create，用户无需再输；skill 子命令原样透传）
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';

const pkgRoot = dirname(dirname(createRequire(import.meta.url).resolve('@af-mobile/ui')));
const cli = join(pkgRoot, 'scripts/aiflow.mjs');
const args = process.argv.slice(2);
if (args[0] !== 'create' && args[0] !== 'skill') args.unshift('create');

const r = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit' });
process.exit(r.status ?? 1);
