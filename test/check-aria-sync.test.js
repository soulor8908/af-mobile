// ARIA 要求同步检查测试（aria-requirements.json ↔ wc-aria-required.js，docs/incidents.md #5）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeAriaSyncProblems } from '../scripts/check-aria-sync.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REQUIREMENTS = JSON.parse(readFileSync(join(ROOT, 'eslint-plugin-af-mobile/utils/aria-requirements.json'), 'utf8'));
const RULE_SOURCE = readFileSync(join(ROOT, 'eslint-plugin-af-mobile/rules/wc-aria-required.js'), 'utf8');

// 规则 JS 的检测分支片段（真实文件按此模式编写，测试用真实文件）
const RULE_WITH_ALL_BRANCHES = `
  if (req.role && !hasRole(req.role)) {}
  if (req.ariaLabel && !source.includes('aria-label')) {}
  if (req.ariaLive && !source.includes('aria-live')) {}
  if (req.ariaChecked && !source.includes('aria-checked')) {}
`;

describe('aria-sync / computeAriaSyncProblems', () => {
  it('JSON 声明的字段全部有检测分支 → 无问题', () => {
    const req = {
      'af-dialog': { role: 'dialog', ariaLabel: true },
      'af-switch': { role: 'switch', ariaChecked: true },
      'af-toast': { role: 'status', ariaLive: true },
    };
    expect(computeAriaSyncProblems(req, RULE_WITH_ALL_BRANCHES, false)).toEqual([]);
  });

  it('JSON 声明但规则 JS 缺检测分支 → 报告（docs/incidents.md #5 反模式）', () => {
    const req = { 'af-switch': { role: 'switch', ariaChecked: true } };
    // 规则缺 ariaChecked 分支
    const rule = `
      if (req.role && !hasRole(req.role)) {}
      if (req.ariaLabel && !source.includes('aria-label')) {}
    `;
    expect(computeAriaSyncProblems(req, rule, false)).toEqual([
      `'af-switch' 声明了 ariaChecked 要求，但 wc-aria-required.js 缺少 'req.ariaChecked &&' 检测分支`,
    ]);
  });

  it('role 声明也要求检测分支', () => {
    const req = { 'af-list': { role: 'list' } };
    expect(computeAriaSyncProblems(req, `// no role branch`, false)).toEqual([
      `'af-list' 声明了 role 要求，但 wc-aria-required.js 缺少 'req.role &&' 检测分支`,
    ]);
  });

  it('JSON 出现未识别字段 → 报告（防拼写错误被静默忽略）', () => {
    const req = { 'af-dialog': { role: 'dialog', ariaLable: true } };   // 拼错 ariaLabel
    expect(computeAriaSyncProblems(req, RULE_WITH_ALL_BRANCHES, false)).toEqual([
      `'af-dialog' 包含未识别字段 'ariaLable'（合法字段：role, ariaLabel, ariaLive, ariaChecked, description）`,
    ]);
  });

  it('声明的组件文件不存在 → 报告', () => {
    const req = { 'af-not-a-real-component': { role: 'dialog' } };
    const problems = computeAriaSyncProblems(req, RULE_WITH_ALL_BRANCHES, true);
    expect(problems.some(p => p.includes('af-not-a-real-component'))).toBe(true);
  });
});

describe('aria-sync / 真实仓库基线', () => {
  it('当前 aria-requirements.json 与 wc-aria-required.js 完全同步', () => {
    expect(computeAriaSyncProblems(REQUIREMENTS, RULE_SOURCE)).toEqual([]);
  });
});
