import { describe, it, expect } from 'vitest';
import { createMessage } from './message.js';

describe('createMessage', () => {
  it('默认 user 角色、空内容、字符串 id', () => {
    const m = createMessage();
    expect(m.role).toBe('user');
    expect(m.content).toEqual([]);
    expect(typeof m.id).toBe('string');
  });
  it('保留传入字段', () => {
    const m = createMessage({ role: 'assistant', content: [{ type: 'text', text: 'hi' }] });
    expect(m.role).toBe('assistant');
    expect(m.content).toEqual([{ type: 'text', text: 'hi' }]);
  });
});
