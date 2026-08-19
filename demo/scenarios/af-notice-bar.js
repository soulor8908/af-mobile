// af-mobile UI —— af-notice-bar Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-notice-bar',
  name: '公告通知栏',
  scenarios: [
    {
      name: '横向滚动',
      html: `
        <div class="card">
          <af-notice-bar id="n1" text="系统将于今晚 23:00 进行维护升级，届时服务暂停 10 分钟"></af-notice-bar>
          <af-notice-bar id="n2" text="这是一条非常长的公告文本用于演示横向滚动 marquee 效果，超出宽度时持续向左滚动" scroll></af-notice-bar>
        </div>
      `,
      main: { selector: '#n1' },
      props: [
        { prop: 'text', label: '公告文本', type: 'string' },
        { prop: 'scroll', label: '横向滚动', type: 'boolean' },
      ],
      styleTokens: [
        { token: '--c-brand', label: '主色', type: 'color' },
      ],
    },
  ],
};
