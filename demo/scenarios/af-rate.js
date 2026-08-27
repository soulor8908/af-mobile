// af-mobile UI —— af-rate Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-rate',
  name: '评分',
  scenarios: [
    {
      name: '星级评分',
      fewshot: {
        html: '<af-rate id="rt" value="4" max="5"></af-rate>',
        js: `document.getElementById('rt').addEventListener('af-rate:change', (e) => console.log(e.detail.value));`,
        note: 'value/max/readonly/size 属性；change 载荷 e.detail.value',
      },
      html: `
        <div class="card">
          <div class="cell"><span class="body">默认</span><af-rate id="r1" value="3"></af-rate></div>
          <div class="cell"><span class="body">10 星</span><af-rate id="r2" value="7" max="10"></af-rate></div>
        </div>
        <p class="caption" id="r-log">点击星星评分 · 键盘原生支持</p>
      `,
      main: { selector: '#r1' },
      props: [
        { prop: 'value', label: '值', type: 'number', min: 0, max: 10, step: 1 },
        { prop: 'max', label: '上限', type: 'number', min: 1, max: 10, step: 1 },
        { prop: 'readonly', label: '只读', type: 'boolean' },
        { prop: 'size', label: '尺寸', type: 'select', options: ['sm', 'md', 'lg'] },
      ],
      events: ['af-rate:change'],
      styleTokens: [
        { token: '--c-warn', label: '星标色', type: 'color' },
      ],
      init: () => {
        const r1 = document.getElementById('r1');
        const log = document.getElementById('r-log');
        r1.addEventListener('af-rate:change', (e) => { if (log) log.textContent = `评分 ${e.detail.value}`; });
      },
    },
    {
      name: '只读展示',
      html: `
        <div class="card">
          <div class="cell"><span class="body">订单评价（只读）</span><af-rate id="r3" value="4" readonly></af-rate></div>
          <div class="cell"><span class="body">小尺寸只读</span><af-rate id="r4" value="2" readonly size="sm"></af-rate></div>
          <div class="cell"><span class="body">大尺寸只读</span><af-rate id="r5" value="5" readonly size="lg"></af-rate></div>
        </div>
        <p class="caption">readonly 时星星禁用，仅展示评分结果，不再派发 af-rate:change</p>
      `,
      main: { selector: '#r3' },
      props: [
        { prop: 'value', label: '值', type: 'number', min: 0, max: 10, step: 1 },
        { prop: 'readonly', label: '只读', type: 'boolean' },
        { prop: 'size', label: '尺寸', type: 'select', options: ['sm', 'md', 'lg'] },
      ],
      events: ['af-rate:change'],
      styleTokens: [
        { token: '--c-warn', label: '星标色', type: 'color' },
      ],
    },
  ],
};
