// AIFlow skill 安装器：把对话式脚手架 skill（aiflow-grill）装进任意项目
// 工具无关：只写中立路径 skills/，AGENTS.md 指向它作为单一真相源。
// 任何读 AGENTS.md 的 AI 工具（TRAE / Claude Code / Cursor / Codex / Copilot / Windsurf 等）
// 都能通过 AGENTS.md 找到 skill；不写 .trae/skills/ 或 .claude/skills/ 避免假设用户用某工具。
// 用法：node scripts/skill-add.mjs [目标目录=.]
//   库仓库内自举：node scripts/skill-add.mjs .
//   已发布包消费端：npx @af-mobile/ui skill add
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'skills/aiflow-grill/SKILL.md');

// 中立路径 skills/ 是 AGENTS.md 指向的真相源；不写工具特定目录避免污染
const TARGETS = [
  'skills/aiflow-grill/SKILL.md',
];

const AGENTS_MARK = '<!-- aiflow:skill-grill -->';
const AGENTS_SECTION = `
${AGENTS_MARK}
## AIFlow 对话式脚手架（aiflow-grill skill）

当用户想用 AIFlow（@af-mobile/ui）开发移动端 H5 应用，或提供 hi-fi/demo 页面要转成项目时，
先完整阅读并遵循 \`skills/aiflow-grill/SKILL.md\` 的流程：拷问需求 → 需求拆分表 → demo 确认
→ 一次性生成工程。未经用户确认需求拆分表和 demo，不要直接生成工程代码。
<!-- /aiflow:skill-grill -->
`;

const dir = resolve(process.argv[2] || '.');
const skill = readFileSync(SRC, 'utf8');

for (const rel of TARGETS) {
  const dest = join(dir, rel);
  mkdirSync(dirname(dest), { recursive: true });
  const synced = existsSync(dest) && readFileSync(dest, 'utf8') === skill;
  if (!synced) writeFileSync(dest, skill);
  console.log(`${synced ? '=' : '+'} ${rel}`);
}

// AGENTS.md 追加指引段（marker 守卫，幂等）
const agentsPath = join(dir, 'AGENTS.md');
const agents = existsSync(agentsPath) ? readFileSync(agentsPath, 'utf8') : '';
if (!agents.includes(AGENTS_MARK)) {
  writeFileSync(agentsPath, agents + (agents && !agents.endsWith('\n') ? '\n' : '') + AGENTS_SECTION);
  console.log('+ AGENTS.md (skill 指引段)');
} else {
  console.log('= AGENTS.md');
}
