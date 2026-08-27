// af-mobile UI —— af-swiper Playground 场景
// 契约见 af-dialog.js 顶部注释；props 控件复用 demo/props-panel.js schema
export default {
  tag: 'af-swiper',
  name: '轮播',
  scenarios: [
    {
      name: '轮播滑动',
      html: `
        <style>
          /* 豁免：slide 占位块需固定高度与居中，白名单无高度 utility
             （同 kitchen-sink / af-list 单页模式：data-role 限定选择器 + var(--*) 不硬编码色值） */
          [data-role="demo-slide"] { height: 180px; display: flex; align-items: center; justify-content: center; background: var(--c-muted-bg); font-weight: var(--fw-medium); }
        </style>
        <af-swiper id="swiper">
          <div data-role="demo-slide">Slide 1</div>
          <div data-role="demo-slide">Slide 2</div>
          <div data-role="demo-slide">Slide 3</div>
          <div data-role="demo-slide">Slide 4</div>
        </af-swiper>
      `,
      main: { selector: 'af-swiper' },
      props: [
        { prop: 'autoplay', label: '自动播放(ms)', type: 'number', min: 0, max: 5000, step: 500 },
        { prop: 'loop', label: '循环', type: 'boolean' },
        { prop: 'showDots', label: '指示点', type: 'boolean' },
        { prop: 'duration', label: '过渡(ms)', type: 'number', min: 0, max: 1000, step: 50 },
      ],
      events: ['af-swiper:change'],
      styleTokens: [
        { token: '--c-onbrand', label: '指示点色', type: 'color' },
      ],
    },
    {
      name: 'goTo()/next()/prev() 编程切换',
      html: `
        <style>
          /* 豁免：slide 占位块需固定高度与居中，白名单无高度 utility
             （同基础场景：data-role 限定选择器 + var(--*) 不硬编码色值） */
          [data-role="demo-slide"] { height: 180px; display: flex; align-items: center; justify-content: center; background: var(--c-muted-bg); font-weight: var(--fw-medium); }
        </style>
        <af-swiper id="swiper2">
          <div data-role="demo-slide">Slide 1</div>
          <div data-role="demo-slide">Slide 2</div>
          <div data-role="demo-slide">Slide 3</div>
          <div data-role="demo-slide">Slide 4</div>
        </af-swiper>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" data-act="prev">prev()</button>
          <button class="btn btn-ghost btn-sm" data-act="next">next()</button>
          <button class="btn btn-ghost btn-sm" data-act="go2">goTo(2)</button>
        </div>
        <p class="caption" id="swiper-log">编程切换同样触发 af-swiper:change（detail.index）</p>
      `,
      main: { selector: '#swiper2' },
      props: [
        { prop: 'loop', label: '循环', type: 'boolean' },
        { prop: 'duration', label: '过渡(ms)', type: 'number', min: 0, max: 1000, step: 50 },
      ],
      events: ['af-swiper:change'],
      init: () => {
        const swiper = document.getElementById('swiper2');
        const log = document.getElementById('swiper-log');
        swiper.addEventListener('af-swiper:change', (e) => { if (log) log.textContent = `change: index=${e.detail.index}`; });
        document.querySelector('[data-act="prev"]').addEventListener('click', () => swiper.prev());
        document.querySelector('[data-act="next"]').addEventListener('click', () => swiper.next());
        document.querySelector('[data-act="go2"]').addEventListener('click', () => swiper.goTo(2));
      },
    },
  ],
};