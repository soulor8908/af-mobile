// af-mobile UI —— af-tabbar Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-tabbar',
  name: '底部标签栏',
  scenarios: [
    {
      name: '标签切换',
      html: `
        <af-tabbar id="tb" active-index="0"></af-tabbar>
        <p class="caption" id="tb-log">切换触发 af-tabbar:change</p>
      `,
      main: { selector: '#tb' },
      props: [
        { prop: 'activeIndex', label: '激活项', type: 'number', min: 0, max: 3, step: 1 },
      ],
      events: ['af-tabbar:change'],
      init: () => {
        const tb = document.getElementById('tb');
        tb.tabs = [
          { label: '首页', icon: '🏠', value: 'home' },
          { label: '分类', icon: '📋', value: 'cat' },
          { label: '消息', icon: '💬', value: 'msg', badge: '3' },
          { label: '我的', icon: '👤', value: 'me' },
        ];
        const log = document.getElementById('tb-log');
        tb.addEventListener('af-tabbar:change', (e) => { if (log) log.textContent = `index=${e.detail.index} value=${e.detail.value}`; });
      },
    },
  ],
};
