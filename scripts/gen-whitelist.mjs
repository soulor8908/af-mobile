// AIFlow UI —— whitelist-v1.json 生成器（单一真相源）
// 从 src/tokens.css + recipes.css + atomic.css + components/*.js 自动提取
// 用法：node scripts/gen-whitelist.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

// 从 CSS 文件提取所有 .class 名
export function extractClasses(file) {
  const css = readFileSync(file, 'utf8');
  const set = new Set();
  const re = /\.([a-z][a-z0-9-]*)/g;
  let m;
  while ((m = re.exec(css))) set.add(m[1]);
  return [...set].sort();
}

// 从 tokens.css 提取所有 --token 名
export function extractTokens(file) {
  const css = readFileSync(file, 'utf8');
  const set = new Set();
  const re = /(--[a-z][a-z0-9-]+)/g;
  let m;
  while ((m = re.exec(css))) set.add(m[1]);
  return [...set].sort();
}

// 从 src/index.js 的 REGISTRY 对象提取组件 tagName
export function extractComponents() {
  const code = readFileSync(join(SRC, 'index.js'), 'utf8');
  const set = new Set();
  const re = /'([a-z]+-[a-z-]+)':\s*Af[A-Z]/g;
  let m;
  while ((m = re.exec(code))) set.add(m[1]);
  return [...set].sort();
}

// 状态修饰符：不独立定义在 L2 配方 CSS，而是与其他 class 组合使用（如 .tab-item[aria-selected]）
// 由 Shadow 组件（af-swiper .dot.active / af-picker .item.active）使用，需手动登记
const STATE_MODIFIERS = ['active'];

// 从源码扫描，构造 whitelist 对象（A 集合）
export function buildWhitelistFromSources() {
  const recipe = extractClasses(join(SRC, 'recipes.css'));
  // 合并状态修饰符（去重）
  const recipeSet = new Set(recipe);
  for (const m of STATE_MODIFIERS) recipeSet.add(m);
  return {
    version: 'v1',
    aiflowVersion: '1.0.0',
    classes: {
      recipe: [...recipeSet].sort(),
      atomic: extractClasses(join(SRC, 'atomic.css')),
    },
    components: extractComponents(),
    tokens: extractTokens(join(SRC, 'tokens.css')),
    forbiddenInlineStyle: [
      'color', 'background', 'background-color', 'background-image',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'font-size', 'border-radius', 'box-shadow',
    ],
  };
}

// CLI 直接运行：写文件
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const whitelist = buildWhitelistFromSources();
  const outPath = join(ROOT, 'eslint-plugin-aiflow/utils/whitelist-v1.json');
  writeFileSync(outPath, JSON.stringify(whitelist, null, 2) + '\n');
  console.log(`✓ ${outPath}`);
  console.log(`  recipe: ${whitelist.classes.recipe.length}, atomic: ${whitelist.classes.atomic.length}`);
  console.log(`  components: ${whitelist.components.length}, tokens: ${whitelist.tokens.length}`);
}
