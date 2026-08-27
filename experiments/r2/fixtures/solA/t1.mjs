// 评分器自检夹具：条件 A（主包词表）t1 参考解——仅验证 run.mjs 装配路径，不作为实验数据
import { signal, effect } from '@af-mobile/ui';

export function mount(el) {
  el.innerHTML = '<button id="inc">+</button><button id="dec">-</button><span id="c"></span><span id="sq"></span>';
  const c = signal(0);
  const cEl = el.querySelector('#c');
  const sqEl = el.querySelector('#sq');
  effect(() => { cEl.textContent = c(); sqEl.textContent = c() * c(); });
  el.querySelector('#inc').addEventListener('click', () => c.set(v => v + 1));
  el.querySelector('#dec').addEventListener('click', () => c.set(v => v - 1));
}
