// af-mobile UI —— ARIA 要求同步检查（CI 闸门，docs/incidents.md #5）
// 双向校验：
//   1. aria-requirements.json 声明的每个必需字段，wc-aria-required.js 都有对应检测分支
//      （防止反模式：JSON 加了 "ariaChecked": true，但规则 JS 没写 if (req.ariaChecked && ...)）
//   2. aria-requirements.json 声明的组件，src/components/ 下必须存在对应文件（防拼写漂移）
//   3. JSON 中不允许出现未识别的字段（防字段名拼写错误被静默忽略）
// 用法：node scripts/check-aria-sync.mjs
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REQUIREMENTS_PATH = join(ROOT, 'eslint-plugin-af-mobile/utils/aria-requirements.json');
const RULE_PATH = join(ROOT, 'eslint-plugin-af-mobile/rules/wc-aria-required.js');
const COMPONENTS_DIR = join(ROOT, 'src/components');

// 规则支持的必需字段（role 单独处理，其余为布尔属性开关）
const REQUIREMENT_FIELDS = ['role', 'ariaLabel', 'ariaLive', 'ariaChecked'];
const ALLOWED_KEYS = new Set([...REQUIREMENT_FIELDS, 'description']);

/**
 * 计算同步问题
 * @param {Object} requirements - aria-requirements.json 内容
 * @param {string} ruleSource - wc-aria-required.js 源码
 * @param {boolean} checkFiles - 是否校验组件文件存在（测试时可关）
 * @returns {string[]} problems（空数组 = 完全同步）
 */
export function computeAriaSyncProblems(requirements, ruleSource, checkFiles = true) {
  const problems = [];
  for (const [comp, req] of Object.entries(requirements)) {
    // 组件文件存在性：主库 src/components/ 或 charts/chat 子库 src/{charts,chat}/components/
    if (checkFiles
      && !existsSync(join(COMPONENTS_DIR, comp + '.js'))
      && !existsSync(join(ROOT, 'src/charts/components', comp + '.js'))
      && !existsSync(join(ROOT, 'src/chat/components', comp + '.js'))) {
      problems.push(`组件 '${comp}' 在 aria-requirements.json 声明，但 src/components/（或 src/{charts,chat}/components/）下不存在`);
    }
    for (const key of Object.keys(req)) {
      if (!ALLOWED_KEYS.has(key)) {
        problems.push(`'${comp}' 包含未识别字段 '${key}'（合法字段：${[...REQUIREMENT_FIELDS].join(', ')}, description）`);
      }
    }
    for (const field of REQUIREMENT_FIELDS) {
      if (req[field]) {
        // JSON 声明了要求，规则 JS 必须有对应检测分支
        if (!ruleSource.includes(`req.${field} &&`)) {
          problems.push(`'${comp}' 声明了 ${field} 要求，但 wc-aria-required.js 缺少 'req.${field} &&' 检测分支`);
        }
      }
    }
  }
  return problems;
}

function main() {
  let requirements, ruleSource;
  try {
    requirements = JSON.parse(readFileSync(REQUIREMENTS_PATH, 'utf8'));
    ruleSource = readFileSync(RULE_PATH, 'utf8');
  } catch (e) {
    console.error('✗ 读取校验源失败：' + e.message);
    process.exit(2);
  }

  const problems = computeAriaSyncProblems(requirements, ruleSource);

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  ARIA 要求同步检查（JSON ↔ 规则 JS）             ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`aria-requirements.json 声明 ${Object.keys(requirements).length} 个组件`);

  if (problems.length === 0) {
    console.log('\n✓ ARIA 同步通过（每个声明字段均有对应检测分支）');
    process.exit(0);
  }
  console.log(`\n✗ ${problems.length} 项不同步：`);
  for (const p of problems) console.log('  - ' + p);
  console.log('\n  修复：');
  console.log('  - JSON 与规则不同步：在 wc-aria-required.js 补对应检测分支（docs/incidents.md #5）');
  console.log('  - 组件不存在：修正 aria-requirements.json 中的组件名拼写');
  console.log('  - 未识别字段：修正字段名拼写或删除多余字段');
  process.exit(1);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
