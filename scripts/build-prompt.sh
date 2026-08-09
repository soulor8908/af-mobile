#!/usr/bin/env bash
# AIFlow UI —— System Prompt 注入器
# 从 whitelist-v1.json 生成 AI 代码生成约束 prompt 片段
# 用法：bash scripts/build-prompt.sh > prompt-snippet.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WL="$ROOT/eslint-plugin-aiflow/utils/whitelist-v1.json"

if [ ! -f "$WL" ]; then
  echo "Error: $WL not found. Run 'npm run whitelist' first." >&2
  exit 1
fi

node -e "
const wl = require('$WL');
const lines = [];
lines.push('## AIFlow UI 代码生成约束');
lines.push('');
lines.push('### 允许的 class（L2 白名单）');
lines.push('');
lines.push('**Recipe class（' + wl.classes.recipe.length + ' 个）：**');
lines.push(wl.classes.recipe.map(c => '\`' + c + '\`').join(' '));
lines.push('');
lines.push('**Atomic class（' + wl.classes.atomic.length + ' 个）：**');
lines.push(wl.classes.atomic.map(c => '\`' + c + '\`').join(' '));
lines.push('');
lines.push('### 允许的组件（L3）');
lines.push(wl.components.map(c => '\`<' + c + '>\`').join(' '));
lines.push('');
lines.push('### 禁止的 inline style 属性');
lines.push(wl.forbiddenInlineStyle.map(p => '\`' + p + '\`').join(' '));
lines.push('');
lines.push('### 设计 token 变量');
lines.push(wl.tokens.map(t => '\`' + t + '\`').join(' '));
lines.push('');
lines.push('### 规则');
lines.push('1. 只使用上述白名单内的 class 和组件，不要发明新 class');
lines.push('2. 不要在 inline style 中使用 forbidden 属性，改用对应的 atomic class');
lines.push('3. 不要在 tokens.css 之外修改设计 token 变量');
lines.push('4. 事件名必须匹配 \`af-{component}:{action}\` 格式');
lines.push('5. Shadow DOM 组件的 CSS 必须使用 var(--*) token 变量');
lines.push('6. Light DOM 组件不能有内联样式或 <style> 标签');
lines.push('');
console.log(lines.join('\n'));
"
