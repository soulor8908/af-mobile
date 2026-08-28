// test/eval-verdict.test.js
import { describe, it, expect } from 'vitest';
import { compareVerdict } from '../eval/verdict.mjs';

const report = (trapWin, trapLose, modes) => ({ byDifficulty: { trap: { total: 6, visualPassed: trapWin } }, errorModes: modes });

describe('复合判据', () => {
  it('判据①：trap 净胜 ≥2 成立', () => {
    const v = compareVerdict(report(5, 0, {}), report(3, 0, {}));
    expect(v.trapNetWin).toBe(2);
    expect(v.passed).toBe(true);
    expect(v.reasons).toContain('①A类trap净胜2题≥2');
  });

  it('判据②：错误模式计数差 ≥3 成立', () => {
    const v = compareVerdict(report(3, 0, {}), report(3, 0, { '漏-register': 4, '弹层未开': 1 }));
    expect(v.modeDiff).toBe(5);
    expect(v.passed).toBe(true);
  });

  it('双不达标不成立', () => {
    const v = compareVerdict(report(3, 0, { 'token 越界': 2 }), report(4, 0, { 'token 越界': 1 }));
    expect(v.passed).toBe(false);
  });
});
