// af-mobile UI —— af-steps Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-steps',
  name: '步骤条',
  scenarios: [
    {
      name: '步骤切换',
      fewshot: {
        html: '<af-steps id="st"></af-steps>',
        js: `const st = document.getElementById('st');
st.steps = ['提交订单', '付款', '发货', '收货'];
st.current = 2; // 当前进行到第 3 步`,
        note: 'steps 字符串数组或 {label} 对象数组；current 高亮当前步',
      },
      html: `
        <af-steps id="s1" current="2"></af-steps>
        <p class="caption">点击按钮切换当前步骤</p>
        <div class="card f g-2">
          <button class="btn btn-ghost" data-act="prev">上一步</button>
          <button class="btn btn-ghost" data-act="next">下一步</button>
        </div>
      `,
      main: { selector: '#s1' },
      props: [
        { prop: 'current', label: '当前步', type: 'number', min: 0, max: 3, step: 1 },
      ],
      init: () => {
        const s1 = document.getElementById('s1');
        s1.steps = ['下单', '支付', '发货', '收货'];
        // 事件绑定收敛到 init（不用内联 onclick，多实例场景下全局查询会串台）
        document.querySelector('[data-act="prev"]').addEventListener('click', () => { s1.current = Math.max(0, s1.current - 1); });
        document.querySelector('[data-act="next"]').addEventListener('click', () => { s1.current = Math.min(s1.steps.length - 1, s1.current + 1); });
      },
    },
  ],
};
