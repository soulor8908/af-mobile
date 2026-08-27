// af-mobile UI —— af-list Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
import { html } from '../../src/lib/af-element.js';

export default {
  tag: 'af-list',
  name: '长列表',
  scenarios: [
    {
      name: '长列表',
      html: `
        <style>
          /* subtitle 拆段配色：货币符号 muted，价格品牌色高亮（var(--*) 不硬编码） */
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
  ],
};
