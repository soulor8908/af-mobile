#!/usr/bin/env node
// @af-mobile/prompt bin —— MCP get_prompt 的 npx 降级入口（MCP 不可达是常态而非例外）
// 用法：
//   npx @af-mobile/prompt "商品列表页带图"        # 按需求裁剪 system prompt（tailored，默认）
//   npx @af-mobile/prompt "需求" --full           # 全量 prompt（assets/system-prompt.md 快照）
//   npx @af-mobile/prompt "需求" -o prompt.md     # 写入文件（默认 stdout）
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPrompt } from './index.mjs';

const args = process.argv.slice(2);
const outIdx = args.indexOf('-o');
const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
// 剔除 -o 及其值，剩余 - 开头为 flag，其余为需求描述
const rest = args.filter((a, i) => a !== '-o' && i !== outIdx + 1);
const flags = new Set(rest.filter(a => a.startsWith('-')));
const positional = rest.filter(a => !a.startsWith('-'));
const req = positional.join(' ');

if (!req && !flags.has('--full')) {
  console.log(`用法：
  npx @af-mobile/prompt "需求描述"          按需求裁剪 system prompt（默认）
  npx @af-mobile/prompt "需求描述" --full   全量 prompt
  npx @af-mobile/prompt "需求描述" -o file  写入文件（默认 stdout）`);
  process.exit(positional.length ? 1 : 0);
}

let systemPrompt;
if (flags.has('--full')) {
  const { readFileSync } = await import('node:fs');
  systemPrompt = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'assets/system-prompt.md'), 'utf8');
} else {
  systemPrompt = buildPrompt({ userPrompt: req });
}

if (outPath) {
  writeFileSync(outPath, systemPrompt);
  console.error(`✓ ${outPath}（${systemPrompt.length} 字符）`);
} else {
  process.stdout.write(systemPrompt + '\n');
}
