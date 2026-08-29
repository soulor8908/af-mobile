// af-mobile UI —— af-cascade-picker Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-cascade-picker',
  name: '级联选择器',
  scenarios: [
    {
      name: '省市区选择',
      fewshot: {
        html: '<af-cascade-picker id="cp" title="选择地区"></af-cascade-picker>',
        js: `const cp = document.getElementById('cp');
cp.tree = [
  { label: '浙江省', value: 'zj', children: [{ label: '杭州市', value: 'hz' }, { label: '宁波市', value: 'nb' }] },
  { label: '广东省', value: 'gd', children: [{ label: '广州市', value: 'gz' }] },
];
cp.addEventListener('af-picker:confirm', (e) => console.log(e.detail.values));
cp.open();`,
        note: 'tree 树形数据（children 缺省为叶节点）；事件沿用 af-picker:*；confirm 载荷 e.detail.values',
      },
      html: `
        <div class="card">
          <div class="cell"><span class="body">地区</span><button class="btn btn-sm btn-ghost" data-act="cp-open">选择</button></div>
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
        document.querySelector('[data-act="cp-open"]')?.addEventListener('click', () => cp.open());
      },
    },
    {
      name: '两层级联与默认选中',
      html: `
        <div class="card">
          <div class="cell jcsb"><span class="body">商圈</span><button class="btn btn-sm btn-ghost" data-act="cp2-open">选择</button></div>
        </div>
        <p class="caption" id="cp2-log">默认选中「上海 / 浦东」，确认与取消均记录日志</p>
        <af-cascade-picker id="cp2" title="选择商圈"></af-cascade-picker>
      `,
      main: { selector: '#cp2' },
      props: [
        { prop: 'title', label: '标题', type: 'string' },
      ],
      events: ['af-picker:confirm', 'af-picker:cancel'],
      init: () => {
        const cp = document.getElementById('cp2');
        cp.tree = [
          { value: '上海', label: '上海', children: [
            { value: '徐汇', label: '徐汇' },
            { value: '浦东', label: '浦东' },
          ] },
          { value: '杭州', label: '杭州', children: [
            { value: '西湖', label: '西湖' },
            { value: '滨江', label: '滨江' },
          ] },
        ];
        // values 预设默认选中项：tree 变更后级联回退按 values 匹配列项
        cp.values = ['上海', '浦东'];
        document.querySelector('[data-act="cp2-open"]')?.addEventListener('click', () => cp.open());
        const log = document.getElementById('cp2-log');
        cp.addEventListener('af-picker:confirm', (e) => {
          if (log) log.textContent = `确认：${e.detail.values.join(' / ')}`;
        });
        cp.addEventListener('af-picker:cancel', () => {
          if (log) log.textContent = '已取消选择';
        });
      },
    },
  ],
};
