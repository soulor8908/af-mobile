// af-mobile UI —— af-navbar Playground 场景（单一真相源：playground / gen-docs / AI 直读）
// 契约：{ tag, name, scenarios: [{ name, html, main?, props[], events[], styleTokens[], init? }] }
// 属性/事件名以 src/index.d.ts 为准；点击返回按钮触发 af-navbar:back；右/左插槽用 slot="right"/"left"。
export default {
  tag: 'af-navbar',
  name: '导航栏',
  scenarios: [
    {
      name: '基础导航栏',
      fewshot: {
        html: `<af-navbar title="商品详情" show-back back-text="返回">
  <button slot="right" class="btn btn-ghost btn-sm">分享</button>
</af-navbar>`,
        js: `document.querySelector('af-navbar').addEventListener('af-navbar:back', () => history.back());`,
        note: 'title/show-back/back-text 属性；右侧自定义内容 slot="right"；sticky 定位自带 safe-area 适配',
      },
      html: `
        <af-navbar id="nb" title="商品详情" show-back back-text="返回"></af-navbar>
        <div class="card">
          <p class="body">导航栏 sticky 定位 · 顶部 safe-area 适配</p>
        </div>
        <p class="caption" id="nb-log">点击返回按钮触发 af-navbar:back</p>
      `,
      main: { selector: 'af-navbar' },
      props: [
        { prop: 'title', label: '标题', type: 'string' },
        { prop: 'showBack', label: '显示返回', type: 'boolean' },
        { prop: 'backText', label: '返回文字', type: 'string' },
      ],
      events: ['af-navbar:back'],
      styleTokens: [
        { token: '--c-brand', label: '品牌色', type: 'color' },
        { token: '--c-muted-bg', label: '背景色', type: 'color' },
      ],
      init: () => {
        document.getElementById('nb')?.addEventListener('af-navbar:back', () => {
          const log = document.getElementById('nb-log');
          if (log) log.textContent = 'back 事件触发';
        });
      },
    },
    {
      name: '右侧插槽',
      html: `
        <af-navbar id="nb2" title="个人中心" show-back back-text="返回">
          <button slot="right" class="btn btn-ghost btn-sm" id="nb-share">分享</button>
        </af-navbar>
        <div class="card">
          <p class="body">右侧可插入按钮等自定义内容（slot="right"）</p>
        </div>
        <p class="caption" id="nb-log2">点击右上角「分享」</p>
      `,
      main: { selector: 'af-navbar' },
      props: [
        { prop: 'title', label: '标题', type: 'string' },
        { prop: 'showBack', label: '显示返回', type: 'boolean' },
        { prop: 'backText', label: '返回文字', type: 'string' },
      ],
      events: ['af-navbar:back'],
      styleTokens: [
        { token: '--c-brand', label: '品牌色', type: 'color' },
        { token: '--c-text', label: '文字色', type: 'color' },
      ],
      init: () => {
        document.getElementById('nb2')?.addEventListener('af-navbar:back', () => {
          const log = document.getElementById('nb-log2');
          if (log) log.textContent = 'back 事件触发';
        });
        document.getElementById('nb-share')?.addEventListener('click', () => {
          const log = document.getElementById('nb-log2');
          if (log) log.textContent = '点击了「分享」';
        });
      },
    },
  ],
};
