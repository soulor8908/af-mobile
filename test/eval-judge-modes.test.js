// test/eval-judge-modes.test.js
import { describe, it, expect } from 'vitest';
import { tagErrorModes } from '../eval/judge.mjs';

describe('judge 错误模式标签', () => {
  it('lint 错误归类：token 越界 / 事件名错 / 错误引路', () => {
    const modes = tagErrorModes(
      [{ errors: [
        { rule: 'af-mobile/token-whitelist', message: "Class 'h-full' not in whitelist" },
        { rule: 'af-mobile/wc-event-naming', message: '事件名必须 af-x:y' },
        { rule: 'af-mobile/semantic-visual', message: "The requested module '/af-mobile.js' does not provide an export named 'registerChart'" },
      ] }],
      [],
    );
    expect(modes).toEqual({ 'token 越界': 1, '事件名错': 1, '错误引路': 1 });
  });

  it('视觉失败归类：弹层组件不可见=弹层未开，普通组件不可见/缺少=漏-register', () => {
    const modes = tagErrorModes([], [
      { fails: ['af-number-keyboard 不可见', 'af-tabbar 不可见', '缺少 af-toast'] },
    ]);
    expect(modes).toEqual({ '弹层未开': 1, '漏-register': 2 });
  });
});
