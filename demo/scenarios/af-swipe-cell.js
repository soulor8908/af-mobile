// af-mobile UI —— af-swipe-cell Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-swipe-cell',
  name: '滑动单元格',
  scenarios: [
    {
      name: '左滑操作',
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
  ],
};
