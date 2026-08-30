// 统计页 —— charts 子库范式：registerChart 注册（子入口）+ labels/series 响应 store 变化
import { store } from '../store.js';

export default function statsPage(params, ctx) {
  ctx.outlet.innerHTML = `
    <main class="page">
      <section class="hero">
        <p class="eyebrow">charts 子库</p>
        <h1 class="display">统计</h1>
        <p class="subtitle">af-chart-bar · 数据实时跟随待办变化</p>
      </section>
      <div class="card p-3">
        <p class="section-tt">完成情况</p>
        <af-chart-bar id="chart" legend></af-chart-bar>
      </div>
      <div class="stats-grid" id="grid" role="list" aria-label="统计数字"></div>
    </main>`;

  const chart = ctx.outlet.querySelector('#chart');
  const grid = ctx.outlet.querySelector('#grid');

  function render() {
    const done = store.todos.filter((t) => t.done).length;
    const open = store.todos.length - done;
    chart.labels = ['已完成', '未完成'];
    chart.series = [{ name: '数量', values: [done, open] }];
    grid.innerHTML = `
      <div class="card" role="listitem"><p class="stat-num">${store.todos.length}</p><p class="caption text-muted">全部</p></div>
      <div class="card" role="listitem"><p class="stat-num">${done}</p><p class="caption text-muted">已完成</p></div>
      <div class="card" role="listitem"><p class="stat-num">${open}</p><p class="caption text-muted">未完成</p></div>`;
  }

  render();
  const unsub = store.subscribe(render);
  ctx.signal.addEventListener('abort', unsub);
}
