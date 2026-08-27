// af-mobile UI —— af-backtop Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-backtop',
  name: '回到顶部',
  scenarios: [
    {
      name: '滚动出现',
      fewshot: {
        html: '<af-backtop threshold="120" text="↑"></af-backtop>',
        js: `document.querySelector('af-backtop').addEventListener('af-backtop:click', () => console.log('回顶'));`,
        note: 'threshold 触发阈值；target 指定滚动容器选择器（缺省 window）；fixed 定位，click 平滑回顶',
      },
      html: `
        <style>
          /* 豁免：af-backtop 默认 fixed 定位，本场景需在局部滚动容器内 absolute 定位，组件未提供该变体
             （同 kitchen-sink / af-list 单页模式：data-role 限定选择器 + var(--*) 不硬编码色值） */
          [data-role="bt-wrap"] { position: relative; }
          [data-role="bt-wrap"] af-backtop { position: absolute; right: 8px; bottom: 8px; }
          [data-role="bt-scroller"] { height: 320px; overflow: auto; border: 1px solid var(--c-border); border-radius: var(--r-m); }
          [data-role="bt-pad"] { padding: 12px; }
          [data-role="bt-pad"] .body { margin: 12px 0; }
        </style>
        <div class="card">
          <p class="caption">向下滚动下方区域，右下角出现回到顶部按钮。</p>
        </div>
        <div data-role="bt-wrap">
          <div data-role="bt-scroller">
            <div data-role="bt-pad">
              ${Array.from({ length: 24 }, (_, i) => `<p class="body">占位内容 ${i + 1}</p>`).join('')}
            </div>
          </div>
          <af-backtop id="bt" target='[data-role="bt-scroller"]' threshold="120" text="↑"></af-backtop>
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
    {
      name: '左下角定位与 scrollToTop',
      html: `
        <style>
          /* 豁免：回到顶部按钮默认 fixed 定位，本场景需在局部滚动容器内 absolute 定位，
             并按 position="left-bottom" 属性钩子切换到左下角（源码注释登记的项目级覆盖方式，
             data-role 限定选择器 + var(--*) 不硬编码色值） */
          [data-role="bt2-wrap"] { position: relative; }
          [data-role="bt2-wrap"] af-backtop { position: absolute; right: 8px; bottom: 8px; }
          [data-role="bt2-wrap"] af-backtop[position="left-bottom"] { left: 8px; right: auto; }
          [data-role="bt2-scroller"] { height: 280px; overflow: auto; border: 1px solid var(--c-border); border-radius: var(--r-m); }
          [data-role="bt2-pad"] { padding: 12px; }
        </style>
        <div class="card">
          <p class="caption">position 切到 left-bottom 时按钮出现在左下角；点按钮或调用 scrollToTop() 均可平滑回顶。</p>
          <div class="cell f g-2">
            <button class="btn btn-sm btn-ghost" data-act="bt2-call">scrollToTop()</button>
          </div>
        </div>
        <div data-role="bt2-wrap">
          <div data-role="bt2-scroller">
            <div data-role="bt2-pad">
              ${Array.from({ length: 20 }, (_, i) => `<p class="body">占位内容 ${i + 1}</p>`).join('')}
            </div>
          </div>
          <af-backtop id="bt2" target='[data-role="bt2-scroller"]' position="left-bottom" text="顶部"></af-backtop>
        </div>
      `,
      main: { selector: '#bt2' },
      props: [
        { prop: 'threshold', label: '出现阈值(px)', type: 'number', min: 20, max: 600, step: 20 },
        { prop: 'position', label: '定位', type: 'select', options: ['right-bottom', 'left-bottom'] },
        { prop: 'text', label: '按钮文字', type: 'string' },
      ],
      events: ['af-backtop:click', 'af-backtop:show', 'af-backtop:hide'],
      styleTokens: [
        { token: '--c-brand', label: '主色', type: 'color' },
      ],
      init: () => {
        const bt = document.getElementById('bt2');
        document.querySelector('[data-act="bt2-call"]')?.addEventListener('click', () => bt.scrollToTop());
      },
    },
  ],
};
