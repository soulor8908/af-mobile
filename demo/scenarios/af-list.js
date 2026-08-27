// af-mobile UI —— af-list Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
import { html } from '../../src/lib/af-element.js';

export default {
  tag: 'af-list',
  name: '长列表',
  scenarios: [
    {
      name: '长列表',
      fewshot: {
        html: '<af-list id="list"></af-list>',
        js: `const list = document.getElementById('list');
list.data = [{ title: '商品 1', subtitle: '更新于 08-01' }]; // 数组注入，默认渲染 title/subtitle
list.addEventListener('af-list:itemclick', (e) => console.log(e.detail.index, e.detail.item));
list.addEventListener('af-list:loadmore', () => list.endLoadMore(false)); // 已到底：false 显示「没有更多」`,
        note: 'data 数组注入即渲染；自定义行样式用 renderItem；endLoadMore(hasMore) 控制翻页判停',
      },
      html: `
        <style>
          /* 豁免：subtitle 拆段配色（货币 muted / 价格品牌高亮）白名单 class 覆盖不了；
             data-role 限定选择器 + var(--*) 不硬编码（口径见 demo/README.md 样式豁免） */
          .subtitle [data-role="currency"] { color: var(--c-muted); }
          .subtitle [data-role="price"] { color: var(--c-brand); font-weight: var(--fw-medium); }
        </style>
        <af-list id="list"></af-list>
      `,
      main: { selector: 'af-list' },
      props: [
        { prop: 'refresh', label: '下拉刷新', type: 'boolean' },
        { prop: 'pageSize', label: '每页条数', type: 'number', min: 5, max: 50, step: 5 },
      ],
      events: ['af-list:itemclick', 'af-list:loadmore'],
      styleTokens: [
        { token: '--c-onbrand', label: '品牌色', type: 'color' },
      ],
      init: () => {
        const list = document.getElementById('list');

        // 自定义 renderItem：拆 currency + price 两段渲染
        // - html 模板自动 esc 不可信字段，防 XSS（docs/incidents.md #1）
        // - data-role 绕开白名单；配色用 var(--*) 不硬编码
        list.renderItem = (item, idx) => html`<div class="list-item" data-list-index="${idx}">
          <div class="flex-1">
            <div class="body">${item.title}</div>
            <div class="subtitle">
              <span data-role="currency">${item.currency}</span><span data-role="price">${item.price}</span>
            </div>
          </div>
        </div>`;

        list.data = Array.from({ length: 60 }, (_, i) => ({
          title: `商品 ${i + 1}`,
          currency: '¥',
          price: ((i + 1) * 9.9).toFixed(2),
        }));
        list.addEventListener('af-list:loadmore', () => {
          setTimeout(() => {
            const start = list.data.length;
            list.data = [...list.data, ...Array.from({ length: 20 }, (_, i) => ({
              title: `商品 ${start + i + 1}`,
              currency: '¥',
              price: ((start + i + 1) * 9.9).toFixed(2),
            }))];
            list.endLoadMore?.(true);
          }, 500);
        });
      },
    },
    {
      name: '紧凑模式与点击项',
      html: `
        <af-list id="list2" mode="compact" height="240px"></af-list>
        <p class="caption" id="list2-log">mode="compact" 紧凑行高 · 点击项触发 af-list:itemclick（detail 含 index 与 item）</p>
      `,
      main: { selector: '#list2' },
      props: [
        { prop: 'mode', label: '模式', type: 'select', options: ['normal', 'compact'] },
        { prop: 'height', label: '高度', type: 'string' },
      ],
      events: ['af-list:itemclick', 'af-list:loadmore'],
      init: () => {
        const list = document.getElementById('list2');
        const log = document.getElementById('list2-log');
        list.data = Array.from({ length: 30 }, (_, i) => ({
          title: `记录 ${i + 1}`,
          subtitle: `更新于 08-${String(i + 1).padStart(2, '0')}`,
        }));
        list.addEventListener('af-list:itemclick', (e) => {
          if (log) log.textContent = `点击第 ${e.detail.index} 项：${e.detail.item.title}`;
        });
        // 数据已全部加载：endLoadMore(false) 关闭后续加载并显示「没有更多」文案
        list.addEventListener('af-list:loadmore', () => list.endLoadMore(false));
      },
    },
  ],
};
