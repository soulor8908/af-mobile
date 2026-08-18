// af-mobile UI —— af-list Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-list',
  name: '长列表',
  scenarios: [
    {
      name: '长列表',
      html: `<af-list id="list"></af-list>`,
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
        list.data = Array.from({ length: 60 }, (_, i) => ({ title: `商品 ${i + 1}`, subtitle: `¥${((i + 1) * 9.9).toFixed(2)}` }));
        list.addEventListener('af-list:loadmore', () => {
          setTimeout(() => {
            const start = list.data.length;
            list.data = [...list.data, ...Array.from({ length: 20 }, (_, i) => ({ title: `商品 ${start + i + 1}`, subtitle: `¥${((start + i + 1) * 9.9).toFixed(2)}` }))];
            list.endLoadMore?.(true);
          }, 500);
        });
      },
    },
  ],
};