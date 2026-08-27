// af-mobile UI —— af-field Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-field',
  name: '表单字段',
  scenarios: [
    {
      name: '输入与校验',
      fewshot: {
        html: `<af-field label="用户名" placeholder="请输入用户名" help="3-20 位字符"></af-field>
<af-field label="密码" input-type="password" placeholder="请输入密码"></af-field>
<af-field label="留言" type="textarea"></af-field>`,
        js: `const f = document.querySelector('af-field');
f.addEventListener('af-field:input', (e) => console.log(e.detail.value));
f.setError('格式不正确'); // 动态写错误态；setError('') 清除`,
        note: 'label/input-type/type=textarea/help/error 属性；值经 e.detail.value 外发；setError(msg) 动态校验',
      },
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
    {
      name: '文本域与动态校验',
      html: `
        <div class="card">
          <af-field id="f2a" label="留言" type="textarea" placeholder="请输入 10 字以上留言" help="10 字以上通过校验"></af-field>
        </div>
        <div class="card f g-2">
          <button class="btn btn-sm btn-ghost" data-act="f2-check">校验</button>
          <button class="btn btn-sm btn-ghost" data-act="f2-clear">清除错误</button>
          <button class="btn btn-sm btn-ghost" data-act="f2-focus">聚焦</button>
        </div>
        <p class="caption" id="f2-log">setError() 动态写入 / 清除错误态，focus() 聚焦输入框</p>
      `,
      main: { selector: '#f2a' },
      props: [
        { prop: 'label', label: '标签', type: 'string' },
        { prop: 'placeholder', label: '占位', type: 'string' },
        { prop: 'help', label: '帮助', type: 'string' },
        { prop: 'disabled', label: '禁用', type: 'boolean' },
        { prop: 'readonly', label: '只读', type: 'boolean' },
      ],
      events: ['af-field:input', 'af-field:change'],
      styleTokens: [
        { token: '--c-brand', label: '主色', type: 'color' },
      ],
      init: () => {
        const f = document.getElementById('f2a');
        const log = document.getElementById('f2-log');
        document.querySelector('[data-act="f2-check"]').addEventListener('click', () => {
          const n = (f.value || '').length;
          f.setError(n >= 10 ? '' : `当前 ${n} 字，需 10 字以上`);
          if (log) log.textContent = n >= 10 ? '校验通过' : '校验未通过';
        });
        document.querySelector('[data-act="f2-clear"]').addEventListener('click', () => f.setError(''));
        document.querySelector('[data-act="f2-focus"]').addEventListener('click', () => f.focus());
      },
    },
  ],
};
