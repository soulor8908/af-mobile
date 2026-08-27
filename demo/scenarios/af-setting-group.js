// 沙盒场景：af-setting-group（L3.5 设置分组五态块）
export default {
  tag: 'af-setting-group',
  name: '设置分组',
  scenarios: [
    {
      name: '开关组',
      html: '<af-setting-group id="demo-switch"></af-setting-group>',
      main: { selector: '#demo-switch' },
      props: [{ prop: 'title', label: '标题', type: 'string' }],
      events: ['af-setting-group:itemclick', 'af-setting-group:change'],
      init() {
        const el = document.getElementById('demo-switch');
        el.variant = 'with-switch';
        el.title = '通知设置';
        el.items = [
          { label: '推送通知', checked: true },
          { label: '营销消息', checked: false },
          { label: '免打扰（会员可用）', checked: false, disabled: true },
        ];
      },
    },
    {
      name: '值跳转组',
      html: '<af-setting-group id="demo-value"></af-setting-group>',
      main: { selector: '#demo-value' },
      props: [],
      events: ['af-setting-group:itemclick'],
      init() {
        const el = document.getElementById('demo-value');
        el.variant = 'with-value';
        el.title = '通用';
        el.items = [
          { label: '语言', value: '简体中文', action: 'arrow' },
          { label: '字体大小', value: '标准', action: 'arrow' },
          { label: '清除缓存', value: '23.5 MB', action: 'arrow' },
        ];
      },
    },
  ],
};
