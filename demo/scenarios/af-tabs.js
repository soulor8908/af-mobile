// af-mobile UI —— af-tabs Playground 场景
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
    {
      name: '禁用项与 setActive()',
      html: `
        <af-tabs id="tabs2"></af-tabs>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" data-act="t0">setActive(0)</button>
          <button class="btn btn-ghost btn-sm" data-act="t2">setActive(2)（禁用项，不生效）</button>
        </div>
        <p class="caption" id="tabs-log">disabled 的标签无法激活：点击与 setActive 均被拦截</p>
      `,
      main: { selector: 'af-tabs' },
      events: ['af-tabs:change'],
      styleTokens: [
        { token: '--c-onbrand', label: '品牌色', type: 'color' },
      ],
      init: () => {
        const tabs = document.getElementById('tabs2');
        tabs.tabs = [
          { label: '全部', value: 'all' },
          { label: '进行中', value: 'doing' },
          { label: '已关闭', value: 'closed', disabled: true },
          { label: '已完成', value: 'done' },
        ];
        tabs.renderPanel = (tab) => `<p class="body p-3 t-center">「${tab.label}」面板内容</p>`;
        const log = document.getElementById('tabs-log');
        tabs.addEventListener('af-tabs:change', (e) => { if (log) log.textContent = `change → index=${e.detail.index} value=${e.detail.value}`; });
        document.querySelector('[data-act="t0"]').addEventListener('click', () => tabs.setActive(0));
        document.querySelector('[data-act="t2"]').addEventListener('click', () => tabs.setActive(2));
      },
    },
  ],
};