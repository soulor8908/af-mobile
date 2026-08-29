// af-mobile UI —— af-progress Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-progress',
  name: '进度条',
  scenarios: [
    {
      name: '进度推进',
      fewshot: {
        html: '<af-progress value="680" max="1000"></af-progress>',
        note: 'value/max 属性；颜色可用 --c-brand 等令牌覆盖',
      },
      html: `
        <div class="card">
          <div class="cell"><span class="body">默认</span><af-progress id="p1" value="60"></af-progress></div>
          <div class="cell"><span class="body">下载中…</span><af-progress id="p2" value="0"></af-progress></div>
        </div>
        <div class="card">
          <button class="btn btn-ghost btn-block" data-act="progress-advance">推进 +10</button>
        </div>
      `,
      main: { selector: '#p1' },
      props: [
        { prop: 'value', label: '值', type: 'number', min: 0, max: 100, step: 1 },
        { prop: 'max', label: '上限', type: 'number', min: 1, max: 1000, step: 1 },
        { prop: 'color', label: '颜色', type: 'select', options: ['brand', 'success', 'danger'] },
      ],
      styleTokens: [
        { token: '--c-brand', label: '主色', type: 'color' },
      ],
      init: () => {
        document.querySelector('[data-act="progress-advance"]')?.addEventListener('click', () => {
          for (const id of ['p1', 'p2']) {
            const el = document.getElementById(id);
            if (el) el.value = Math.min(100, el.value + 10);
          }
        });
      },
    },
    {
      name: '状态色变体',
      html: `
        <div class="card">
          <div class="cell"><span class="body">成功态（success）</span><af-progress id="p-ok" value="100" color="success"></af-progress></div>
          <div class="cell"><span class="body">失败态（danger）</span><af-progress id="p-err" value="35" color="danger"></af-progress></div>
        </div>
        <p class="caption">color 属性切换 brand / success / danger 状态色</p>
      `,
      main: { selector: '#p-ok' },
      props: [
        { prop: 'value', label: '值', type: 'number', min: 0, max: 100, step: 1 },
        { prop: 'color', label: '颜色', type: 'select', options: ['brand', 'success', 'danger'] },
      ],
      styleTokens: [
        { token: '--c-success', label: '成功色', type: 'color' },
        { token: '--c-danger', label: '失败色', type: 'color' },
      ],
    },
  ],
};
