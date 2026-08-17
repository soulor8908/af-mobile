// AIFlow UI —— af-dialog Playground 场景
// 场景文件契约：
//   { scenarios: [{ name, html, main:{selector}, props:[控件schema], evts:[事件名], propsMeta?:静态属性, tokens:[样式token] }] }
// props 控件 schema 复用 demo/props-panel.js：{ prop, label, type:'boolean'|'select'|'number'|'string', options?, min?, max?, step? }
// tokens 控件：{ token, label, type:'color'|'range', min?, max?, default? }
export default {
  tag: 'af-dialog',
  scenarios: [
    {
      name: '基础用法',
      html: `
        <div class="actions">
          <button class="btn" id="dlg-open">打开对话框</button>
        </div>
        <af-dialog title="确认操作">
          <div slot="body"><p class="body">确定要删除这条记录吗？此操作不可撤销。</p></div>
          <div slot="footer">
            <button class="btn btn-ghost btn-block" id="dlg-cancel">取消</button>
            <button class="btn btn-danger btn-block" id="dlg-ok">删除</button>
          </div>
        </af-dialog>
      `,
      main: { selector: 'af-dialog' },
      props: [
        { prop: 'title', label: '标题', type: 'string' },
        { prop: 'variant', label: '变体', type: 'select', options: ['default', 'center', 'bottom'] },
        { prop: 'closeOnEsc', label: 'ESC 关闭', type: 'boolean' },
        { prop: 'closeOnBackdrop', label: '遮罩关闭', type: 'boolean' },
      ],
      evts: ['af-dialog:open', 'af-dialog:close'],
      tokens: [
        { token: '--c-onbrand', label: '品牌色', type: 'color' },
        { token: '--radius-lg', label: '大圆角', type: 'range', min: 0, max: 32, default: 16 },
      ],
      init: () => {
        const open = document.getElementById('dlg-open');
        const dialog = document.querySelector('af-dialog');
        open?.addEventListener('click', () => dialog.show());
        document.getElementById('dlg-cancel')?.addEventListener('click', () => dialog.close());
        document.getElementById('dlg-ok')?.addEventListener('click', () => {
          dialog.close();
          dialog.returnValue = '删除';
        });
      },
    },
    {
      name: '底部弹层',
      html: `
        <div class="actions">
          <button class="btn" id="sheet-open">打开底部面板</button>
        </div>
        <af-dialog variant="bottom" title="选择操作">
          <div slot="body"><p class="body">底部弹出，常用于操作单选。</p></div>
          <div slot="footer">
            <button class="btn btn-block" id="sheet-ok">我知道了</button>
          </div>
        </af-dialog>
      `,
      main: { selector: 'af-dialog' },
      props: [
        { prop: 'variant', label: '变体', type: 'select', options: ['default', 'center', 'bottom'] },
        { prop: 'closeOnBackdrop', label: '遮罩关闭', type: 'boolean' },
      ],
      evts: ['af-dialog:open', 'af-dialog:close'],
      tokens: [
        { token: '--c-onbrand', label: '品牌色', type: 'color' },
      ],
      init: () => {
        document.getElementById('sheet-open')?.addEventListener('click', () => {
          document.querySelector('af-dialog').show();
        });
        document.getElementById('sheet-ok')?.addEventListener('click', () => {
          document.querySelector('af-dialog').close();
        });
      },
    },
  ],
};