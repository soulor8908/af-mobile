// af-mobile UI —— af-skeleton-page Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
// 说明：该组件仅支持 variant 切换（onAttributeChange 重建骨架），无 loading 属性。
export default {
  tag: 'af-skeleton-page',
  name: '骨架屏',
  scenarios: [
    {
      name: '布局变体',
      fewshot: {
        html: '<af-skeleton-page variant="list"></af-skeleton-page>',
        note: 'variant 四选一：list / detail / profile / card；加载完成后移除元素换成真实内容',
      },
      html: `
        <af-skeleton-page id="sk" variant="list"></af-skeleton-page>
        <p class="caption">切换「变体」实时重建骨架布局。</p>
      `,
      main: { selector: '#sk' },
      props: [
        { prop: 'variant', label: '变体', type: 'select', options: ['list', 'card', 'profile', 'article'] },
      ],
      styleTokens: [
        { token: '--c-muted-bg', label: '骨架底色', type: 'color' },
      ],
    },
    {
      name: '详情页骨架',
      html: `
        <af-skeleton-page id="sk2" variant="detail"></af-skeleton-page>
        <p class="caption">variant="detail"：大块图 + 多行文本行，适合图文详情页加载态。</p>
      `,
      main: { selector: '#sk2' },
      props: [
        { prop: 'variant', label: '变体', type: 'select', options: ['list', 'detail', 'profile', 'card', 'article'] },
      ],
      styleTokens: [
        { token: '--c-muted-bg', label: '骨架底色', type: 'color' },
      ],
    },
  ],
};
