// form-dialog.test.js —— openFormDialog schema 表单对话框（OPT-2）
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openFormDialog } from '../src/lib/form-dialog.js';
import { AfDialog } from '../src/components/af-dialog.js';
import { AfField } from '../src/components/af-field.js';

// 未注册场景必须在 define 之前测（customElements 全局，注册后无法撤销）
describe('openFormDialog 未注册保护', () => {
  it('af-dialog/af-field 未注册时抛错并给出指引', () => {
    expect(() => openFormDialog({ schema: {} })).toThrow(/register\("af-dialog", "af-field"\)/);
  });
});

const SCHEMA = {
  properties: {
    title: { type: 'string', title: '标题', description: '必填项' },
    priority: { type: 'number', title: '优先级' },
    level: { enum: [['h', '高'], ['l', '低']] },
    note: { type: 'string', format: 'textarea' },
  },
  required: ['title'],
};

describe('openFormDialog（已注册）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    if (!customElements.get('af-dialog')) customElements.define('af-dialog', AfDialog);
    if (!customElements.get('af-field')) customElements.define('af-field', AfField);
  });

  const field = (dialog, key) => dialog.querySelector(`af-field[data-key="${key}"]`);

  it('按 schema 渲染字段：label/input-type/textarea/select/help', () => {
    const dialog = openFormDialog({ title: '新建待办', schema: SCHEMA });
    expect(dialog.shadowRoot.querySelector('.title').textContent).toContain('新建待办');
    const f = field(dialog, 'title');
    expect(f.getAttribute('label')).toBe('标题');
    expect(f.getAttribute('help')).toBe('必填项');
    expect(field(dialog, 'priority').getAttribute('input-type')).toBe('number');
    expect(field(dialog, 'note').getAttribute('type')).toBe('textarea');
    const select = field(dialog, 'level').querySelector('select');
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(2);
    expect(select.options[0].textContent).toBe('高');
  });

  it('required 为空时提交被拦截：onSubmit 不执行且显示错误', () => {
    const onSubmit = vi.fn();
    const dialog = openFormDialog({ schema: SCHEMA, onSubmit });
    dialog.querySelector('[data-role="submit"]').click();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(field(dialog, 'title').error).toBe('必填');
    // 不关闭
    expect(dialog.isOpen).toBe(true);
  });

  it('合法提交：值收集 + number 归一 + 关闭并移除', async () => {
    const onSubmit = vi.fn();
    const dialog = openFormDialog({ schema: SCHEMA, onSubmit });
    field(dialog, 'title').value = '写周报';
    field(dialog, 'priority').value = '3';
    field(dialog, 'level').querySelector('select').value = 'l';
    dialog.querySelector('[data-role="submit"]').click();
    await new Promise((r) => setTimeout(r, 0));
    expect(onSubmit).toHaveBeenCalledWith({ title: '写周报', priority: 3, level: 'l', note: '' });
    expect(dialog.isOpen).toBe(false);
    expect(document.body.contains(dialog)).toBe(false);
  });

  it('number 字段非数字：显示数字校验错误且不提交', () => {
    const onSubmit = vi.fn();
    const dialog = openFormDialog({ schema: SCHEMA, onSubmit });
    field(dialog, 'title').value = 'x';
    field(dialog, 'priority').value = 'abc';
    dialog.querySelector('[data-role="submit"]').click();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(field(dialog, 'priority').error).toBe('请输入数字');
  });

  it('onSubmit 返回 false 阻止关闭', async () => {
    const onSubmit = vi.fn(() => false);
    const dialog = openFormDialog({ schema: SCHEMA, onSubmit });
    field(dialog, 'title').value = 'x';
    dialog.querySelector('[data-role="submit"]').click();
    await new Promise((r) => setTimeout(r, 0));
    expect(onSubmit).toHaveBeenCalled();
    expect(dialog.isOpen).toBe(true);
  });

  it('取消按钮关闭并移除', () => {
    const dialog = openFormDialog({ schema: SCHEMA });
    dialog.querySelector('[data-role="cancel"]').click();
    expect(document.body.contains(dialog)).toBe(false);
  });
});
