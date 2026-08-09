// AIFlow UI —— whitelist-v1.json 生成器（单一真相源）
// 从 src/tokens.css + recipes.css + atomic.css + components/*.js 自动提取
// 用法：node scripts/gen-whitelist.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../');
const SRC = join(ROOT, 'src');

// 从 CSS 文件提取所有 .class 名
function extractClasses(file) {
  const css = readFileSync(file, 'utf8');
  const set = new Set();
  const re = /\.([a-z][a-z0-9-]+)/g;
  let m;
  while ((m = re.exec(css))) set.add(m[1]);
  return [...set].sort();
}

// 从 tokens.css 提取所有 --token 名
function extractTokens(file) {
  const css = readFileSync(file, 'utf8');
  const set = new Set();
  const re = /(--[a-z][a-z0-9-]+)/g;
  let m;
  while ((m = re.exec(css))) set.add(m[1]);
  return [...set].sort();
}

// 从 src/index.js 的 REGISTRY 对象提取组件 tagName
function extractComponents() {
  const code = readFileSync(join(SRC, 'index.js'), 'utf8');
  const set = new Set();
  const re = /'([a-z]+-[a-z-]+)':\s*Af[A-Z]/g;
  let m;
  while ((m = re.exec(code))) set.add(m[1]);
  return [...set].sort();
}

const whitelist = {
  version: 'v1',
  aiflowVersion: '1.0.0',
  classes: {
    recipe: extractClasses(join(SRC, 'recipes.css')),
    atomic: extractClasses(join(SRC, 'atomic.css')),
  },
  components: extractComponents(),
  tokens: extractTokens(join(SRC, 'tokens.css')),
  // L1-2 no-inline-style 规则用：7 大类 16 具体属性
  forbiddenInlineStyle: [
    'color', 'background', 'background-color', 'background-image',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'font-size', 'border-radius', 'box-shadow',
  ],
};

const outPath = join(ROOT, 'eslint-plugin-aiflow/utils/whitelist-v1.json');
writeFileSync(outPath, JSON.stringify(whitelist, null, 2) + '\n');
console.log(`✓ ${outPath}`);
console.log(`  recipe: ${whitelist.classes.recipe.length}, atomic: ${whitelist.classes.atomic.length}`);
console.log(`  components: ${whitelist.components.length}, tokens: ${whitelist.tokens.length}`);
