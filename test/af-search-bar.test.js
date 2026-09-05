import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfSearchBar } from '../src/components/af-search-bar.js';
customElements.define('af-search-bar', AfSearchBar);

function makeSearchBar(props = {}) {
  const el = new AfSearchBar();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-search-bar 基础渲染', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('渲染 sb-wrap + input + icon + clear', () => {
    const el = makeSearchBar();
    expect(el.$('.sb-wrap')).not.toBeNull();
    expect(el.$('.search-input')).not.toBeNull();
    expect(el.$('.sb-icon')).not.toBeNull();
    expect(el.$('.sb-clear')).not.toBeNull();
  });

  it('placeholder 传到 input', () => {
    const el = makeSearchBar({ placeholder: '搜索商品' });
    expect(el.$('.search-input').placeholder).toBe('搜索商品');
  });

  it('value 传到 input', () => {
    const el = makeSearchBar({ value: 'hello' });
    expect(el.$('.search-input').value).toBe('hello');
  });

  it('clearable=false 时不渲染清除按钮', () => {
    const el = makeSearchBar({ clearable: false });
    expect(el.$('.sb-clear')).toBeNull();
  });

  it('清除按钮初始 hidden（无值时）', () => {
    const el = makeSearchBar();
    expect(el.$('.sb-clear').hidden).toBe(true);
  });

  it('有值时清除按钮可见', () => {
    const el = makeSearchBar({ value: 'test' });
    expect(el.$('.sb-clear').hidden).toBe(false);
  });
});

describe('af-search-bar 交互', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('input 事件防抖后触发 af-search-bar:input', () => {
    vi.useFakeTimers();
    const el = makeSearchBar({ debounce: 300 });
    const handler = vi.fn();
    el.addEventListener('af-search-bar:input', handler);
    el.$('.search-input').value = 'abc';
    el.$('.search-input').dispatchEvent(new Event('input'));
    // 防抖内未触发
    expect(handler).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('abc');
    vi.useRealTimers();
  });

  it('debounce=0 时立即触发', () => {
    const el = makeSearchBar({ debounce: 0 });
    const handler = vi.fn();
    el.addEventListener('af-search-bar:input', handler);
    el.$('.search-input').value = 'xyz';
    el.$('.search-input').dispatchEvent(new Event('input'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('xyz');
  });

  it('Enter 触发 af-search-bar:search', () => {
    const el = makeSearchBar({ debounce: 0 });
    el.$('.search-input').value = 'query';
    const handler = vi.fn();
    el.addEventListener('af-search-bar:search', handler);
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    el.$('.search-input').dispatchEvent(event);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('query');
  });

  it('点击清除按钮清空值并触发 clear 事件', () => {
    const el = makeSearchBar({ value: 'test', debounce: 0 });
    const clearHandler = vi.fn();
    const inputHandler = vi.fn();
    el.addEventListener('af-search-bar:clear', clearHandler);
    el.addEventListener('af-search-bar:input', inputHandler);
    el.$('.sb-clear').click();
    expect(el.value).toBe('');
    expect(el.$('.search-input').value).toBe('');
    expect(el.$('.sb-clear').hidden).toBe(true);
    expect(clearHandler).toHaveBeenCalledTimes(1);
    expect(inputHandler).toHaveBeenCalledTimes(1);
  });

  it('focus() 聚焦 input', () => {
    const el = makeSearchBar();
    el.focus();
    expect(document.activeElement).toBe(el.$('.search-input'));
  });

  it('输入后清除按钮显示，清空后隐藏', () => {
    const el = makeSearchBar({ debounce: 0 });
    el.$('.search-input').value = 'text';
    el.$('.search-input').dispatchEvent(new Event('input'));
    expect(el.$('.sb-clear').hidden).toBe(false);
    el.$('.search-input').value = '';
    el.$('.search-input').dispatchEvent(new Event('input'));
    expect(el.$('.sb-clear').hidden).toBe(true);
  });
});

describe('af-search-bar 属性变化与清理', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('value 属性变化更新 input', () => {
    const el = makeSearchBar();
    el.setAttribute('value', 'newval');
    expect(el.$('.search-input').value).toBe('newval');
  });

  it('placeholder 属性变化更新 input', () => {
    const el = makeSearchBar();
    el.setAttribute('placeholder', '新占位');
    expect(el.$('.search-input').placeholder).toBe('新占位');
  });

  it('unmounted 清理定时器不报错', () => {
    vi.useFakeTimers();
    const el = makeSearchBar({ debounce: 300 });
    el.$('.search-input').value = 'abc';
    el.$('.search-input').dispatchEvent(new Event('input'));
    expect(() => document.body.removeChild(el)).not.toThrow();
    vi.useRealTimers();
  });

  it('XSS：placeholder 含 HTML 被转义，不创建实际 img 元素', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const el = makeSearchBar({ placeholder: evil });
    expect(el.$('.search-input').placeholder).toBe(evil);
    expect(el.querySelector('img')).toBeNull();
  });
});

describe('af-search-bar T0.11 Vant 对齐（sb-bar 外层 + action 取消区）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('默认渲染 .sb-bar 外层容器包裹 .sb-wrap', () => {
    const el = makeSearchBar();
    expect(el.$('.sb-bar')).not.toBeNull();
    expect(el.$('.sb-bar .sb-wrap')).not.toBeNull();
    expect(el.$('.sb-bar .search-input')).not.toBeNull();
  });

  it('默认无 action 取消区（showAction=false）', () => {
    const el = makeSearchBar();
    expect(el.$('.sb-action')).toBeNull();
  });

  it('showAction=true 渲染取消按钮，默认文案"取消"', () => {
    const el = makeSearchBar({ showAction: true });
    const action = el.$('.sb-action');
    expect(action).not.toBeNull();
    expect(action.textContent).toBe('取消');
  });

  it('cancelText 自定义取消文案', () => {
    const el = makeSearchBar({ showAction: true, cancelText: '关闭' });
    expect(el.$('.sb-action').textContent).toBe('关闭');
  });

  it('点击取消区触发 af-search-bar:cancel（携带当前值）', () => {
    const el = makeSearchBar({ showAction: true, value: '手机' });
    const handler = vi.fn();
    el.addEventListener('af-search-bar:cancel', handler);
    el.$('.sb-action').click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ value: '手机' });
  });

  it('cancelText 属性变化同步按钮文案', () => {
    const el = makeSearchBar({ showAction: true });
    el.setAttribute('cancel-text', '返回');
    expect(el.$('.sb-action').textContent).toBe('返回');
  });
});

describe('af-search-bar T0.11 Vant 对齐（sb-bar 外层 + action 取消区）', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('默认渲染 .sb-bar 外层容器包裹 .sb-wrap', () => {
    const el = makeSearchBar();
    expect(el.$('.sb-bar')).not.toBeNull();
    expect(el.$('.sb-bar .sb-wrap')).not.toBeNull();
    expect(el.$('.sb-bar .search-input')).not.toBeNull();
  });

  it('默认无 action 取消区（showAction=false）', () => {
    const el = makeSearchBar();
    expect(el.$('.sb-action')).toBeNull();
  });

  it('showAction=true 渲染取消按钮，默认文案"取消"', () => {
    const el = makeSearchBar({ showAction: true });
    const action = el.$('.sb-action');
    expect(action).not.toBeNull();
    expect(action.textContent).toBe('取消');
  });

  it('cancelText 自定义取消文案', () => {
    const el = makeSearchBar({ showAction: true, cancelText: '关闭' });
    expect(el.$('.sb-action').textContent).toBe('关闭');
  });

  it('点击取消区触发 af-search-bar:cancel（携带当前值）', () => {
    const el = makeSearchBar({ showAction: true, value: '手机' });
    const handler = vi.fn();
    el.addEventListener('af-search-bar:cancel', handler);
    el.$('.sb-action').click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ value: '手机' });
  });

  it('cancelText 属性变化同步按钮文案', () => {
    const el = makeSearchBar({ showAction: true });
    el.setAttribute('cancel-text', '返回');
    expect(el.$('.sb-action').textContent).toBe('返回');
  });
});
