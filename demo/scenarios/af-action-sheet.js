// af-mobile UI —— af-action-sheet Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-action-sheet',
  name: '操作菜单',
  scenarios: [
    {
      name: '基础操作',
      html: `
        <div class="actions">
          <button class="btn" id="as-open">打开操作面板</button>
        </div>
        <af-action-sheet id="sheet" title="选择操作"></af-action-sheet>
      `,
      main: { selector: 'af-action-sheet' },
      props: [
        { prop: 'showCancel', label: '显示取消', type: 'boolean' },
        { prop: 'title', label: '标题', type: 'string' },
      ],
      events: ['af-action-sheet:open', 'af-action-sheet:select', 'af-action-sheet:close'],
      styleTokens: [
        { token: '--c-onbrand', label: '品牌色', type: 'color' },
        { token: '--r-l', label: '顶部圆角', type: 'range', min: 0, max: 24, default: 12 },
      ],
      init: () => {
        const sheet = document.getElementById('sheet');
        sheet.options = [
          { label: '复制', value: 'copy' },
          { label: '分享', value: 'share' },
          { label: '收藏', value: 'fav' },
          { label: '删除', value: 'del', danger: true },
        ];
        document.getElementById('as-open')?.addEventListener('click', () => sheet.showPopover());
      },
    },
  ],
};