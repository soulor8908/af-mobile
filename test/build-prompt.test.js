// L4 §2.3 build-prompt.mjs 注入结果测试
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  extractGroupsFromCss,
  extractProjectExtensions,
  buildWhitelistSection,
  buildProjectExtensionSection,
} from '../scripts/build-prompt.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WL = JSON.parse(readFileSync(join(ROOT, 'eslint-plugin-aiflow/utils/whitelist-v1.json'), 'utf8'));
// v1.7.3：recipes.css 已拆为 4 层 + 聚合入口，分组注释在分层文件里
const RECIPES_LAYER_FILES = ['recipes-core.css', 'recipes-form.css', 'recipes-feedback.css', 'recipes-display.css'];
const RECIPES_CSS = RECIPES_LAYER_FILES.map(f => readFileSync(join(ROOT, 'src', f), 'utf8')).join('\n');
const ATOMIC_CSS = readFileSync(join(ROOT, 'src/atomic.css'), 'utf8');

describe('build-prompt / extractGroupsFromCss', () => {
  it('从 recipes.css 提取分组', () => {
    const groups = extractGroupsFromCss(RECIPES_CSS);
    expect(groups.length).toBeGreaterThan(0);
    const names = groups.map(g => g.name);
    expect(names).toContain('按钮（7）');
    expect(names).toContain('容器（5）');
    // 每个分组都至少有一个 class
    for (const g of groups) expect(g.classes.length).toBeGreaterThan(0);
  });

  it('从 atomic.css 提取分组', () => {
    const groups = extractGroupsFromCss(ATOMIC_CSS);
    const names = groups.map(g => g.name);
    expect(names).toContain('间距 padding（9）');
    expect(names).toContain('颜色（6）');
  });

  it('排除后代组合选择器里的 class（避免误归类）', () => {
    // .list > .cell 这种后代/兄弟组合选择器不被认为是该分组的独占 class
    const css = `/* === A === */\n.a1, .a2 { color: red; }\n.b > .c + .d { color: blue; }\n`;
    const groups = extractGroupsFromCss(css);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('A');
    // 只 .a1 .a2 是独占规则集；.b > .c + .d 被排除
    expect(groups[0].classes).toEqual(['a1', 'a2']);
  });

  it('无分组注释时返回空数组', () => {
    expect(extractGroupsFromCss('.btn { color: red; }')).toEqual([]);
  });
});

describe('build-prompt / extractProjectExtensions', () => {
  it('解析 /* === N. 用途 === */ 编号块', () => {
    const css = [
      '/* === 1. 营销活动 banner === */',
      '.campaign-banner { color: var(--c-brand); }',
      '/* === 2. 限时秒杀 === */',
      '.seckill-card { padding: var(--s-2); }',
    ].join('\n');
    const items = extractProjectExtensions(css);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ num: 1, desc: '营销活动 banner' });
    expect(items[0].classes).toContain('campaign-banner');
    expect(items[1]).toMatchObject({ num: 2, desc: '限时秒杀' });
    expect(items[1].classes).toContain('seckill-card');
  });

  it('无项目扩展时返回空数组', () => {
    expect(extractProjectExtensions('')).toEqual([]);
    expect(extractProjectExtensions('/* 普通注释 */\n.btn {}')).toEqual([]);
  });
});

describe('build-prompt / buildWhitelistSection', () => {
  const recipeGroups = extractGroupsFromCss(RECIPES_CSS);
  const atomicGroups = extractGroupsFromCss(ATOMIC_CSS);
  const section = buildWhitelistSection(WL, recipeGroups, atomicGroups);

  it('recipe 总数与 whitelist 一致', () => {
    expect(section).toContain('L2 配方（' + WL.classes.recipe.length + ' 个');
  });

  it('atomic 总数与 whitelist 一致', () => {
    expect(section).toContain('L2 原子（' + WL.classes.atomic.length + ' 个');
  });

  it('组件总数与 whitelist 一致', () => {
    expect(section).toContain('L3 真组件标签（' + WL.components.length + ' 个');
  });

  it('token 总数与 whitelist 一致', () => {
    expect(section).toContain('L1 Token 变量（' + WL.tokens.length + ' 个');
  });

  it('所有 recipe class 都被注入（反引号包裹）', () => {
    for (const c of WL.classes.recipe) {
      expect(section).toContain('`' + c + '`');
    }
  });

  it('所有 atomic class 都被注入（反引号包裹）', () => {
    for (const c of WL.classes.atomic) {
      expect(section).toContain('`' + c + '`');
    }
  });

  it('所有 component 都被注入为 <tag> 形态', () => {
    for (const c of WL.components) {
      expect(section).toContain('`<' + c + '>`');
    }
  });

  it('所有 token 都被注入（反引号包裹）', () => {
    for (const t of WL.tokens) {
      expect(section).toContain('`' + t + '`');
    }
  });

  it('状态修饰符未登记到 AI 白名单（.active 仅 Shadow DOM 内部使用）', () => {
    // .active 是 Shadow 组件内部态，不登记到 L2 白名单，避免 AI 在 Light DOM 误用
    expect(WL.classes.recipe).not.toContain('active');
    expect(section).not.toContain('状态修饰符');
  });

  it('forbiddenInlineStyle 列出', () => {
    for (const p of WL.forbiddenInlineStyle) {
      expect(section).toContain('`' + p + '`');
    }
  });

  it('CSS 分组名出现在注入结果中', () => {
    // 按钮分组
    expect(section).toContain('**按钮（7）：**');
  });
});

describe('build-prompt / buildProjectExtensionSection', () => {
  it('无扩展返回空字符串', () => {
    expect(buildProjectExtensionSection([])).toBe('');
  });

  it('有扩展时输出编号 + 描述 + class', () => {
    const section = buildProjectExtensionSection([
      { num: 1, desc: '营销活动', classes: ['campaign-banner', 'seckill'] },
      { num: 2, desc: '空分组', classes: [] },
    ]);
    expect(section).toContain('1. 营销活动');
    expect(section).toContain('`.campaign-banner`');
    expect(section).toContain('`.seckill`');
    // 空分组也要出现，但不含 class 列表
    expect(section).toContain('2. 空分组');
  });
});

describe('build-prompt / 端到端：生成 Prompt 与三源同步', () => {
  // 用 build-prompt.mjs 跑一遍拿 stdout（与 CI 同源）
  const res = spawnSync('node', [join(ROOT, 'scripts/build-prompt.mjs')], { encoding: 'utf8' });
  const prompt = res.stdout;

  it('build-prompt.mjs 退出码为 0', () => {
    expect(res.status).toBe(0);
  });

  it('Prompt 含白名单节标题', () => {
    expect(prompt).toContain('# L2 白名单');
    expect(prompt).toContain('L2 配方');
    expect(prompt).toContain('L2 原子');
    expect(prompt).toContain('L3 真组件标签');
    expect(prompt).toContain('L1 Token 变量');
  });

  it('Prompt 注入所有 whitelist 条目', () => {
    for (const c of [...WL.classes.recipe, ...WL.classes.atomic]) {
      expect(prompt).toContain('`' + c + '`');
    }
    for (const c of WL.components) {
      expect(prompt).toContain('`<' + c + '>`');
    }
    for (const t of WL.tokens) {
      expect(prompt).toContain('`' + t + '`');
    }
  });

  it('Prompt 含两个注入点占位已被替换（无残留）', () => {
    expect(prompt).not.toContain('WHITELIST_INJECTION_POINT');
    expect(prompt).not.toContain('PROJECT_EXTENSION_INJECTION_POINT');
  });

  it('Prompt 含 25 条禁令节', () => {
    expect(prompt).toContain('# 25 条禁令');
  });
});
