// af-mobile UI —— af-switch Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-switch',
  name: '开关',
  scenarios: [
    {
      name: '开关列表',
      fewshot: {
        html: '<div class="cell"><span class="body">通知推送</span><af-switch id="sw" checked></af-switch></div>',
        js: `const sw = document.getElementById('sw');
sw.addEventListener('af-switch:change', (e) => console.log(e.detail.checked));
sw.toggle(true); // 受控切换：与当前态相同时不派发事件`,
        note: 'checked/loading/disabled/size 属性；toggle(force) 受控切换；载荷 e.detail.checked',
      },
      html: `
        <div class="card">
          <div class="cell"><span class="body">通知推送</span><af-switch id="s1"></af-switch></div>
          <div class="cell"><span class="body">自动播放</span><af-switch id="s2" checked></af-switch></div>
          <div class="cell"><span class="body">加载态</span><af-switch id="s3" loading></af-switch></div>
          <div class="cell"><span class="body">禁用</span><af-switch id="s4" disabled></af-switch></div>
        </div>
      `,
      main: { selector: '#s1' },
      props: [
        { prop: 'checked', label: '选中', type: 'boolean' },
        { prop: 'loading', label: '加载中', type: 'boolean' },
        { prop: 'disabled', label: '禁用', type: 'boolean' },
        { prop: 'size', label: '尺寸', type: 'select', options: ['md', 'sm'] },
      ],
      events: ['af-switch:change'],
      styleTokens: [
        { token: '--c-onbrand', label: '品牌色', type: 'color' },
      ],
    },
    {
      name: 'toggle(force) 受控切换',
      html: `
        <div class="card">
          <div class="cell"><span class="body">协议开关</span><af-switch id="s-force"></af-switch></div>
        </div>
        <div class="actions">
          <button class="btn" data-act="on">toggle(true)</button>
          <button class="btn btn-ghost" data-act="off">toggle(false)</button>
        </div>
        <p class="caption" id="s-log">force 参数直达目标态 · 与当前态相同时不派发事件</p>
      `,
      main: { selector: '#s-force' },
      props: [
        { prop: 'disabled', label: '禁用', type: 'boolean' },
        { prop: 'loading', label: '加载中', type: 'boolean' },
      ],
      events: ['af-switch:change'],
      init: () => {
        const sw = document.getElementById('s-force');
        const log = document.getElementById('s-log');
        sw.addEventListener('af-switch:change', (e) => { if (log) log.textContent = `change: checked=${e.detail.checked}`; });
        document.querySelector('[data-act="on"]').addEventListener('click', () => sw.toggle(true));
        document.querySelector('[data-act="off"]').addEventListener('click', () => sw.toggle(false));
      },
    },
  ],
};