// af-mobile UI —— af-field Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-field',
  name: '表单字段',
  scenarios: [
    {
      name: '输入与校验',
      html: `
        <div class="card">
          <af-field id="f1" label="用户名" placeholder="请输入用户名" help="3-20 位字符"></af-field>
          <af-field id="f2" label="密码" input-type="password" placeholder="请输入密码"></af-field>
          <af-field id="f5" label="错误态" value="abc" error="格式不正确"></af-field>
        </div>
        <p class="caption" id="f-log">输入触发 af-field:input / af-field:change</p>
      `,
      main: { selector: '#f1' },
      props: [
        { prop: 'label', label: '标签', type: 'string' },
        { prop: 'placeholder', label: '占位', type: 'string' },
        { prop: 'help', label: '帮助', type: 'string' },
        { prop: 'error', label: '错误', type: 'string' },
        { prop: 'disabled', label: '禁用', type: 'boolean' },
        { prop: 'readonly', label: '只读', type: 'boolean' },
      ],
      events: ['af-field:input', 'af-field:change'],
      styleTokens: [
        { token: '--c-brand', label: '主色', type: 'color' },
      ],
      init: () => {
        const f1 = document.getElementById('f1');
        const log = document.getElementById('f-log');
        f1.addEventListener('af-field:input', (e) => { if (log) log.textContent = `input: ${e.detail.value}`; });
      },
    },
  ],
};
