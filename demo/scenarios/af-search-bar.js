// af-mobile UI —— af-search-bar Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-search-bar',
  name: '搜索栏',
  scenarios: [
    {
      name: '搜索栏',
      fewshot: {
        html: '<af-search-bar id="sb" placeholder="搜索商品、店铺"></af-search-bar>',
        js: `const sb = document.getElementById('sb');
sb.addEventListener('af-search-bar:search', (e) => console.log(e.detail.value)); // 防抖确认后触发
sb.addEventListener('af-search-bar:clear', (e) => console.log(e.detail.value)); // 清除后自动聚焦
sb.focus();`,
        note: 'value/placeholder/debounce 属性；input 实时 / search 防抖确认 / clear 清除三事件；有值时自带清除按钮',
      },
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
        { token: '--r-m', label: '圆角', type: 'range', min: 0, max: 24, default: 8 },
      ],
      init: () => {
        const log = document.getElementById('sb-log');
        const sb = document.getElementById('sb');
        sb.addEventListener('af-search-bar:input', (e) => { if (log) log.textContent = `input: ${e.detail.value}`; });
        sb.addEventListener('af-search-bar:search', (e) => { if (log) log.textContent = `search: ${e.detail.value}`; });
        document.getElementById('sb-focus')?.addEventListener('click', () => sb.focus());
      },
    },
    {
      name: '清除按钮与预设值',
      html: `
        <af-search-bar id="sb2" value="跑步鞋" debounce="0"></af-search-bar>
        <p class="caption" id="sb-log2">有值时出现清除按钮 · 点击触发 af-search-bar:clear 并自动聚焦</p>
      `,
      main: { selector: '#sb2' },
      props: [
        { prop: 'value', label: '值', type: 'string' },
        { prop: 'debounce', label: '防抖(ms)', type: 'number', min: 0, max: 2000, step: 100 },
      ],
      events: ['af-search-bar:input', 'af-search-bar:search', 'af-search-bar:clear'],
      init: () => {
        const sb = document.getElementById('sb2');
        const log = document.getElementById('sb-log2');
        sb.addEventListener('af-search-bar:clear', (e) => { if (log) log.textContent = `clear: "${e.detail.value}" · 输入框已重新聚焦`; });
        sb.addEventListener('af-search-bar:input', (e) => { if (log) log.textContent = `input: ${e.detail.value}`; });
      },
    },
  ],
};