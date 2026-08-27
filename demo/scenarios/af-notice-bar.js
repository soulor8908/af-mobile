// af-mobile UI —— af-notice-bar Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-notice-bar',
  name: '公告通知栏',
  scenarios: [
    {
      name: '横向滚动',
      fewshot: {
        html: '<af-notice-bar text="活动公告：全场满 199 减 30" scroll></af-notice-bar>',
        note: 'text 公告文案；scroll 循环滚动（缺省静态）',
      },
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
    {
      name: '运行时更新公告',
      html: `
        <div class="card">
          <af-notice-bar id="nb2" text="初始公告：任意属性变更后组件整体重渲染（幂等）"></af-notice-bar>
        </div>
        <div class="card f g-2">
          <button class="btn btn-sm btn-ghost" data-act="nb2-swap">更新文本</button>
          <button class="btn btn-sm btn-ghost" data-act="nb2-scroll">切换滚动</button>
        </div>
        <p class="caption" id="nb2-log">text / scroll 均可运行时切换，无需重建组件</p>
      `,
      main: { selector: '#nb2' },
      props: [
        { prop: 'text', label: '公告文本', type: 'string' },
        { prop: 'scroll', label: '横向滚动', type: 'boolean' },
      ],
      styleTokens: [
        { token: '--c-brand', label: '主色', type: 'color' },
      ],
      init: () => {
        const nb = document.getElementById('nb2');
        const log = document.getElementById('nb2-log');
        document.querySelector('[data-act="nb2-swap"]').addEventListener('click', () => {
          nb.text = `更新于 ${new Date().toLocaleTimeString()}：这是一条运行时替换的新公告`;
        });
        document.querySelector('[data-act="nb2-scroll"]').addEventListener('click', () => {
          nb.scroll = !nb.scroll;
          if (log) log.textContent = `scroll = ${nb.scroll}`;
        });
      },
    },
  ],
};
