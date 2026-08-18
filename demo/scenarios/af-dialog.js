// AIFlow UI —— af-dialog Playground 场景（单一真相源：playground / gen-docs / AI 直读）
// 契约：{ tag, name, scenarios: [{ name, html, props[], events[], styleTokens[] }] }
// props 控件类型：boolean | number | select | string；styleTokens 控件类型：color | range
// 说明：场景 html 首元素必须是组件实例（playground 取 screen.firstElementChild 绑定面板）；
//       触发打开用组件公开方法 open()/close()（见 src/index.d.ts，勿用不存在的 show()）。
export default {
  tag: 'af-dialog',
  name: '对话框',
  scenarios: [
    {
      name: '基础用法',
      html: `
        <af-dialog open title="确认操作">
          <div slot="body"><p class="body">确定要删除这条记录吗？此操作不可撤销。</p></div>
          <div slot="footer">
            <button class="btn btn-ghost btn-block" onclick="document.querySelector('af-dialog').close()">取消</button>
            <button class="btn btn-danger btn-block" onclick="document.querySelector('af-dialog').close('confirm')">删除</button>
          </div>
        </af-dialog>
        <div class="actions">
          <button class="btn" onclick="document.querySelector('af-dialog').open()">打开对话框</button>
        </div>
      `,
      props: [
        { prop: 'variant', type: 'select', options: ['default', 'center', 'bottom'], label: '变体' },
        { prop: 'closeOnEsc', type: 'boolean', label: 'ESC 关闭' },
        { prop: 'closeOnBackdrop', type: 'boolean', label: '点击遮罩关闭' },
      ],
      events: ['af-dialog:open', 'af-dialog:close'],
      styleTokens: [
        { token: '--r-l', type: 'range', min: 0, max: 24, label: '圆角' },
        { token: '--c-brand', type: 'color', label: '主色' },
      ],
    },
    {
      name: '居中变体',
      html: `
        <af-dialog open variant="center" title="居中弹窗">
          <div slot="body"><p class="body">居中变体对话框，聚焦核心内容，适合轻量确认。</p></div>
          <div slot="footer">
            <button class="btn btn-block" onclick="document.querySelector('af-dialog').close()">知道了</button>
          </div>
        </af-dialog>
        <div class="actions">
          <button class="btn" onclick="document.querySelector('af-dialog').open()">打开对话框</button>
        </div>
      `,
      props: [
        { prop: 'variant', type: 'select', options: ['default', 'center', 'bottom'], label: '变体' },
        { prop: 'title', type: 'string', label: '标题' },
        { prop: 'closeOnEsc', type: 'boolean', label: 'ESC 关闭' },
        { prop: 'closeOnBackdrop', type: 'boolean', label: '点击遮罩关闭' },
      ],
      events: ['af-dialog:open', 'af-dialog:close'],
      styleTokens: [
        { token: '--r-l', type: 'range', min: 0, max: 24, label: '圆角' },
        { token: '--c-brand', type: 'color', label: '主色' },
      ],
    },
  ],
};
