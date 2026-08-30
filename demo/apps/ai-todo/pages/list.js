// 列表页 —— 主库 CRUD 范式：createPage 同构（outlet 模板 + 事件 + ctx.signal 级联清理）
// 组件：af-swipe-cell（滑动删除）/ af-dialog（确认）/ af-toast（反馈）；全部白名单 class
import { escapeHtml as esc } from '../../src/index.js';
import { store } from '../store.js';

export default function listPage(params, ctx) {
  ctx.outlet.innerHTML = `
    <main class="page">
      <section class="hero">
        <p class="eyebrow">af-mobile 最小完整应用</p>
        <h1 class="display">待办</h1>
        <p class="subtitle">主库 CRUD · AI 助手通过工具直接操作这份数据</p>
      </section>
      <div class="form-row">
        <input class="input" id="new-title" placeholder="新待办标题" aria-label="新待办标题">
        <button class="btn" id="add-btn">添加</button>
      </div>
      <div class="list" id="rows" role="list"></div>
      <af-dialog id="confirm-del" title="删除待办">
        <div slot="body"><p class="body" id="del-title"></p></div>
        <div slot="footer">
          <button class="btn btn-ghost btn-block" data-act="cancel">取消</button>
          <button class="btn btn-danger btn-block" data-act="confirm">删除</button>
        </div>
      </af-dialog>
      <af-toast id="toast" aria-live="polite"></af-toast>
    </main>`;

  const rows = ctx.outlet.querySelector('#rows');
  const toast = ctx.outlet.querySelector('#toast');
  const dialog = ctx.outlet.querySelector('#confirm-del');
  let pendingDel = null;

  const rowHTML = (t) => `
    <af-swipe-cell role="listitem">
      <div slot="content" class="list-item fc">
        <input type="checkbox" class="checkbox" data-toggle="${t.id}" ${t.done ? 'checked' : ''} aria-label="切换完成状态">
        <span class="body flex-1 ${t.done ? 'text-muted' : ''}">${esc(t.title)}</span>
        ${t.due ? `<span class="caption text-muted">${esc(t.due)}</span>` : ''}
      </div>
      <div slot="right"><button class="btn btn-danger" data-del="${t.id}">删除</button></div>
    </af-swipe-cell>`;

  function render() {
    rows.innerHTML = store.todos.length
      ? store.todos.map(rowHTML).join('')
      : '<div class="empty"><p class="body">暂无待办，加一条或让 AI 帮你安排</p></div>';
    rows.querySelectorAll('af-swipe-cell').forEach((cell) => {
      cell.addEventListener('af-swipe-cell:action', () => {
        pendingDel = cell.querySelector('[data-del]').dataset.del;
        ctx.outlet.querySelector('#del-title').textContent =
          `确定删除「${store.todos.find((t) => t.id === pendingDel)?.title ?? ''}」吗？`;
        dialog.open();
      });
    });
  }

  ctx.outlet.querySelector('#add-btn').addEventListener('click', () => {
    const input = ctx.outlet.querySelector('#new-title');
    const title = input.value.trim();
    if (!title) return toast.show('先写点内容', { type: 'warning' });
    store.add(title);
    input.value = '';
    toast.show('已添加', { type: 'success' });
  });
  ctx.outlet.querySelector('#new-title').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') ctx.outlet.querySelector('#add-btn').click();
  });
  rows.addEventListener('change', (e) => {
    const id = e.target.closest('[data-toggle]')?.dataset.toggle;
    if (id) store.toggle(id);
  });
  dialog.querySelector('[data-act="confirm"]').addEventListener('click', () => dialog.close('confirm'));
  dialog.addEventListener('af-dialog:close', (e) => {
    if (e.detail.action === 'confirm' && pendingDel) {
      store.remove(pendingDel);
      toast.show('已删除', { type: 'success' });
    }
    pendingDel = null;
  });

  render();
  const unsub = store.subscribe(render);
  ctx.signal.addEventListener('abort', unsub);
}
