// AIFlow UI —— af-switch Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-switch',
  name: '开关',
  scenarios: [
    {
      name: '开关列表',
      html: `
        <div class="card">
          <div class="cell"><span class="body">通知推送</span><af-switch id="s1"></af-switch></div>
          <div class="cell"><span class="body">自动播放</span><af-switch id="s2" checked></af-switch></div>
          <div class="cell"><span class="body">加载态</span><af-switch id="s3" loading></af-switch></div>
          <div class="cell"><span class="body">禁用</span><af-switch id="s4" disabled></af-switch></div>
        </div>
      `,
      main: { selector: '#s1' },
      props: [
        { prop: 'checked', label: '选中', type: 'boolean' },
        { prop: 'loading', label: '加载中', type: 'boolean' },
        { prop: 'disabled', label: '禁用', type: 'boolean' },
        { prop: 'size', label: '尺寸', type: 'select', options: ['md', 'sm'] },
      ],
      events: ['af-switch:change'],
      styleTokens: [
        { token: '--c-onbrand', label: '品牌色', type: 'color' },
      ],
    },
  ],
};