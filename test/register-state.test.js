// register 注册状态中心回归（P0：生产分包 entry↔chunk 循环死锁）
//
// 事故：入口顶层 `await register(...)`（TLA）+ 生产分包 → 组件 chunk 反向静态 import 入口
// chunk（共用模块 html/i18n 被划入入口）→ 互等：组件永不注册、页面空白、零报错。
// 修复契约：register() 只发起注册并登记 promise；router 渲染前 whenReady() 统一等待 ——
// 入口因此不再需要 TLA。本文件钉死：① whenReady 等待语义；② start 首渲染等待注册；
// ③ 看门狗开关；④ 四个注册入口错误文案/无参语义统一。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { register, whenReady, setRegisterTimeout, COMPONENT_TAGS } from '../src/index.js';
import { _resetRegistrations } from '../src/lib/register-state.js';
import { unknownTagError } from '../src/lib/register-error.js';
import {
  route, go, start, stop, _resetRouter,
} from '../src/lib/router.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  _resetRegistrations();
  _resetRouter();
  window.history.replaceState({}, '', '/');
  document.body.innerHTML = '<div id="app" data-router-outlet></div>';
});

describe('whenReady · 注册状态中心', () => {
  it('等待所有已发起的 register() 完成后组件已定义（入口无需 TLA）', async () => {
    const p = register('af-list', 'af-dialog');   // 故意不 await
    expect(customElements.get('af-list')).toBeUndefined();
    await whenReady();
    expect(customElements.get('af-list')).toBeTruthy();
    expect(customElements.get('af-dialog')).toBeTruthy();
    await p;   // register 自身 promise 也可独立 await（兼容旧用法）
  });

  it('无待办时立即 resolve', async () => {
    await whenReady();   // 不挂起即通过
  });

  it('等待期间新发起的注册也被覆盖', async () => {
    const first = register('af-list');
    const gate = whenReady();
    register('af-badge');   // 迟发注册
    await gate;
    expect(customElements.get('af-badge')).toBeTruthy();
    await first;
  });
});

describe('router 渲染前自动等待注册（P0 修复契约）', () => {
  it('start() 首渲染发生在注册完成之后：未注册完成时不渲染 outlet', async () => {
    window.history.replaceState({}, '', '#/p0');
    register('af-progress');   // 不 await：入口无 TLA
    route('/p0', (params, ctx) => { ctx.outlet.innerHTML = '<af-progress></af-progress>'; });
    start('#app', { hash: true });
    expect(document.querySelector('#app').innerHTML).toBe('');   // 注册未完成，首渲染被推迟
    await whenReady();
    await tick();
    expect(document.querySelector('#app').innerHTML).toContain('af-progress');
    expect(customElements.get('af-progress')).toBeTruthy();
    stop();
  });

  it('go() 的渲染也在注册完成后执行（property 注入安全）', async () => {
    register('af-rate');
    route('/rate', (params, ctx) => { ctx.outlet.innerHTML = '<af-rate></af-rate>'; });
    start('#app', { hash: true });
    await go('/rate');
    expect(customElements.get('af-rate')).toBeTruthy();
    stop();
  });
});

describe('看门狗（失败可见性）', () => {
  it('setRegisterTimeout 返回旧值，0 关闭', () => {
    const old = setRegisterTimeout(1234);
    expect(typeof old).toBe('number');
    expect(setRegisterTimeout(0)).toBe(1234);
    expect(setRegisterTimeout(old)).toBe(0);
  });

  it('正常加载不触发误报（超时告警只在卡死时出现）', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    setRegisterTimeout(30);
    await register('af-stepper');
    expect(err).not.toHaveBeenCalled();
    setRegisterTimeout(0);
    err.mockRestore();
  });
});

describe('注册 API 语义统一（主库 / chat / charts / blocks）', () => {
  it('四个入口的未知标签错误同文案：unknown component + 可用标签清单', async () => {
    const { registerChart } = await import('../src/charts/index.js');
    const { registerChat } = await import('../src/chat/index.js');
    const { registerBlocks } = await import('../src/blocks/index.js');
    const re = /unknown component: [\w-]+（可用标签：.+）/;
    await expect(register('af-nope')).rejects.toThrow(re);
    expect(() => registerChart('af-nope')).toThrow(re);
    expect(() => registerChat('af-nope')).toThrow(re);
    expect(() => registerBlocks('af-nope')).toThrow(re);
    // 前缀统一为包名，可 grep 定位
    expect(unknownTagError('af-x', ['af-y']).message).toMatch(/^\[@af-mobile\/ui\] unknown component/);
  });

  it('registerChart() 无参 = 注册全部（与 registerChat()/registerBlocks() 对齐）', async () => {
    const { registerChart, CHART_TAGS } = await import('../src/charts/index.js');
    registerChart();
    for (const tag of Object.keys(CHART_TAGS)) expect(customElements.get(tag)).toBeTruthy();
  });

  it('registerBlocks(...tags) 变参只注册指定标签（旧单参写法兼容）', async () => {
    const { registerBlocks } = await import('../src/blocks/index.js');
    registerBlocks('af-product-card');
    expect(customElements.get('af-product-card')).toBeTruthy();
    expect(customElements.get('af-setting-group')).toBeUndefined();
  });

  it('register 幂等：已定义的标签不重复加载', async () => {
    class Stub extends HTMLElement {}
    customElements.define('af-countdown', Stub);
    await register('af-countdown');
    expect(customElements.get('af-countdown')).toBe(Stub);   // 未被真实组件覆盖
  });

  it('COMPONENT_TAGS 与可用清单一致', () => {
    expect(COMPONENT_TAGS.length).toBeGreaterThanOrEqual(30);
    expect(unknownTagError('af-x', COMPONENT_TAGS).message).toContain(COMPONENT_TAGS[0]);
  });
});
