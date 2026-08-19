// af-mobile UI —— af-skeleton-page Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
// 说明：该组件仅支持 variant 切换（onAttributeChange 重建骨架），无 loading 属性。
export default {
  tag: 'af-skeleton-page',
  name: '骨架屏',
  scenarios: [
    {
      name: '布局变体',
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
  ],
};
