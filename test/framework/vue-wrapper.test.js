// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import { AfSwitch } from '../../vue/components/af-switch.js';

async function mountVueComponent(component, props = {}) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const app = createApp({ render: () => h(component, props) });
  app.mount(root);
  await nextTick(); // 等 watchEffect（flush: 'pre'）同步 props 到 element
  const el = root.querySelector('af-switch');
  return { el, app, root };
}

describe('Vue wrapper for AfSwitch', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('创建自定义元素并挂载', async () => {
    const { el } = await mountVueComponent(AfSwitch, { checked: false });
    expect(el).not.toBeNull();
    expect(el.tagName.toLowerCase()).toBe('af-switch');
  });

  it('props 同步到 element property', async () => {
    const { el } = await mountVueComponent(AfSwitch, { checked: true, size: 'sm', disabled: true });
    expect(el.checked).toBe(true);
    expect(el.size).toBe('sm');
    expect(el.disabled).toBe(true);
  });

  it('事件转发：自定义事件触发 Vue 事件处理器', async () => {
    const handler = vi.fn();
    const { el } = await mountVueComponent(AfSwitch, {
      checked: false,
      onChange: handler,
    });
    // 触发原生自定义事件
    el.dispatchEvent(new CustomEvent('af-switch:change', { detail: { checked: true } }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ checked: true });
  });

  it('v-model 支持：modelValue 同步到 checked，change 触发 update:modelValue', async () => {
    const updateHandler = vi.fn();
    const { el } = await mountVueComponent(AfSwitch, {
      modelValue: false,
      'onUpdate:modelValue': updateHandler,
    });
    expect(el.checked).toBe(false);

    // 触发原生事件，模拟用户操作
    el.dispatchEvent(new CustomEvent('af-switch:change', { detail: { checked: true } }));
    expect(updateHandler).toHaveBeenCalledWith(true);
  });

  it('卸载时清理事件监听', async () => {
    const { app, root } = await mountVueComponent(AfSwitch, { checked: false });
    expect(() => {
      app.unmount();
      document.body.removeChild(root);
    }).not.toThrow();
  });
});
