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
          <div class="cell f ai-center gap-2">
            <af-badge id="b1" content="8">消息</af-badge>
            <af-badge id="b2" content="99" max="99">通知</af-badge>
            <af-badge id="b3" dot>新</af-badge>
          </div>
          <div class="cell f gap-2">
            <af-badge content="热" color="warn">推荐</af-badge>
            <af-badge content="NEW" color="brand">活动</af-badge>
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
