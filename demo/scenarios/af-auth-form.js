// 沙盒场景：af-auth-form（L3.5 登录/注册表单块）
// 表单值不落 DOM 属性，提交时经 af-auth-form:submit 外发 → 看右侧事件面板即可
export default {
  tag: 'af-auth-form',
  name: '登录表单',
  scenarios: [
    {
      name: '手机验证码',
      html: '<div class="card"><af-auth-form id="demo-phone"></af-auth-form></div>',
      main: { selector: '#demo-phone' },
      props: [
        { prop: 'title', label: '标题', type: 'string' },
        { prop: 'submitText', label: '按钮文案', type: 'string' },
        { prop: 'loading', label: 'loading 态', type: 'boolean' },
      ],
      events: ['af-auth-form:submit', 'af-auth-form:sendcode'],
      init() {
        const el = document.getElementById('demo-phone');
        el.variant = 'phone-code';
        el.title = '登录';
        el.subtitle = '未注册的手机号将自动创建账号';
        el.submitText = '登录';
      },
    },
    {
      name: '密码登录',
      html: '<div class="card"><af-auth-form id="demo-pwd"></af-auth-form></div>',
      main: { selector: '#demo-pwd' },
      props: [{ prop: 'loading', label: 'loading 态', type: 'boolean' }],
      events: ['af-auth-form:submit'],
      init() {
        const el = document.getElementById('demo-pwd');
        el.variant = 'password';
        el.title = '账号密码登录';
        el.submitText = '登录';
      },
    },
  ],
};
