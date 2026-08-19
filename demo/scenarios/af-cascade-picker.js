// af-mobile UI —— af-cascade-picker Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-cascade-picker',
  name: '级联选择器',
  scenarios: [
    {
      name: '省市区选择',
      html: `
        <div class="card">
          <div class="cell"><span class="body">地区</span><button class="btn btn-sm btn-ghost" onclick="document.getElementById('cp').open()">选择</button></div>
        </div>
        <p class="caption" id="cp-log">点击「选择」打开级联面板，滚轮选择省 / 市 / 区。</p>
        <af-cascade-picker id="cp" title="选择地区"></af-cascade-picker>
      `,
      main: { selector: 'af-cascade-picker' },
      props: [
        { prop: 'title', label: '标题', type: 'string' },
      ],
      events: ['af-picker:confirm', 'af-picker:cancel'],
      init: () => {
        const cp = document.getElementById('cp');
        cp.tree = [
          { value: '广东', label: '广东', children: [
            { value: '深圳', label: '深圳', children: [
              { value: '南山', label: '南山' },
              { value: '福田', label: '福田' },
            ] },
            { value: '广州', label: '广州', children: [
              { value: '天河', label: '天河' },
              { value: '越秀', label: '越秀' },
            ] },
          ] },
          { value: '浙江', label: '浙江', children: [
            { value: '杭州', label: '杭州', children: [
              { value: '西湖', label: '西湖' },
              { value: '滨江', label: '滨江' },
            ] },
          ] },
        ];
        cp.addEventListener('af-picker:confirm', (e) => {
          const log = document.getElementById('cp-log');
          if (log) log.textContent = `选中 ${e.detail.values.join(' / ')}`;
        });
      },
    },
  ],
};
