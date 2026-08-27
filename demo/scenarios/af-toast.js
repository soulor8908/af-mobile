// af-mobile UI —— af-toast Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-toast',
  name: '轻提示',
  scenarios: [
    {
      name: '四种类型',
      fewshot: {
        html: '<af-toast id="toast"></af-toast>',
        js: `const toast = document.getElementById('toast');
toast.show('操作成功', { type: 'success' }); // success / warning / error / loading
toast.show('加载中…', { type: 'loading', duration: 0, closeOnClick: true }); // duration=0 常驻
toast.dismiss(); // 手动关闭，派发 af-toast:dismiss`,
        note: '单例组件：页面放一个 <af-toast>，全部提示走 show()；duration 默认自动消失',
      },
      html: `
        <div class="actions">
          <button class="btn" id="t-success">成功</button>
          <button class="btn btn-ghost" id="t-warning">警告</button>
          <button class="btn btn-danger" id="t-error">错误</button>
          <button class="btn btn-ghost" id="t-loading">加载中</button>
        </div>
        <af-toast id="toast"></af-toast>
      `,
      main: { selector: 'af-toast' },
      props: [
        { prop: 'duration', label: '显示时长(ms)', type: 'number', min: 0, max: 5000, step: 500 },
      ],
      events: ['af-toast:dismiss'],
      styleTokens: [
        { token: '--c-onbrand', label: '品牌色', type: 'color' },
        { token: '--r-l', label: '圆角', type: 'range', min: 0, max: 24, default: 12 },
      ],
      init: () => {
        const toast = document.getElementById('toast');
        document.getElementById('t-success')?.addEventListener('click', () => toast.show('操作成功', { type: 'success' }));
        document.getElementById('t-warning')?.addEventListener('click', () => toast.show('请注意资产风险', { type: 'warning' }));
        document.getElementById('t-error')?.addEventListener('click', () => toast.show('操作失败，请重试', { type: 'error' }));
        document.getElementById('t-loading')?.addEventListener('click', () => toast.show('加载中…', { type: 'loading', duration: 0, closeOnClick: true }));
      },
    },
    {
      name: '常驻提示与 dismiss()',
      html: `
        <div class="actions">
          <button class="btn" id="t-sticky">常驻提示（duration: 0）</button>
          <button class="btn btn-ghost" id="t-dismiss">dismiss()</button>
        </div>
        <af-toast id="toast2"></af-toast>
        <p class="caption" id="t-log">duration=0 常驻不自动消失，需手动 dismiss() 关闭并派发 af-toast:dismiss</p>
      `,
      main: { selector: '#toast2' },
      props: [
        { prop: 'duration', label: '默认时长(ms)', type: 'number', min: 0, max: 5000, step: 500 },
      ],
      events: ['af-toast:dismiss'],
      init: () => {
        const toast = document.getElementById('toast2');
        const log = document.getElementById('t-log');
        document.getElementById('t-sticky')?.addEventListener('click', () => toast.show('网络不稳定，正在重试', { type: 'warning', duration: 0 }));
        document.getElementById('t-dismiss')?.addEventListener('click', () => toast.dismiss());
        toast.addEventListener('af-toast:dismiss', (e) => { if (log) log.textContent = `dismiss: ${e.detail.message}`; });
      },
    },
  ],
};