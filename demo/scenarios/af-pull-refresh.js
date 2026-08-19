// af-mobile UI —— af-pull-refresh Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-pull-refresh',
  name: '下拉刷新',
  scenarios: [
    {
      name: '下拉触发刷新',
      html: `
        <af-pull-refresh id="pr">
          <div class="list">
            <div class="list-item"><div class="body">列表项 1</div></div>
            <div class="list-item"><div class="body">列表项 2</div></div>
            <div class="list-item"><div class="body">列表项 3</div></div>
          </div>
        </af-pull-refresh>
        <p class="caption" id="pr-log">下拉触发 af-pull-refresh:refresh（触摸设备体验更佳）</p>
        <div class="card">
          <button class="btn btn-ghost btn-block" onclick="document.getElementById('pr').endRefresh()">结束刷新</button>
        </div>
      `,
      main: { selector: '#pr' },
      events: ['af-pull-refresh:refresh'],
      init: () => {
        const pr = document.getElementById('pr');
        const log = document.getElementById('pr-log');
        pr.addEventListener('af-pull-refresh:refresh', () => {
          if (log) log.textContent = '刷新中...';
          setTimeout(() => pr.endRefresh(), 1500);
        });
      },
    },
  ],
};
