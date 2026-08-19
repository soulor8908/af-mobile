// af-mobile UI —— af-backtop Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-backtop',
  name: '回到顶部',
  scenarios: [
    {
      name: '滚动出现',
      html: `
        <style>
          #bt-wrap { position: relative; }
          #bt-wrap af-backtop { position: absolute; right: 8px; bottom: 8px; }
        </style>
        <div class="card">
          <p class="caption">向下滚动下方区域，右下角出现回到顶部按钮。</p>
        </div>
        <div id="bt-wrap">
          <div id="scroller" style="height:320px;overflow:auto;border:1px solid var(--c-border);border-radius:var(--r-m)">
            <div style="padding:12px">
              ${Array.from({ length: 24 }, (_, i) => `<p class="body" style="margin:12px 0">占位内容 ${i + 1}</p>`).join('')}
            </div>
          </div>
          <af-backtop id="bt" target="#scroller" threshold="120" text="↑"></af-backtop>
        </div>
      `,
      main: { selector: 'af-backtop' },
      props: [
        { prop: 'threshold', label: '出现阈值(px)', type: 'number', min: 20, max: 600, step: 20 },
        { prop: 'text', label: '按钮文字', type: 'string' },
      ],
      events: ['af-backtop:click', 'af-backtop:show', 'af-backtop:hide'],
      styleTokens: [
        { token: '--c-brand', label: '主色', type: 'color' },
      ],
    },
  ],
};
