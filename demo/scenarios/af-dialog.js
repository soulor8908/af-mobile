// af-mobile UI —— af-dialog Playground 场景（单一真相源：playground / gen-docs / AI 直读 / prompt few-shot）
// 契约：{ tag, name, scenarios: [{ name, html, main?, props[], events[], styleTokens[], init?, fewshot? }] }
// fewshot 可选：{ html, js, note } 最小可运行用法，由 scripts/gen-component-fewshots.mjs 编译进 System Prompt。
// props 控件类型：boolean | number | select | string；styleTokens 控件类型：color | range
// 说明：场景 html 首元素必须是组件实例（playground 取 screen.firstElementChild 绑定面板）；
//       init 内做事件绑定（用 data-act + addEventListener，禁内联 onclick）；
//       触发打开用组件公开方法 open()/close()（见 src/index.d.ts，勿用不存在的 show()）。
export default {
  tag: 'af-dialog',
  name: '对话框',
  scenarios: [
    {
      name: '基础用法',
      fewshot: {
        html: `<af-dialog id="d" title="确认操作">
  <div slot="body"><p class="body">确定要删除这条记录吗？</p></div>
  <div slot="footer">
    <button class="btn btn-ghost btn-block" data-act="cancel">取消</button>
    <button class="btn btn-block" data-act="confirm">删除</button>
  </div>
</af-dialog>`,
        js: `const d = document.getElementById('d');
d.open(); // 打开（组件方法控制显隐，焦点陷阱内置）
d.querySelector('[data-act="confirm"]').addEventListener('click', () => d.close('confirm'));
d.addEventListener('af-dialog:close', (e) => console.log(e.detail.action)); // 'confirm' / undefined=取消`,
        note: '内容用 slot=body / slot=footer 分发；open()/close(action) 控制显隐，action 进 close 事件载荷',
      },
      html: `
        <af-dialog open title="确认操作">
          <div slot="body"><p class="body">确定要删除这条记录吗？此操作不可撤销。</p></div>
          <div slot="footer">
            <button class="btn btn-ghost btn-block" data-act="cancel">取消</button>
            <button class="btn btn-danger btn-block" data-act="confirm">删除</button>
          </div>
        </af-dialog>
        <div class="actions">
          <button class="btn" data-act="open">打开对话框</button>
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
      init: () => {
        const dialog = document.querySelector('af-dialog');
        // close(action?)：action 进入 af-dialog:close 的 detail.action，用于区分确认/取消
        dialog.querySelector('[data-act="cancel"]').addEventListener('click', () => dialog.close());
        dialog.querySelector('[data-act="confirm"]').addEventListener('click', () => dialog.close('confirm'));
        document.querySelector('[data-act="open"]').addEventListener('click', () => dialog.open());
      },
    },
    {
      name: '居中变体',
      html: `
        <af-dialog open variant="center" title="居中弹窗">
          <div slot="body"><p class="body">居中变体对话框，聚焦核心内容，适合轻量确认。</p></div>
          <div slot="footer">
            <button class="btn btn-block" data-act="ok">知道了</button>
          </div>
        </af-dialog>
        <div class="actions">
          <button class="btn" data-act="open">打开对话框</button>
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
      init: () => {
        const dialog = document.querySelector('af-dialog');
        dialog.querySelector('[data-act="ok"]').addEventListener('click', () => dialog.close());
        document.querySelector('[data-act="open"]').addEventListener('click', () => dialog.open());
      },
    },
  ],
};
