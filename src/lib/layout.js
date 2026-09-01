// af-mobile UI —— 页面布局包装器（OPT-1）
// withLayout({ title, tabbar }, handler)：统一渲染 navbar + tabbar 骨架，
// tabbar 的 active 由**当前路径自动推导**，页面不再手填 activeIndex（消灭"配置错就静默错"）
// 纯 Light DOM + L2 白名单 class（.app-shell/.navbar/.tabbar/.tab-item），不依赖组件注册
// 用法：route('/today', withLayout(mainLayout, pageToday))
import { go } from './router.js';
import { escapeHtml as esc } from './html.js';

// 当前路径推导：hash 路由取 # 后段（本 router 始终 '#/...'），history 路由取 pathname
function currentPath() {
  const h = location.hash;
  return h.startsWith('#/') ? h.slice(1) : location.pathname;
}

// tabbar active 索引：精确匹配 > 前缀匹配（最长路径优先；'/' 仅兜底根路径，与 route 同口径忽略尾斜杠）
function activeIndex(items, path) {
  let best = -1;
  let bestLen = -1;
  for (let i = 0; i < items.length; i++) {
    const p = items[i].path;
    const hit = path === p || path.startsWith(p + '/');
    if (hit && p.length > bestLen) { best = i; bestLen = p.length; }
  }
  return best;
}

function tabbarHTML(items, path) {
  const ai = activeIndex(items, path);
  return items.map((t, i) => {
    const sel = i === ai;
    const icon = t.icon ? `<span data-role="icon">${esc(t.icon)}</span>` : '';
    const badge = t.badge != null && t.badge !== '' ? `<span class="badge">${esc(t.badge)}</span>` : '';
    const label = t.label ? `<span data-role="label">${esc(t.label)}</span>` : '';
    return `<button class="tab-item" role="tab" type="button" aria-selected="${sel}" tabindex="${sel ? '0' : '-1'}" data-path="${esc(t.path)}">${icon}${badge}${label}</button>`;
  }).join('');
}

// tabbar 点击委托导航 + 方向键导航（role=tablist 必须配键盘，否则 aria-selected 无意义）
function bindTabbar(bar) {
  bar.addEventListener('click', (e) => {
    const item = e.target.closest('.tab-item');
    if (!item) return;
    const path = item.dataset.path;
    if (path && path !== currentPath()) go(path);
  });
  bar.addEventListener('keydown', (e) => {
    const items = [...bar.querySelectorAll('.tab-item')];
    let i = items.indexOf(document.activeElement);
    if (i < 0) return;
    if (e.key === 'ArrowRight') i = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft') i = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = items.length - 1;
    else return;
    e.preventDefault();
    items[i].focus();
    items[i].click();
  });
}

function layoutHTML({ title, tabbar }, path) {
  const nav = title ? `<header class="navbar"><h1 class="title">${esc(title)}</h1></header>` : '';
  const bar = tabbar?.length ? `<nav class="tabbar" role="tablist">${tabbarHTML(tabbar, path)}</nav>` : '';
  return `<div class="app-shell">${nav}<main class="page-col scroll-y p-4" data-role="page"></main>${bar}</div>`;
}

/**
 * 页面布局包装器：navbar + tabbar 只写一遍，tabbar active 自动推导
 * @param {{ title?: string, tabbar?: Array<{ path: string, label?: string, icon?: string, badge?: string | number }> }} layout
 * @param {Function} handler 页面渲染函数，ctx.outlet 指向布局内容区
 * @returns {Function} 可直接传给 route() 的 handler
 */
export function withLayout(layout, handler) {
  return (params, ctx) => {
    ctx.outlet.innerHTML = layoutHTML(layout, currentPath());
    const bar = ctx.outlet.querySelector('.tabbar');
    if (bar) bindTabbar(bar);
    return handler(params, { ...ctx, outlet: ctx.outlet.querySelector('[data-role="page"]') });
  };
}
