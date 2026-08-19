// af-mobile UI —— af-countdown Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-countdown',
  name: '倒计时',
  scenarios: [
    {
      name: '倒计时控制',
      html: `
        <div class="card">
          <div class="cell"><span class="body">倒计时</span><af-countdown id="cd" time="90"></af-countdown></div>
        </div>
        <p class="caption" id="cd-log">到 0 派发 af-countdown:end</p>
        <div class="card f gap-2">
          <button class="btn btn-ghost" onclick="document.getElementById('cd').start()">开始</button>
          <button class="btn btn-ghost" onclick="document.getElementById('cd').pause()">暂停</button>
          <button class="btn btn-ghost" onclick="document.getElementById('cd').reset()">重置</button>
        </div>
      `,
      main: { selector: '#cd' },
      props: [
        { prop: 'time', label: '总时长(s)', type: 'number', min: 1, max: 600, step: 1 },
        { prop: 'autostart', label: '自动开始', type: 'boolean' },
      ],
      events: ['af-countdown:end', 'af-countdown:change'],
      init: () => {
        const cd = document.getElementById('cd');
        const log = document.getElementById('cd-log');
        cd.addEventListener('af-countdown:end', () => { if (log) log.textContent = '倒计时结束！'; });
        cd.addEventListener('af-countdown:change', (e) => { if (log) log.textContent = `剩余 ${e.detail.remaining}s`; });
      },
    },
  ],
};
