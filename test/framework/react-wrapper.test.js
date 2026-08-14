// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import React, { act } from 'react';
import { AfSwitch } from '../../react/components/af-switch.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function mountReactComponent(component, props = {}) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const clientRoot = createRoot(root);
  await act(async () => {
    clientRoot.render(React.createElement(component, props));
  });
  const el = root.querySelector('af-switch');
  return { el, clientRoot, root };
}

describe('React wrapper for AfSwitch', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('创建自定义元素并挂载', async () => {
    const { el } = await mountReactComponent(AfSwitch, { checked: false });
    expect(el).not.toBeNull();
    expect(el.tagName.toLowerCase()).toBe('af-switch');
  });

  it('props 同步到 element property', async () => {
    const { el } = await mountReactComponent(AfSwitch, { checked: true, size: 'sm', disabled: true });
    expect(el.checked).toBe(true);
    expect(el.size).toBe('sm');
    expect(el.disabled).toBe(true);
  });

  it('事件回调：自定义事件触发 React on* 回调', async () => {
    const handler = vi.fn();
    const { el } = await mountReactComponent(AfSwitch, {
      checked: false,
      onChange: handler,
    });
    // 触发原生自定义事件
    el.dispatchEvent(new CustomEvent('af-switch:change', { detail: { checked: true } }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ checked: true });
  });

  it('非 props 属性透传到 HTML attribute', async () => {
    const { el } = await mountReactComponent(AfSwitch, {
      checked: false,
      className: 'test-class',
      id: 'test-id',
      'data-test': 'value',
    });
    expect(el.className).toBe('test-class');
    expect(el.id).toBe('test-id');
    expect(el.getAttribute('data-test')).toBe('value');
  });

  it('卸载时清理事件监听', async () => {
    const { clientRoot, root } = await mountReactComponent(AfSwitch, { checked: false });
    await act(async () => { clientRoot.unmount(); });
    expect(() => document.body.removeChild(root)).not.toThrow();
  });
});
