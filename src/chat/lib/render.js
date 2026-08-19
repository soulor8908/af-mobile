// af-chat 渲染器：纯函数（bubbleHTML/updateBubble/cardNode/chipsHTML/toolCallMap）
// 气泡在 shadow 内渲染（调用方负责容器）；卡片节点是 light DOM（白名单 class，slot 投影）
// 体积口径：shadow 私有 class 用 1-2 字符缩写（.m.u/.m.a/.m.t 气泡、.x 文本、.tw 工具区、.c 芯片）
import { escapeHtml as esc } from '../../lib/af-element.js';

/** 从消息列表收集 tool_call id → name 映射（tool 消息芯片显示用） */
export function toolCallMap(messages) {
  const map = {};
  for (const m of messages)
    for (const b of m.content)
      if (b.type === 'tool_call') map[b.id] = b.name;
  return map;
}

const textOf = (m) => m.content.filter((b) => b.type === 'text').map((b) => b.text).join('');

/** 气泡骨架 HTML（shadow 内）：.m.u 右侧品牌色 / .m.a 左侧含投影位 / .m.t 完成态芯片 */
export function bubbleHTML(msg, callMap) {
  if (msg.role === 'user')
    return `<div class="m u" data-id="${esc(msg.id)}">${esc(textOf(msg))}</div>`;
  if (msg.role === 'tool') {
    const b = msg.content.find((x) => x.type === 'tool_result');
    return `<div class="m t" data-id="${esc(msg.id)}"><span class="c done">✓ ${esc(callMap[b?.id] ?? '')}</span></div>`;
  }
  return `<div class="m a" data-id="${esc(msg.id)}"><div class="tw"></div><span class="x"></span><span class="cu" hidden></span><slot name="card-${esc(msg.id)}"></slot></div>`;
}

/** assistant 气泡增量更新：流式文本（textContent 防 XSS）+ 芯片 + 光标 + aria-hidden 时序 + 完成播报 */
export function updateBubble(el, msg, callMap, streaming) {
  if (msg.role !== 'assistant') return;
  const q = el.querySelector.bind(el);
  const txt = q('.x');
  const next = textOf(msg);
  if (txt.textContent !== next) txt.textContent = next;
  const calls = msg.content.filter((b) => b.type === 'tool_call');
  const tools = q('.tw');
  if (tools.childElementCount !== calls.length) {
    tools.innerHTML = calls.map((c) => `<span class="c run" data-id="${esc(c.id)}">${esc(c.name)}…</span>`).join('');
  }
  q('.cu').hidden = !streaming;
  if (streaming) {
    txt.setAttribute('aria-hidden', 'true'); // 流式逐字不进 live region 播报
    q('.sr')?.remove();
  } else {
    txt.removeAttribute('aria-hidden');
    // 完成一次性播报：sr-only 节点进入 live region 触发
    if (!q('.sr') && next) {
      const sr = document.createElement('span');
      sr.className = 'sr';
      sr.textContent = next;
      el.appendChild(sr);
    }
  }
}

/** light DOM 卡片节点（白名单 class；slot=card-{msgId} 投影进对应气泡） */
export function cardNode(msgId, block, t) {
  const card = block.card ?? {};
  const el = document.createElement('div');
  el.className = 'card fc g-2 p-3';
  el.slot = `card-${msgId}`;
  el.dataset.cardId = block.id ?? msgId;
  const title = card.title ? `<div class="title">${esc(card.title)}</div>` : '';
  if (card.kind === 'confirm') {
    const btn = (a, c, l) => `<button class="btn${c}" data-${a}="1">${esc(l)}</button>`;
    const rows = (card.rows ?? []).map((r) =>
      `<div class="fc g-1"><span class="caption text-muted">${esc(r.label)}</span><span class="body">${esc(r.value)}</span></div>`).join('');
    el.innerHTML = `${title}${rows}<div class="actions">` +
      btn('confirm', card.danger ? ' btn-danger' : '', card.confirmText ?? t('ct.cf')) +
      btn('cancel', ' btn-ghost', card.cancelText ?? t('ct.cn')) + '</div>';
  } else if (card.kind === 'list') {
    const cap = (v) => `<span class="caption text-muted">${esc(v)}</span>`;
    const items = (card.items ?? []).map((i) =>
      `<div class="list-item"><div class="fc g-1"><span class="body">${esc(i.title)}</span>` +
      `${i.desc ? cap(i.desc) : ''}${i.meta ? cap(i.meta) : ''}</div></div>`).join('');
    el.innerHTML = `${title}<div class="list">${items}</div>`;
  } else {
    el.innerHTML = `${title}<span class="body">${esc(card.text ?? JSON.stringify(card))}</span>`;
  }
  return el;
}

/** actions 卡片 → composer 上方快捷回复 chips HTML（shadow 内） */
export function chipsHTML(card) {
  return (card.options ?? []).map((o) =>
    `<button class="cb" data-value="${esc(o.value)}">${esc(o.label)}</button>`).join('');
}
