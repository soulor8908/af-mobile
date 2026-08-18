// AIFlow UI —— af-tabs Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-tabs',
  name: '标签页',
  scenarios: [
    {
      name: '基础标签页',
      html: `
        <af-tabs id="tabs"></af-tabs>
      `,
      main: { selector: 'af-tabs' },
      props: [
        { prop: 'activeIndex', label: '激活索引', type: 'number', min: 0, max: 3, step: 1 },
        { prop: 'fixed', label: '吸顶', type: 'boolean' },
      ],
      events: ['af-tabs:change'],
      styleTokens: [
        { token: '--c-onbrand', label: '品牌色', type: 'color' },
      ],
      init: () => {
        const tabs = document.getElementById('tabs');
        tabs.tabs = [
          { label: '推荐', value: 'rec' },
          { label: '关注', value: 'follow' },
          { label: '热门', value: 'hot' },
          { label: '同城', value: 'nearby' },
        ];
        tabs.renderPanel = (tab) => `<p class="body p-3 t-center">「${tab.label}」面板内容</p>`;
      },
    },
  ],
};