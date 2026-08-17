// AIFlow UI —— af-search-bar Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-search-bar',
  name: '搜索栏',
  scenarios: [
    {
      name: '搜索栏',
      html: `
        <div class="actions">
          <button class="btn btn-ghost btn-block" id="sb-focus">聚焦搜索</button>
        </div>
        <af-search-bar id="sb" placeholder="搜索商品、店铺"></af-search-bar>
        <p class="caption" id="sb-log">输入内容查看事件</p>
      `,
      main: { selector: 'af-search-bar' },
      props: [
        { prop: 'placeholder', label: '占位文字', type: 'string' },
        { prop: 'debounce', label: '防抖(ms)', type: 'number', min: 0, max: 2000, step: 100 },
      ],
      events: ['af-search-bar:input', 'af-search-bar:search', 'af-search-bar:clear'],
      styleTokens: [
        { token: '--c-onbrand', label: '品牌色', type: 'color' },
        { token: '--radius-m', label: '圆角', type: 'range', min: 0, max: 24, default: 8 },
      ],
      init: () => {
        const log = document.getElementById('sb-log');
        const sb = document.getElementById('sb');
        sb.addEventListener('af-search-bar:input', (e) => { if (log) log.textContent = `input: ${e.detail.value}`; });
        sb.addEventListener('af-search-bar:search', (e) => { if (log) log.textContent = `search: ${e.detail.value}`; });
        document.getElementById('sb-focus')?.addEventListener('click', () => sb.focus());
      },
    },
  ],
};