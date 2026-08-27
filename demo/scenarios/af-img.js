// af-mobile UI —— af-img Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-img',
  name: '懒加载图片',
  scenarios: [
    {
      name: '加载状态',
      html: `
        <af-img id="img" alt="示例图片"
          src="https://picsum.photos/360/200"
          placeholder-src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='200'%3E%3Crect fill='%23eee' width='360' height='200'/%3E%3C/svg%3E">
        </af-img>
        <p class="caption" id="img-log">滚动到可视区后懒加载；可切换 src 观察 loading</p>
      `,
      main: { selector: '#img' },
      props: [
        { prop: 'lazy', label: '懒加载', type: 'boolean' },
        { prop: 'src', label: '图片地址', type: 'string' },
      ],
      events: ['af-img:load', 'af-img:error'],
      init: () => {
        const img = document.getElementById('img');
        const log = document.getElementById('img-log');
        img.addEventListener('af-img:load', () => { if (log) log.textContent = '图片加载完成'; });
        img.addEventListener('af-img:error', () => { if (log) log.textContent = '图片加载失败'; });
      },
    },
    {
      name: '加载失败回退（failSrc）',
      html: `
        <af-img id="img2" alt="失败回退示例"
          src="https://host.invalid/aiflow-broken.jpg"
          fail-src="https://picsum.photos/seed/af-fallback/360/200">
        </af-img>
        <p class="caption" id="img2-log">主图地址失效时自动改拉 failSrc 兜底图：error 先于 load 派发</p>
      `,
      main: { selector: '#img2' },
      props: [
        { prop: 'src', label: '图片地址', type: 'string' },
        { prop: 'failSrc', label: '兜底地址', type: 'string' },
      ],
      events: ['af-img:load', 'af-img:error'],
      init: () => {
        const img = document.getElementById('img2');
        const log = document.getElementById('img2-log');
        img.addEventListener('af-img:error', () => { if (log) log.textContent = '主图加载失败，切换 failSrc…'; });
        img.addEventListener('af-img:load', () => { if (log) log.textContent = '兜底图加载完成'; });
      },
    },
  ],
};
