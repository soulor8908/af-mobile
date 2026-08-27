// af-mobile UI —— af-countdown Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-countdown',
  name: '倒计时',
  scenarios: [
    {
      name: '倒计时控制',
      fewshot: {
        html: '<af-countdown id="cd" time="3600" autostart></af-countdown>',
        js: `const cd = document.getElementById('cd');
cd.addEventListener('af-countdown:change', (e) => console.log(e.detail.remaining, '/', e.detail.total));
cd.addEventListener('af-countdown:end', () => console.log('已结束'));`,
        note: 'time 单位秒；autostart 自动开始；change 载荷 {remaining, total}，归零触发 end',
      },
      html: `
        <div class="card">
          <div class="cell"><span class="body">倒计时</span><af-countdown id="cd" time="90"></af-countdown></div>
        </div>
        <p class="caption" id="cd-log">到 0 派发 af-countdown:end</p>
        <div class="card f g-2">
          <button class="btn btn-ghost" data-act="start">开始</button>
          <button class="btn btn-ghost" data-act="pause">暂停</button>
          <button class="btn btn-ghost" data-act="reset">重置</button>
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
        // 事件绑定收敛到 init（不用内联 onclick，多实例场景下全局查询会串台）
        document.querySelector('[data-act="start"]').addEventListener('click', () => cd.start());
        document.querySelector('[data-act="pause"]').addEventListener('click', () => cd.pause());
        document.querySelector('[data-act="reset"]').addEventListener('click', () => cd.reset());
        cd.addEventListener('af-countdown:end', () => { if (log) log.textContent = '倒计时结束！'; });
        cd.addEventListener('af-countdown:change', (e) => { if (log) log.textContent = `剩余 ${e.detail.remaining}s`; });
      },
    },
    {
      name: '验证码倒计时（autostart）',
      html: `
        <div class="card">
          <div class="cell"><span class="body">验证码有效期</span><af-countdown id="cd2" time="10" autostart></af-countdown></div>
        </div>
        <p class="caption" id="cd2-log">autostart 属性：挂载即自动开始；到 0 派发 af-countdown:end</p>
        <div class="card f g-2">
          <button class="btn btn-ghost" data-act="cd2-resend">重新发送（reset + start）</button>
        </div>
      `,
      main: { selector: '#cd2' },
      props: [
        { prop: 'time', label: '总时长(s)', type: 'number', min: 1, max: 600, step: 1 },
        { prop: 'autostart', label: '自动开始', type: 'boolean' },
      ],
      events: ['af-countdown:end', 'af-countdown:change'],
      init: () => {
        const cd = document.getElementById('cd2');
        const log = document.getElementById('cd2-log');
        document.querySelector('[data-act="cd2-resend"]').addEventListener('click', () => { cd.reset(); cd.start(); });
        cd.addEventListener('af-countdown:change', (e) => { if (log) log.textContent = `剩余 ${e.detail.remaining}s / 共 ${e.detail.total}s`; });
        cd.addEventListener('af-countdown:end', () => { if (log) log.textContent = '验证码已过期'; });
      },
    },
  ],
};
