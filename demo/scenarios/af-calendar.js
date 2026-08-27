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
    {
      name: '范围约束（min/max 禁用）',
      html: `<af-calendar id="cal2"></af-calendar>
        <p class="caption" id="cal2-log">本月 3 日前与 20 日后被禁用，仅可选窗口内日期</p>`,
      main: { selector: '#cal2' },
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
      init: () => {
        const cal = document.getElementById('cal2');
        const pad = (n) => String(n).padStart(2, '0');
        const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const now = new Date();
        cal.min = fmt(new Date(now.getFullYear(), now.getMonth(), 3));
        cal.max = fmt(new Date(now.getFullYear(), now.getMonth(), 20));
        cal.value = fmt(now);
        const log = document.getElementById('cal2-log');
        cal.addEventListener('af-calendar:select', (e) => { if (log) log.textContent = `选中 ${e.detail.date}`; });
        cal.addEventListener('af-calendar:monthchange', (e) => { if (log) log.textContent = `切换到 ${e.detail.month}`; });
      },
    },
  ],
};