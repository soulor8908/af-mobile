// test/eval-steps.test.js
import { describe, it, expect } from 'vitest';
import { STEP_ACTIONS, validateSteps, formatStepError } from '../eval/steps.mjs';

describe('eval steps DSL', () => {
  it('STEP_ACTIONS 含 5 个原语', () => {
    expect(STEP_ACTIONS).toEqual(['click', 'fill', 'pressKey', 'scroll', 'waitFor']);
  });

  it('合法 steps 通过校验', () => {
    expect(() => validateSteps([
      { action: 'click', sel: '#ck-2' },
      { action: 'fill', sel: 'af-search-bar input', value: '果' },
      { action: 'pressKey', sel: 'af-search-bar input', key: 'Enter' },
      { action: 'scroll', top: 9999 },
      { action: 'waitFor', sel: 'af-toast', timeout: 3000 },
    ])).not.toThrow();
  });

  it('未知 action 抛错', () => {
    expect(() => validateSteps([{ action: 'hover', sel: '#x' }])).toThrow(/未知 action/);
  });

  it('缺必填字段抛错（fill 缺 value / pressKey 缺 key / click 缺 sel）', () => {
    expect(() => validateSteps([{ action: 'fill', sel: '#x' }])).toThrow(/value/);
    expect(() => validateSteps([{ action: 'pressKey', sel: '#x' }])).toThrow(/key/);
    expect(() => validateSteps([{ action: 'click' }])).toThrow(/sel/);
  });

  it('formatStepError 带序号/action/首行错误', () => {
    const msg = formatStepError(1, { action: 'fill', sel: '#user', value: 'x' }, new Error('a\nb'));
    expect(msg).toBe('step#2 fill "#user" → a');
  });
});
