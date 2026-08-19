// af-mobile UI —— af-steps Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-steps',
  name: '步骤条',
  scenarios: [
    {
      name: '步骤切换',
      html: `
        <af-steps id="s1" current="2"></af-steps>
        <p class="caption">点击按钮切换当前步骤</p>
        <div class="card f gap-2">
          <button class="btn btn-ghost" onclick="var s=document.getElementById('s1');s.current=Math.max(0,s.current-1);">上一步</button>
          <button class="btn btn-ghost" onclick="var s=document.getElementById('s1');s.current=Math.min(s.steps.length-1,s.current+1);">下一步</button>
        </div>
      `,
      main: { selector: '#s1' },
      props: [
        { prop: 'current', label: '当前步', type: 'number', min: 0, max: 3, step: 1 },
      ],
      init: () => {
        const s1 = document.getElementById('s1');
        s1.steps = ['下单', '支付', '发货', '收货'];
      },
    },
  ],
};
