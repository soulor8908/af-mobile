// af-mobile UI —— skill 文档代码块可执行性检查（防 API 漂移）
// 背景：skill md 里教的 import/导出名/register 标签若与发布包漂移（如 registerAll 已移除仍被教），
// AI 按文档生成的代码当场报错。本脚本扫描 skills/ 下 md 的代码块，校验：
//   1. import { X } from '@af-mobile/ui...' 的 X 必须是包真实导出
//   2. register('af-x', ...) 的标签必须在组件注册表
// 用法：node scripts/check-skill-exports.mjs [目录...]（默认 skills/）
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 提取 md 中所有 fenced 代码块内容
export function extractCodeBlocks(md) {
  const out = [];
  const re = /```[a-z]*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md))) out.push(m[1]);
  return out;
}

// 从代码块提取 import 的具名导出（from '@af-mobile/ui' / 'node_modules/@af-mobile/ui/...'）
export function extractImportedNames(code) {
  const names = new Set();
  const re = /import\s*\{([^}]*)\}\s*from\s*['"](?:node_modules\/)?@af-mobile\/ui[^'"]*['"]/g;
  let m;
  while ((m = re.exec(code))) {
    for (const part of m[1].split(',')) {
      const n = part.trim().split(/\s+as\s+/)[0].trim();
      if (n) names.add(n);
    }
  }
  return names;
}

// 从代码块提取 register('af-x', ...) 的标签
export function extractRegisterTags(code) {
  const tags = new Set();
  const re = /\bregister\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(code))) {
    for (const t of m[1].match(/'([a-z][a-z0-9-]*)'/g) || []) tags.add(t.slice(1, -1));
  }
  return tags;
}

// 校验一份 md：返回问题数组（空 = 通过）。label 为展示用的文件标识
export function checkMarkdown(md, { exports, components }, label = '') {
  const problems = [];
  const blocks = extractCodeBlocks(md);
  // 块外正文（禁止语境/示例表格）不参与校验，避免"禁止 registerAll"被误判为教学
  for (const block of blocks) {
    for (const name of extractImportedNames(block)) {
      if (!exports.has(name)) problems.push(`${label} import 的 '${name}' 不在 @af-mobile/ui 导出中`);
    }
    for (const tag of extractRegisterTags(block)) {
      if (!components.has(tag)) problems.push(`${label} register('${tag}') 的标签不在组件注册表中`);
    }
  }
  return problems;
}

// 静态解析 src/index.js 导出名（不能运行时 import：顶层 extends HTMLElement，node 下无此全局）
export function extractPkgExports(code) {
  const names = new Set();
  const blocks = code.match(/export\s*\{([^}]*)\}/g) || [];
  for (const b of blocks) {
    for (const part of b.slice(b.indexOf('{') + 1, -1).split(',')) {
      // `A` / `A as B` 都取最终名（as 后者）
      const segs = part.trim().split(/\s+as\s+/).filter(Boolean);
      const n = segs[segs.length - 1]?.trim();
      if (n && /^[A-Za-z_$][\w$]*$/.test(n)) names.add(n);
    }
  }
  for (const m of code.matchAll(/export\s+(?:const|function|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  return names;
}

function walkMdFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walkMdFiles(p));
    else if (entry.endsWith('.md')) out.push(p);
  }
  return out;
}

async function main() {
  const dirs = process.argv.slice(2).length ? process.argv.slice(2) : [join(ROOT, 'skills')];
  const exports = extractPkgExports(readFileSync(join(ROOT, 'src/index.js'), 'utf8'));
  const components = new Set(JSON.parse(readFileSync(join(ROOT, 'eslint-plugin-af-mobile/utils/whitelist-v1.json'), 'utf8')).components);

  let failed = false;
  for (const dir of dirs) {
    for (const file of walkMdFiles(dir)) {
      const rel = file.replace(ROOT + '/', '');
      const problems = checkMarkdown(readFileSync(file, 'utf8'), { exports, components }, rel);
      if (problems.length) {
        failed = true;
        console.error(`✗ ${rel}`);
        for (const p of problems) console.error(`  - ${p}`);
      } else {
        console.log(`✓ ${rel}`);
      }
    }
  }
  if (failed) {
    console.error('\nskill 文档存在 API 漂移：文档教的写法在当前发布包中不可执行');
    process.exit(1);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
