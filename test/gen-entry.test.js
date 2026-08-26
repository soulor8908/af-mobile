// 入口清单 codegen 闸门（第三步：元数据自动生成）
// src/index.js 与 src/charts/index.js 的 gen 标记区域必须与生成器扫描输出一致；
// 新增/删除组件文件后若未跑 npm run entry，此处即失败（与 CLI --check 等价）
import { describe, it, expect } from 'vitest';
import { generateAll, fileToClass, TARGETS } from '../scripts/gen-entry.mjs';

describe('gen-entry 文件名推导', () => {
  it('af-*.js → Af 类名（kebab → PascalCase）', () => {
    expect(fileToClass('af-list.js')).toBe('AfList');
    expect(fileToClass('af-number-keyboard.js')).toBe('AfNumberKeyboard');
    expect(fileToClass('af-chart-line.js')).toBe('AfChartLine');
  });
});

describe('gen-entry 提交态一致性', () => {
  for (const target of TARGETS) {
    it(`${target.label} 入口标记区域与扫描结果一致（漂移时跑 npm run entry）`, () => {
      const r = generateAll().find((x) => x.label === target.label);
      expect(r.before, `${r.file} 与生成结果不一致`).toBe(r.after);
    });
  }

  it('main 排除 af-data.js（L3.5 Block 层数据源元素不进组件导出）', () => {
    const r = generateAll().find((x) => x.label === 'main');
    expect(r.after.includes("from './components/af-data.js'")).toBe(false);
  });
});
