// chat 子库 sessions：多会话（查看历史/新增/删除）单文件三合一——仓库 + 列表 HTML + 绑定器
// 无组件方案（D-014）：light DOM 全部 L2 白名单 class（cardNode 同款先例）；弹层交给原生 Popover API（库 0 字节）
// 持久化防抖 300ms（流式逐 token notify 不能每帧 stringify 整个历史）；结构性操作同步 flush，UI 零感知延迟
// tree-shaking：af-chat 不静态依赖本文件，不用会话管理的消费端 0 付费
import { createSession } from './session.js';
import { escapeHtml as esc } from '../lib/html.js';
import { t } from '../lib/i18n.js';

/**
 * 创建多会话仓库
 * @param {object} [opts] - endpoint/requestFn/tools/systemPrompt 透传 createSession；storage 为 localStorage key（缺省内存模式）
 */
export function createSessions(opts = {}) {
  const storage = opts.storage ? globalThis.localStorage : null;
  const listeners = new Set();
  let records = [];
  try { records = JSON.parse(storage?.getItem(opts.storage) ?? '[]') ?? []; } catch {}
  let activeId = records.at(-1)?.id ?? null;
  const sessions = new Map();
  let tid = 0;
  const flush = () => {
    clearTimeout(tid);
    try { storage?.setItem(opts.storage, JSON.stringify(records)); } catch {}
    listeners.forEach((fn) => fn());
  };
  const notify = () => { clearTimeout(tid); tid = setTimeout(flush, 300); };   // 流式高频通知防抖

  function attach(rec) {
    const s = createSession({ ...opts, initialMessages: rec.messages ?? [] });   // storage 键对 createSession 无害
    sessions.set(rec.id, s);
    s.subscribe(() => { rec.messages = s.messages; notify(); });   // 变更即落盘（防抖）
    return s;
  }
  records.forEach(attach);

  return {
    records,
    get activeId() { return activeId; },
    active() { return sessions.get(activeId) ?? null; },
    select(id) { if (sessions.has(id)) { activeId = id; flush(); } },
    create() {
      const rec = { id: crypto.randomUUID(), title: t('cs.new'), createdAt: Date.now(), messages: [] };
      records.push(rec); attach(rec); activeId = rec.id; flush();
      return rec;
    },
    remove(id) {
      const i = records.findIndex((r) => r.id === id);
      if (i < 0) return;
      records.splice(i, 1); sessions.delete(id);
      if (activeId === id) activeId = records.at(-1)?.id ?? null;
      flush();
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

/** 列表 HTML（宿主挂任意容器，配合原生 popover=auto；active 项 aria-current，样式宿主 1 行可选） */
export function sessionsHTML(store) {
  return `<button class="btn btn-ghost" data-new="1">${esc(t('cs.new'))}</button><div class="list" role="list">` +
    store.records.map((r) =>
      `<div class="list-item" role="listitem"${r.id === store.activeId ? ' aria-current="true"' : ''} data-id="${esc(r.id)}">` +
      `<span class="body">${esc(r.title)}</span>` +
      `<button class="btn btn-ghost" data-rm="1" aria-label="${t('cs.del')}">×</button></div>`).join('') + '</div>';
}

/** 渲染 + 事件委托 + 自动重渲染；传 target（af-chat 元素）则自动换绑 session（含初次） */
export function bindSessions(el, store, target) {
  const paint = () => { el.innerHTML = sessionsHTML(store); if (target) target.session = store.active(); };
  paint();
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-new]')) return void store.create();
    const it = e.target.closest('[data-id]');
    if (!it) return;
    if (e.target.closest('[data-rm]')) store.remove(it.dataset.id);
    else store.select(it.dataset.id);
  });
  store.subscribe(paint);
}
