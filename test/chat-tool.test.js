import { describe, it, expect } from 'vitest';
import { defineTool } from '../src/chat/tool.js';

describe('defineTool', () => {
  it('合法工具直接返回', () => {
    const tool = defineTool({ name: 'x', execute: () => 1 });
    expect(tool.name).toBe('x');
  });
  it('缺少 name 或 execute 抛 TypeError', () => {
    expect(() => defineTool({ name: 'x' })).toThrow(TypeError);
    expect(() => defineTool({ execute: () => 1 })).toThrow(TypeError);
  });
});
