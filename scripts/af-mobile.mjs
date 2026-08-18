#!/usr/bin/env node
// af-mobile CLI 入口（bin）：子命令分发
//   af-mobile create <dir>    生成新工程（脚手架 + skill 自举）
//   af-mobile skill add [dir] 把 af-mobile-grill skill 装进已有项目（默认当前目录）
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [cmd, ...args] = process.argv.slice(2);

function run(script, argv) {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', script), ...argv], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

if (cmd === 'create') {
  run('create-app.mjs', args);
} else if (cmd === 'skill' && args[0] === 'add') {
  run('skill-add.mjs', args.slice(1));
} else {
  console.log(`用法：
  af-mobile create <目录名>      生成新工程
  af-mobile skill add [目录]     安装 af-mobile-grill skill（默认当前目录）`);
  process.exit(cmd ? 1 : 0);
}
