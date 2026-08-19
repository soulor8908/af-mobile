import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfPasswordInput } from '../src/components/af-password-input.js';
customElements.define('af-password-input', AfPasswordInput);

function makePi(props = {}) {
  const el = new AfPasswordInput();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-password-input Shadow DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('Shadow DOM 已挂载：含 cells 容器（role=group）', () => {
    const el = makePi();
    expect(el.shadowRoot).not.toBeNull();
    expect(el.$('.cells')).not.toBeNull();
    expect(el.$('.cells').getAttribute('role')).toBe('group');
  });

  it('渲染 length 个格子（默认 6）', () => {
    const el = makePi();
    expect(el.$$('.cell').length).toBe(6);
    const el4 = makePi({ length: 4 });
    expect(el4.$$('.cell').length).toBe(4);
  });

  it('mask=true：已填格子显示圆点，未填为空', () => {
    const el = makePi({ value: '123' });
    const cells = el.$$('.cell');
    expect(cells[0].querySelector('.dot')).not.toBeNull();
    expect(cells[2].querySelector('.dot')).not.toBeNull();
    expect(cells[3].querySelector('.dot')).toBeNull();
  });

  it('mask=false：明文显示数字（验证码模式）', () => {
    const el = makePi({ value: '123', mask: false });
    const cells = el.$$('.cell');
    expect(cells[0].textContent).toBe('1');
    expect(cells[1].textContent).toBe('2');
    expect(cells[2].textContent).toBe('3');
    expect(cells[3].textContent).toBe('');
  });

  it('focused=true：光标落在首个空格子；填满后不显示', () => {
    const el = makePi({ value: '12', focused: true });
    const cells = el.$$('.cell');
    expect(cells[2].querySelector('.caret')).not.toBeNull();
    expect(cells[0].querySelector('.caret')).toBeNull();
    // 填满：无光标
    el.value = '123456';
    expect(el.$$('.caret').length).toBe(0);
  });

  it('focused=false：不显示光标', () => {
    const el = makePi({ value: '12' });
    expect(el.$$('.caret').length).toBe(0);
  });

  it('value 填满 length：派发 af-password-input:complete', () => {
    const el = makePi({ value: '12345' });
    const handler = vi.fn();
    el.addEventListener('af-password-input:complete', handler);
    el.value = '123456';
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ value: '123456' });
    // 值未变（同字符串）不重复派发
    el.value = '123456';
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('初始即满的 value：挂载时不误发 complete', () => {
    const el = makePi({ value: '123456' });
    const handler = vi.fn();
    el.addEventListener('af-password-input:complete', handler);
    // 挂载后无事件（complete 仅在挂载后的 value 变化时派发）
    expect(handler).not.toHaveBeenCalled();
    // 但格子已满
    expect(el.$$('.cell')[5].querySelector('.dot')).not.toBeNull();
  });

  it('XSS：mask=false 时特殊字符被转义，不执行脚本', () => {
    const el = makePi({ value: '<img', mask: false });
    expect(el.$$('.cell img').length).toBe(0);
    expect(el.$$('.cell')[0].textContent).toBe('<');
  });

  it('aria-label 含输入进度（value 变化后刷新）', () => {
    const el = makePi({ value: '12' });
    expect(el.$('.cells').getAttribute('aria-label')).toContain('2/6');
    el.value = '123';
    expect(el.$('.cells').getAttribute('aria-label')).toContain('3/6');
  });

  it('length/mask/focused 变化触发重渲染', () => {
    const el = makePi();
    el.length = 4;
    expect(el.$$('.cell').length).toBe(4);
    el.value = '1';
    // 显式属性关闭掩码（AGENTS.md #10："false" 字符串解析为 false；
    // property 路径 default-true 布尔设 false 走 removeAttribute 空操作，不触发变更回调）
    el.setAttribute('mask', 'false');
    expect(el.$$('.cell')[0].textContent).toBe('1');
    el.focused = true;
    expect(el.$$('.cell')[1].querySelector('.caret')).not.toBeNull();
  });
});
