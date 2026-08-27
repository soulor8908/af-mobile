// af-mobile UI —— af-stepper Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-stepper',
  name: '步进器',
  scenarios: [
    {
      name: '数量选择',
      html: `
        <div class="card p-3">
          <div class="cell"><span class="body">购买数量</span><af-stepper id="st" value="2"></af-stepper></div>
          <div class="cell"><span class="body">限购(1-5)</span><af-stepper id="st2" min="1" max="5" value="3"></af-stepper></div>
          <div class="cell"><span class="body">步长 5</span><af-stepper id="st3" step="5" max="100" value="10"></af-stepper></div>
        </div>
      `,
      main: { selector: '#st' },
      props: [
        { prop: 'value', label: '数值', type: 'number', min: 0, max: 99, step: 1 },
        { prop: 'min', label: '最小值', type: 'number', min: -99, max: 99, step: 1 },
        { prop: 'max', label: '最大值', type: 'number', min: 0, max: 999, step: 1 },
        { prop: 'step', label: '步长', type: 'number', min: 1, max: 10, step: 1 },
        { prop: 'disabled', label: '禁用', type: 'boolean' },
      ],
      events: ['af-stepper:change'],
      styleTokens: [
        { token: '--c-onbrand', label: '品牌色', type: 'color' },
      ],
    },
    {
      name: 'setValue() 编程赋值',
      html: `
        <div class="card p-3">
          <div class="cell"><span class="body">限购 1-8 件</span><af-stepper id="st-set" value="1" min="1" max="8"></af-stepper></div>
        </div>
        <div class="actions">
          <button class="btn" data-act="set8">setValue(8)</button>
          <button class="btn btn-ghost" data-act="set1">setValue(1)</button>
        </div>
        <p class="caption" id="st-log">编程赋值同样做边界 clamp 并触发 af-stepper:change</p>
      `,
      main: { selector: '#st-set' },
      props: [
        { prop: 'value', label: '数值', type: 'number', min: 0, max: 99, step: 1 },
        { prop: 'disabled', label: '禁用', type: 'boolean' },
      ],
      events: ['af-stepper:change'],
      init: () => {
        const st = document.getElementById('st-set');
        const log = document.getElementById('st-log');
        st.addEventListener('af-stepper:change', (e) => { if (log) log.textContent = `change: ${e.detail.value}`; });
        document.querySelector('[data-act="set8"]').addEventListener('click', () => st.setValue(8));
        document.querySelector('[data-act="set1"]').addEventListener('click', () => st.setValue(1));
      },
    },
  ],
};