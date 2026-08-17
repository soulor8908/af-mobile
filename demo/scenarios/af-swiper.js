// AIFlow UI —— af-swiper Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-swiper',
  scenarios: [
    {
      name: '轮播滑动',
      html: `
        <af-swiper id="swiper">
          <div class="swiper-slide" style="height:180px;display:flex;align-items:center;justify-content:center;background:var(--c-muted-bg);font-weight:600;">Slide 1</div>
          <div class="swiper-slide" style="height:180px;display:flex;align-items:center;justify-content:center;background:var(--c-muted-bg);font-weight:600;">Slide 2</div>
          <div class="swiper-slide" style="height:180px;display:flex;align-items:center;justify-content:center;background:var(--c-muted-bg);font-weight:600;">Slide 3</div>
          <div class="swiper-slide" style="height:180px;display:flex;align-items:center;justify-content:center;background:var(--c-muted-bg);font-weight:600;">Slide 4</div>
        </af-swiper>
      `,
      main: { selector: 'af-swiper' },
      props: [
        { prop: 'autoplay', label: '自动播放(ms)', type: 'number', min: 0, max: 5000, step: 500 },
        { prop: 'loop', label: '循环', type: 'boolean' },
        { prop: 'showDots', label: '指示点', type: 'boolean' },
        { prop: 'duration', label: '过渡(ms)', type: 'number', min: 0, max: 1000, step: 50 },
      ],
      evts: ['af-swiper:change'],
      tokens: [
        { token: '--c-onbrand', label: '指示点色', type: 'color' },
      ],
    },
  ],
};