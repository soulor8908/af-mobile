// af-mobile UI —— af-badge Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-badge',
  name: '徽标角标',
  scenarios: [
    {
      name: '基础用法',
      html: `
        <div class="card">
          <div class="cell f aic g-2">
            <af-badge id="b1" content="8">消息</af-badge>
            <af-badge id="b2" content="99" max="99">通知</af-badge>
            <af-badge id="b3" dot>新</af-badge>
          </div>
          <div class="cell f g-2">
            <af-badge content="热" data-color="warn">推荐</af-badge>
            <af-badge content="NEW" data-color="brand">活动</af-badge>
          </div>
        </div>
      `,
      main: { selector: '#b1' },
      props: [
        { prop: 'content', label: '内容', type: 'string' },
        { prop: 'max', label: '上限', type: 'number', min: 1, max: 999, step: 1 },
        { prop: 'dot', label: '圆点', type: 'boolean' },
        { prop: 'color', label: '颜色', type: 'select', options: ['danger', 'warn', 'brand', 'success'] },
      ],
      styleTokens: [
        { token: '--c-brand', label: '品牌色', type: 'color' },
      ],
    },
    {
      name: '角标定位与上限截断',
      html: `
        <div class="card">
          <p class="caption">包裹内容时自动切角标定位（data-corner）；数值超过 max 显示 max+</p>
          <div class="cell f aic g-2">
            <af-badge id="b1" content="120" max="99">未读消息</af-badge>
            <af-badge id="b2" dot data-color="ok">在线</af-badge>
          </div>
          <div class="cell f aic g-2">
            <af-badge id="b3" content="6" data-color="brand"><span class="body">收件箱</span></af-badge>
            <af-badge id="b4" content="1" data-color="warn"><span class="body">待办</span></af-badge>
          </div>
        </div>
      `,
      main: { selector: '#b1' },
      props: [
        { prop: 'content', label: '内容', type: 'string' },
        { prop: 'max', label: '上限', type: 'number', min: 1, max: 999, step: 1 },
        { prop: 'dot', label: '圆点', type: 'boolean' },
        { prop: 'color', label: '颜色', type: 'select', options: ['danger', 'warn', 'brand', 'success'] },
      ],
      styleTokens: [
        { token: '--c-brand', label: '品牌色', type: 'color' },
      ],
    },
  ],
};
