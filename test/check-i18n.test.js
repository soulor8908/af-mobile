import { describe, it, expect } from 'vitest';
import { matchBrace, extractDictionaries, scanRefs, runCheck } from '../scripts/check-i18n.mjs';

describe('i18n / matchBrace', () => {
  it('基础配对与嵌套', () => {
    expect(matchBrace('{}', 0)).toBe(1);
    expect(matchBrace('{a:{b:1}}', 0)).toBe(8);
    expect(matchBrace('{a:1', 0)).toBe(-1);
  });

  it('值内 {n} 占位符不干扰配对', () => {
    const code = `{'bt.x': '已选 {n} 项'}`;
    expect(matchBrace(code, 0)).toBe(code.length - 1);
  });

  it('字符串内的花括号被跳过', () => {
    const code = `{'k': '}}{'}`;
    expect(matchBrace(code, 0)).toBe(code.length - 1);
  });

  it('引号转义被跳过', () => {
    const code = "{'k': 'a\\'b'}";
    expect(matchBrace(code, 0)).toBe(code.length - 1);
  });
});

describe('i18n / extractDictionaries', () => {
  it('主字典形态：locale 键对象', () => {
    const code = `export const messages = {
      'zh-CN': { 'bt.al': '回到顶部' },
      'en-US': { 'bt.al': 'Back to top' },
    };`;
    const { dicts, ranges } = extractDictionaries(code);
    expect(dicts['zh-CN'].has('bt.al')).toBe(true);
    expect(dicts['en-US'].has('bt.al')).toBe(true);
    expect(ranges).toHaveLength(2);
  });

  it('addMessages 形态：值内含 {n} 占位符', () => {
    const code = `addMessages('zh-CN', {
      'pc.em': '已抢光',
      'pc.hot': '热度 {n}',
    });`;
    const { dicts, ranges } = extractDictionaries(code);
    expect(dicts['zh-CN'].has('pc.em')).toBe(true);
    expect(dicts['zh-CN'].has('pc.hot')).toBe(true);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].locale).toBe('zh-CN');
  });

  it('花括号不匹配时抛错', () => {
    expect(() => extractDictionaries(`addMessages('zh-CN', { 'x.y': 'z' `)).toThrow(/不匹配/);
  });
});

describe('i18n / scanRefs', () => {
  it('字典区间内为定义，区间外命中引用', () => {
    const code = `
      addMessages('zh-CN', { 'bt.al': '回到顶部' });
      i18n: { '@title': ['bt.al'] },
    `;
    const { ranges } = extractDictionaries(code);
    expect(scanRefs(code, ranges)).toEqual(['bt.al']);
  });

  it('同 key 去重；非 key 形态（3 位前缀选择器）不误报', () => {
    const code = `t('sg.al'); t("sg.al"); querySelector('div.title')`;
    expect(scanRefs(code)).toEqual(['sg.al']);
  });
});

describe('i18n / 真实仓库基线', () => {
  const result = runCheck();

  it('全部静态 key 已注册且 zh/en 完全对齐', () => {
    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
  });

  it('规模符合预期且两语言条数一致', () => {
    expect(result.stats.refs).toBeGreaterThanOrEqual(50);
    expect(result.stats.zh).toBe(result.stats.en);
    expect(result.stats.zh).toBeGreaterThanOrEqual(50);
  });
});
