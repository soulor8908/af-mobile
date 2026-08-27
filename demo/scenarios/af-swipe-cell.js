// af-mobile UI —— af-swipe-cell Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-swipe-cell',
  name: '滑动单元格',
  scenarios: [
    {
      name: '左滑操作',
      fewshot: {
        html: `<af-swipe-cell>
  <div slot="content" class="list-item">消息内容</div>
  <div slot="right"><button class="btn btn-danger" data-action="delete">删除</button></div>
</af-swipe-cell>`,
        js: `document.querySelector('af-swipe-cell').addEventListener('af-swipe-cell:action', (e) => {
  if (e.detail.action === 'delete') /* 移除该项 */;
});`,
        note: 'slot=content 主内容 / slot=right 操作区；操作按钮 data-action 值进载荷 e.detail.action',
      },
      html: `
        <div class="list">
          <af-swipe-cell>
            <div slot="content" class="list-item"><div class="body">左滑显示操作</div></div>
            <div slot="right">
              <button class="btn btn-sm btn-ghost" data-action="mark">标记</button>
              <button class="btn btn-sm btn-danger" data-action="delete">删除</button>
            </div>
          </af-swipe-cell>
          <af-swipe-cell disabled>
            <div slot="content" class="list-item"><div class="body">禁用滑动</div></div>
          </af-swipe-cell>
        </div>
        <p class="caption" id="sc-log">左滑 > 50% 吸附打开 · 触发 af-swipe-cell:action</p>
      `,
      main: { selector: 'af-swipe-cell' },
      props: [
        { prop: 'disabled', label: '禁用滑动', type: 'boolean' },
      ],
      events: ['af-swipe-cell:action'],
      init: () => {
        const log = document.getElementById('sc-log');
        document.addEventListener('af-swipe-cell:action', (e) => { if (log) log.textContent = `动作 ${e.detail.action}`; });
      },
    },
    {
      name: 'open()/close() 编程控制',
      html: `
        <af-swipe-cell id="sc2">
          <div slot="content" class="list-item"><div class="body">不靠手势，用按钮开关</div></div>
          <div slot="right">
            <button class="btn btn-sm btn-danger" data-action="delete">删除</button>
          </div>
        </af-swipe-cell>
        <div class="actions">
          <button class="btn" data-act="open">open()</button>
          <button class="btn btn-ghost" data-act="close">close()</button>
        </div>
        <p class="caption" id="sc-log2">键盘同样可用：Enter/← 打开，Esc/→ 收起</p>
      `,
      main: { selector: '#sc2' },
      events: ['af-swipe-cell:action'],
      init: () => {
        const cell = document.getElementById('sc2');
        const log = document.getElementById('sc-log2');
        document.querySelector('[data-act="open"]').addEventListener('click', () => cell.open());
        document.querySelector('[data-act="close"]').addEventListener('click', () => cell.close());
        cell.addEventListener('af-swipe-cell:action', (e) => { if (log) log.textContent = `动作 ${e.detail.action} · 已自动收起`; });
      },
    },
  ],
};
