// L4 §6.2 三源同步检查测试（A 源码 ↔ B whitelist ↔ C Prompt）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  diff,
  findMissingInPrompt,
  computeSyncProblems,
  buildPromptC,
} from '../scripts/check-whitelist-sync.mjs';
import { buildWhitelistFromSources } from '../scripts/gen-whitelist.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WL_PATH = join(ROOT, 'eslint-plugin-af-mobile/utils/whitelist-v1.json');
const B = JSON.parse(readFileSync(WL_PATH, 'utf8'));

// 构造最小化 whitelist 对象（computeSyncProblems 只用到这些字段）
function fakeWl({ recipe = [], atomic = [], components = [], tokens = [] } = {}) {
  return { classes: { recipe, atomic }, components, tokens };
}

describe('whitelist-sync / diff', () => {
  it('返回 a 中不在 b 的元素', () => {
    expect(diff(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c']);
  });

  it('空集差', () => {
    expect(diff([], ['a', 'b'])).toEqual([]);
    expect(diff(['a', 'b'], [])).toEqual(['a', 'b']);
  });

  it('相同集合返回空', () => {
    expect(diff(['a', 'b'], ['b', 'a'])).toEqual([]);
  });

  it('保留重复元素', () => {
    expect(diff(['a', 'a', 'b'], ['b'])).toEqual(['a', 'a']);
  });
});

describe('whitelist-sync / findMissingInPrompt', () => {
  it('所有条目都在 Prompt 中 → 返回空', () => {
    const wl = fakeWl({
      recipe: ['btn'],
      atomic: ['p-4'],
      components: ['af-dialog'],
      tokens: ['--c-brand'],
    });
    const C = '`btn` `p-4` `<af-dialog>` `--c-brand` | `<af-dialog>` |';
    expect(findMissingInPrompt(wl, C)).toEqual([]);
  });

  it('recipe class 未注入 → 报告', () => {
    const wl = fakeWl({ recipe: ['btn', 'card'] });
    // 只注入 btn，card 漏掉
    expect(findMissingInPrompt(wl, '`btn`')).toEqual([
      `class 'card' 在 whitelist 但 Prompt 未注入`,
    ]);
  });

  it('atomic class 未注入 → 报告', () => {
    const wl = fakeWl({ atomic: ['p-4'] });
    expect(findMissingInPrompt(wl, '')).toEqual([
      `class 'p-4' 在 whitelist 但 Prompt 未注入`,
    ]);
  });

  it('component 未注入 → 报告', () => {
    const wl = fakeWl({ components: ['af-dialog'] });
    expect(findMissingInPrompt(wl, '')).toEqual([
      `component 'af-dialog' 在 whitelist 但 Prompt 未注入`,
    ]);
  });

  it('component 标签在白名单节但 L3 简表缺失 → 报告（P0-3 场景）', () => {
    const wl = fakeWl({ components: ['af-dialog'] });
    // 标签 `<af-dialog>` 在，但简表行 | `<af-dialog>` | 缺失 → AI 拿不到属性/事件用法
    expect(findMissingInPrompt(wl, '`<af-dialog>`')).toEqual([
      `component 'af-dialog' 在 whitelist 但 L3 组件简表缺失（检查 build-prompt.mjs 的 COMPONENT_META）`,
    ]);
  });

  it('token 未注入 → 报告', () => {
    const wl = fakeWl({ tokens: ['--c-brand'] });
    expect(findMissingInPrompt(wl, '')).toEqual([
      `token '--c-brand' 在 whitelist 但 Prompt 未注入`,
    ]);
  });

  it('注意：仅匹配反引号包裹的 class，避免子串误命中', () => {
    // 不应把 "btn-ghost" 当作 "btn" 命中
    const wl = fakeWl({ recipe: ['btn', 'btn-ghost'] });
    const C = '`btn-ghost`';
    expect(findMissingInPrompt(wl, C)).toEqual([
      `class 'btn' 在 whitelist 但 Prompt 未注入`,
    ]);
  });
});

describe('whitelist-sync / computeSyncProblems', () => {
  it('A=B=C 时无差异', () => {
    const A = fakeWl({ recipe: ['btn'], atomic: ['p-4'], components: ['af-dialog'], tokens: ['--c-brand'] });
    const C = '`btn` `p-4` `<af-dialog>` `--c-brand` | `<af-dialog>` |';
    expect(computeSyncProblems(A, A, C)).toEqual([]);
  });

  it('A 有但 B 无 → 报告 A\\B', () => {
    const A = fakeWl({ recipe: ['btn', 'card'] });
    const B_ = fakeWl({ recipe: ['btn'] });
    expect(computeSyncProblems(A, B_, '`btn`')).toEqual([
      `recipe class 'card' 在源码但未登记 whitelist`,
    ]);
  });

  it('B 有但 A 无 → 报告 B\\A', () => {
    const A = fakeWl({ recipe: ['btn'] });
    const B_ = fakeWl({ recipe: ['btn', 'card'] });
    expect(computeSyncProblems(A, B_, '`btn` `card`')).toEqual([
      `recipe class 'card' 在 whitelist 但源码不存在`,
    ]);
  });

  it('B 有但 C 未注入 → 报告 B\\C', () => {
    const A = fakeWl({ recipe: ['btn', 'card'] });
    const B_ = fakeWl({ recipe: ['btn', 'card'] });
    expect(computeSyncProblems(A, B_, '`btn`')).toEqual([
      `class 'card' 在 whitelist 但 Prompt 未注入`,
    ]);
  });

  it('同时报 A\\B、B\\A、B\\C 三类', () => {
    const A = fakeWl({ recipe: ['btn', 'extra-in-src'], atomic: ['p-4'] });
    const B_ = fakeWl({ recipe: ['btn', 'extra-in-wl'], atomic: ['p-4'] });
    const C = '`btn`'; // 漏 extra-in-wl 和 p-4
    const problems = computeSyncProblems(A, B_, C);
    expect(problems).toContain(`recipe class 'extra-in-src' 在源码但未登记 whitelist`);
    expect(problems).toContain(`recipe class 'extra-in-wl' 在 whitelist 但源码不存在`);
    expect(problems).toContain(`class 'extra-in-wl' 在 whitelist 但 Prompt 未注入`);
    expect(problems).toContain(`class 'p-4' 在 whitelist 但 Prompt 未注入`);
  });

  it('四类条目都参与 diff（recipe/atomic/component/token）', () => {
    const A = fakeWl({
      recipe: ['btn'],
      atomic: ['p-4'],
      components: ['af-dialog'],
      tokens: ['--c-brand'],
    });
    const B_ = fakeWl({
      recipe: ['btn', 'extra-recipe'],
      atomic: ['p-4', 'extra-atomic'],
      components: ['af-dialog', 'af-extra'],
      tokens: ['--c-brand', '--extra-token'],
    });
    const problems = computeSyncProblems(A, B_, '`btn` `p-4` `<af-dialog>` `--c-brand` | `<af-dialog>` |');
    // 4 个 B\A + 4 个 B\C = 8
    expect(problems).toHaveLength(8);
    expect(problems.some(p => p.includes('extra-recipe'))).toBe(true);
    expect(problems.some(p => p.includes('extra-atomic'))).toBe(true);
    expect(problems.some(p => p.includes('af-extra'))).toBe(true);
    expect(problems.some(p => p.includes('--extra-token'))).toBe(true);
  });
});

describe('whitelist-sync / 真实仓库基线', () => {
  // A = 源码扫描，B = whitelist，C = build-prompt 输出
  const A = buildWhitelistFromSources();

  it('A 与 B 完全同步（无 A\\B、无 B\\A）', () => {
    const aMinusB = [
      ...diff(A.classes.recipe, B.classes.recipe),
      ...diff(A.classes.atomic, B.classes.atomic),
      ...diff(A.components, B.components),
      ...diff(A.tokens, B.tokens),
    ];
    expect(aMinusB).toEqual([]);

    const bMinusA = [
      ...diff(B.classes.recipe, A.classes.recipe),
      ...diff(B.classes.atomic, A.classes.atomic),
      ...diff(B.components, A.components),
      ...diff(B.tokens, A.tokens),
    ];
    expect(bMinusA).toEqual([]);
  });

  it('buildPromptC 生成 Prompt 不抛错', () => {
    expect(() => buildPromptC()).not.toThrow();
  });

  it('B 与 C 完全同步（whitelist 全部注入 Prompt）', () => {
    const C = buildPromptC();
    expect(findMissingInPrompt(B, C)).toEqual([]);
  });

  it('三源同步综合：computeSyncProblems 返回空', () => {
    const C = buildPromptC();
    expect(computeSyncProblems(A, B, C)).toEqual([]);
  });
});
