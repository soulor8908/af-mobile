// af-mobile UI —— af-tabbar Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-tabbar',
  name: '底部标签栏',
  scenarios: [
    {
      name: '标签切换',
      fewshot: {
        html: '<af-tabbar id="tb" active-index="0"></af-tabbar>',
        js: `const tb = document.getElementById('tb');
tb.tabs = [
  { label: '首页', value: 'home' },
  { label: '消息', value: 'msg', badge: '3' }, // badge 可选
  { label: '我的', value: 'me' },
];
tb.addEventListener('af-tabbar:change', (e) => console.log(e.detail.index, e.detail.value));`,
        note: 'tabs 数组注入（label/value/badge 可选）；默认吸底 + safe-area，fixed="false" 取消；icon 省略即纯文字（禁 emoji）',
      },
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
        // icon 为可选项（纯文本渲染，禁 emoji 图标）：省略 icon 即纯文字 tab
        tb.tabs = [
          { label: '首页', value: 'home' },
          { label: '分类', value: 'cat' },
          { label: '消息', value: 'msg', badge: '3' },
          { label: '我的', value: 'me' },
        ];
        const log = document.getElementById('tb-log');
        tb.addEventListener('af-tabbar:change', (e) => { if (log) log.textContent = `index=${e.detail.index} value=${e.detail.value}`; });
      },
    },
    {
      name: 'setActive() 编程切换',
      html: `
        <af-tabbar id="tb2" active-index="2" fixed="false"></af-tabbar>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" data-act="t0">setActive(0)</button>
          <button class="btn btn-ghost btn-sm" data-act="t3">setActive(3)</button>
        </div>
        <p class="caption" id="tb-log2">fixed="false" 取消吸底 · 编程切换同样派发 af-tabbar:change</p>
      `,
      main: { selector: '#tb2' },
      props: [
        { prop: 'activeIndex', label: '激活项', type: 'number', min: 0, max: 3, step: 1 },
      ],
      events: ['af-tabbar:change'],
      init: () => {
        const tb = document.getElementById('tb2');
        tb.tabs = [
          { label: '首页', value: 'home' },
          { label: '分类', value: 'cat' },
          { label: '消息', value: 'msg' },
          { label: '我的', value: 'me' },
        ];
        const log = document.getElementById('tb-log2');
        tb.addEventListener('af-tabbar:change', (e) => { if (log) log.textContent = `setActive → index=${e.detail.index} value=${e.detail.value}`; });
        document.querySelector('[data-act="t0"]').addEventListener('click', () => tb.setActive(0));
        document.querySelector('[data-act="t3"]').addEventListener('click', () => tb.setActive(3));
      },
    },
  ],
};
