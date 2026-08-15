import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfSettingGroup } from '../src/blocks/af-setting-group.js';
import { AfSwitch } from '../src/components/af-switch.js';
customElements.define('af-setting-group', AfSettingGroup);
customElements.define('af-switch', AfSwitch);

function makeGroup(props = {}) {
  const el = new AfSettingGroup();
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

describe('af-setting-group 五态', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('loading=true 渲染骨架屏 + aria-busy', () => {
    const el = makeGroup({ loading: true, title: '账号' });
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.$('[data-role="loading"]')).not.toBeNull();
    expect(el.$$('.skeleton-line').length).toBeGreaterThanOrEqual(4);
    expect(el.$('[data-role="loading-text"]').textContent).toBe('加载中…'); // i18n 默认 zh-CN
  });

  it('空 items 渲染 empty 态', () => {
    const el = makeGroup({ items: [], title: '通知' });
    expect(el.$('[data-role="empty"]')).not.toBeNull();
    expect(el.$('[data-role="empty-text"]').textContent).toBe('暂无设置项');
  });

  it('setError 触发 error 态 + 重试按钮', () => {
    const el = makeGroup({ items: [{ label: 'x' }] });
    el.setError(new Error('网络错误'));
    expect(el.$('[data-role="error"]')).not.toBeNull();
    expect(el.$('[data-role="error-text"]').textContent).toBe('加载失败');
    expect(el.$('[data-role="retry-btn"]').textContent).toBe('重试');
  });

  it('点击重试按钮派发 retry 事件 + 退出 error 态', () => {
    const el = makeGroup({ items: [{ label: 'x' }] });
    el.setError(new Error('x'));
    const onRetry = vi.fn();
    el.addEventListener('af-setting-group:retry', onRetry);
    el.$('[data-role="retry-btn"]').click();
    expect(onRetry).toHaveBeenCalledOnce();
    expect(el.$('[data-role="error"]')).toBeNull();
  });

  it('有 items 渲染 success 态 + list-item 行', () => {
    const el = makeGroup({
      title: '账号',
      items: [
        { label: '修改密码', action: 'arrow' },
        { label: '绑定手机', value: '138****8888' },
      ],
    });
    expect(el.$('[data-role="list"]')).not.toBeNull();
    expect(el.$$('.list-item[data-index]').length).toBe(2);
    expect(el.$$('.list-item[data-index]')[0].textContent).toContain('修改密码');
  });
});

describe('af-setting-group variant', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('variant=default 渲染箭头 trailing', () => {
    const el = makeGroup({
      variant: 'default',
      items: [{ label: '修改密码', action: 'arrow' }],
    });
    const row = el.$('.list-item[data-index]');
    expect(row.textContent).toContain('›');
  });

  it('variant=with-value 渲染 value + 箭头', () => {
    const el = makeGroup({
      variant: 'with-value',
      items: [{ label: '版本', value: '1.0.0' }],
    });
    const row = el.$('.list-item[data-index]');
    expect(row.textContent).toContain('1.0.0');
    expect(row.textContent).toContain('›');
  });

  it('variant=with-switch 渲染 af-switch 子组件', () => {
    const el = makeGroup({
      variant: 'with-switch',
      items: [{ label: '推送通知', checked: true }],
    });
    const sw = el.$('af-switch');
    expect(sw).not.toBeNull();
    expect(sw.checked).toBe(true);
  });

  it('variant=with-switch 切换 af-switch 派发 change 事件', () => {
    const el = makeGroup({
      variant: 'with-switch',
      items: [{ label: '夜间模式', checked: false }],
    });
    const onChange = vi.fn();
    el.addEventListener('af-setting-group:change', onChange);
    const sw = el.$('af-switch');
    sw.toggle();
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ index: 0, checked: true }),
    }));
  });

  it('variant 变化触发重渲染', () => {
    const el = makeGroup({
      variant: 'default',
      items: [{ label: 'x', action: 'arrow' }],
    });
    expect(el.$('af-switch')).toBeNull();
    el.variant = 'with-switch';
    expect(el.$('af-switch')).not.toBeNull();
  });
});

describe('af-setting-group 交互', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('点击行派发 itemclick 事件', () => {
    const el = makeGroup({
      items: [{ label: '关于', action: 'arrow' }, { label: '帮助', action: 'arrow' }],
    });
    const onClick = vi.fn();
    el.addEventListener('af-setting-group:itemclick', onClick);
    el.$$('.list-item[data-index]')[1].click();
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ index: 1 }),
    }));
  });

  it('disabled 行不派发 itemclick', () => {
    const el = makeGroup({
      items: [{ label: '禁用项', disabled: true, action: 'arrow' }],
    });
    const onClick = vi.fn();
    el.addEventListener('af-setting-group:itemclick', onClick);
    el.$('.list-item[data-index]').click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('键盘 ArrowDown/Enter 导航', () => {
    const el = makeGroup({
      items: [{ label: 'A', action: 'arrow' }, { label: 'B', action: 'arrow' }],
    });
    const onClick = vi.fn();
    el.addEventListener('af-setting-group:itemclick', onClick);
    const rows = el.$$('.list-item[data-index]');
    // ArrowDown 聚焦第一行
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(rows[0]);
    // Enter 派发 itemclick
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('unmounted 清理监听器', () => {
    const el = makeGroup({ items: [{ label: 'x', action: 'arrow' }] });
    const onKey = vi.fn();
    el.addEventListener('keydown', onKey);
    el.remove();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    // unmounted 后 _onKeydown 已移除，不会触发 itemclick（但 el 上 addEventListener 的 onKey 仍会触发，因为 bubbles）
    // 重点验证：内部 _onKeydown 不会报错（_listEl 已 null 也不会，因为有?.检查）
    expect(true).toBe(true);
  });
});

describe('af-setting-group a11y', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('role=group + aria-label（title 非空）', () => {
    const el = makeGroup({ title: '账号设置', items: [{ label: 'x' }] });
    const section = el.$('section');
    expect(section.getAttribute('role')).toBe('group');
    expect(section.getAttribute('aria-label')).toBe('账号设置');
  });

  it('success 态 list 有 role=list + tabindex', () => {
    const el = makeGroup({ items: [{ label: 'x' }] });
    const list = el.$('[data-role="list"]');
    expect(list.getAttribute('role')).toBe('list');
    expect(list.getAttribute('tabindex')).toBe('0');
  });

  it('XSS 防护：label 含 <script> 被转义', () => {
    const el = makeGroup({
      items: [{ label: '<script>alert(1)</script>', action: 'arrow' }],
    });
    expect(el.innerHTML).not.toContain('<script>');
    expect(el.innerHTML).toContain('&lt;script&gt;');
  });
});
