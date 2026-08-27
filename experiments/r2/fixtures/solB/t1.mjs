// 评分器自检夹具：条件 B（k 词表）t1 参考解——仅验证 run.mjs 装配路径（k-flow.js 自动拷入本目录），不作为实验数据
import { html, signal, render } from './k-flow.js';

export function mount(el) {
  const c = signal(0);
  render(html`
    <button id="inc" @click=${() => c.set(v => v + 1)}>+</button>
    <button id="dec" @click=${() => c.set(v => v - 1)}>-</button>
    <span id="c">${() => c()}</span>
    <span id="sq">${() => c() * c()}</span>
  `, el);
}
