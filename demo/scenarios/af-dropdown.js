// af-mobile UI —— af-dropdown Playground 场景（单一真相源：playground / gen-docs / AI 直读）
// 契约：{ tag, name, scenarios: [{ name, html, main?, props[], events[], styleTokens[], init? }] }
// 属性/事件名以 src/index.d.ts 为准；options 为 Array 型，由 init 注入；open()/close() 展开下拉。
export default {
  tag: 'af-dropdown',
  name: '下拉菜单',
  scenarios: [
    {
      name: '城市选择',
      fewshot: {
        html: '<af-dropdown id="dd" placeholder="请选择城市"></af-dropdown>',
        js: `const dd = document.getElementById('dd');
dd.options = ['北京', '上海', '广州', '深圳']; // 数组注入须在 register 之后
dd.addEventListener('af-dropdown:select', (e) => console.log(e.detail.index, e.detail.value));`,
        note: 'options 数组注入；value/placeholder/disabled 属性；选中派发 select（载荷 index/value）',
      },
      html: `
        <div class="card p-3">
          <p class="body">选择收货城市</p>
          <af-dropdown id="dd" placeholder="请选择城市"></af-dropdown>
        </div>
        <p class="caption" id="dd-log">选中后显示 value</p>
      `,
      main: { selector: 'af-dropdown' },
      props: [
        { prop: 'placeholder', label: '占位文本', type: 'string' },
        { prop: 'value', label: '当前值', type: 'string' },
        { prop: 'disabled', label: '禁用', type: 'boolean' },
      ],
      events: ['af-dropdown:select', 'af-dropdown:close'],
      styleTokens: [
        { token: '--c-brand', label: '品牌色', type: 'color' },
        { token: '--r-m', label: '圆角', type: 'range', min: 0, max: 24, default: 8 },
      ],
      init: () => {
        const dd = document.getElementById('dd');
        dd.options = ['北京', '上海', '广州', '深圳', '杭州'];
        dd.addEventListener('af-dropdown:select', (e) => {
          const log = document.getElementById('dd-log');
          if (log) log.textContent = `选中 index=${e.detail.index} value=${e.detail.value}`;
        });
      },
    },
    {
      name: '禁用选项',
      html: `
        <div class="card p-3">
          <div class="cell"><span class="body">可用</span><af-dropdown id="dd2" value="周一"></af-dropdown></div>
          <div class="cell"><span class="body">含禁用项</span><af-dropdown id="dd3" value="周日"></af-dropdown></div>
        </div>
        <p class="caption" id="dd-log2">禁用的「周六」不可选</p>
      `,
      main: { selector: '#dd2' },
      props: [
        { prop: 'disabled', label: '禁用', type: 'boolean' },
        { prop: 'placeholder', label: '占位文本', type: 'string' },
      ],
      events: ['af-dropdown:select', 'af-dropdown:close'],
      styleTokens: [
        { token: '--c-brand', label: '品牌色', type: 'color' },
      ],
      init: () => {
        const week = ['周一', '周二', '周三', '周四', '周五', { label: '周六', value: '周六', disabled: true }, '周日'];
        const dd2 = document.getElementById('dd2');
        const dd3 = document.getElementById('dd3');
        dd2.options = week;
        dd3.options = week;
        const log = document.getElementById('dd-log2');
        dd2.addEventListener('af-dropdown:select', (e) => { if (log) log.textContent = `dd2 选中 value=${e.detail.value}`; });
        dd3.addEventListener('af-dropdown:select', (e) => { if (log) log.textContent = `dd3 选中 value=${e.detail.value}`; });
      },
    },
  ],
};
