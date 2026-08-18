// af-mobile UI —— af-calendar Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-calendar',
  name: '日历',
  scenarios: [
    {
      name: '日期选择',
      html: `<af-calendar id="cal"></af-calendar>`,
      main: { selector: 'af-calendar' },
      props: [
        { prop: 'value', label: '选中日期', type: 'string' },
        { prop: 'month', label: '显示月份', type: 'string' },
        { prop: 'min', label: '最早日期', type: 'string' },
        { prop: 'max', label: '最晚日期', type: 'string' },
      ],
      events: ['af-calendar:select', 'af-calendar:monthchange'],
      styleTokens: [
        { token: '--c-onbrand', label: '品牌色', type: 'color' },
      ],
    },
  ],
};