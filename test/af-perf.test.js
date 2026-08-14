import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AfElement } from '../packages/ui/src/lib/af-element.js';

class PerfTestEl extends AfElement {
  static useShadow = false;
  constructor() {
    super();
    this.renderCount = 0;
    this.updateAttrs = [];
  }
  mounted() { this.renderCount++; }
  onRender() { this.renderCount++; }
  onUpdate(attr) { this.updateAttrs.push(attr); }
  onAttributeChange() {}
}
AfElement.defineProp(PerfTestEl.prototype, 'count', { type: Number, default: 0 });
customElements.define('perf-test-el', PerfTestEl);

describe('运行时性能监控钩子（onRender/onUpdate + onPerf）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    AfElement._perf.clear();
  });

  it('onRender：首次挂载渲染后触发', () => {
    const el = new PerfTestEl();
    document.body.appendChild(el);
    // mounted 1 次 + onRender 1 次
    expect(el.renderCount).toBe(2);
  });

  it('onUpdate：属性变化更新处理后触发，携带属性名', () => {
    const el = new PerfTestEl();
    document.body.appendChild(el);
    el.count = 42;
    expect(el.updateAttrs).toContain('count');
  });

  it('全局 onPerf：收到 render 事件（type/tagName/duration）', () => {
    const events = [];
    const off = AfElement.onPerf((e) => events.push(e));
    const el = new PerfTestEl();
    document.body.appendChild(el);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('render');
    expect(events[0].tagName).toBe('perf-test-el');
    expect(typeof events[0].duration).toBe('number');
    off();
  });

  it('全局 onPerf：收到 update 事件并携带 attr', () => {
    const events = [];
    const off = AfElement.onPerf((e) => events.push(e));
    const el = new PerfTestEl();
    document.body.appendChild(el);
    el.count = 7;
    const updates = events.filter((e) => e.type === 'update');
    expect(updates.some((e) => e.attr === 'count')).toBe(true);
    off();
  });

  it('取消函数可注销订阅', () => {
    const cb = vi.fn();
    const off = AfElement.onPerf(cb);
    off();
    const el = new PerfTestEl();
    document.body.appendChild(el);
    expect(cb).not.toHaveBeenCalled();
  });

  it('未实现钩子的组件不报错（默认零开销路径）', () => {
    class Plain extends AfElement {
      static useShadow = false;
      mounted() {}
    }
    customElements.define('perf-plain-el', Plain);
    const el = new Plain();
    expect(() => document.body.appendChild(el)).not.toThrow();
  });
});
