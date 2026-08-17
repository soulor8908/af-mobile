// AIFlow UI —— af-picker Playground 场景（单一真相源：playground / gen-docs / AI 直读）
// 契约：{ tag, name, scenarios: [{ name, html, main?, props[], events[], styleTokens[], init? }] }
// 属性/事件名以 src/index.d.ts 为准；columns/values 为 Array 型，由 init 注入；open() 打开滚轮。
export default {
  tag: 'af-picker',
  name: '滚轮选择器',
  scenarios: [
    {
      name: '日期选择',
      html: `
        <div class="actions">
          <button class="btn" id="pk-open">打开选择器</button>
        </div>
        <af-picker id="picker" title="选择日期"></af-picker>
        <p class="caption" id="pk-log">确认后显示选中值</p>
      `,
      main: { selector: 'af-picker' },
      props: [
        { prop: 'title', label: '标题', type: 'string' },
        { prop: 'visibleCount', label: '可见项数', type: 'number', min: 3, max: 7, step: 1 },
        { prop: 'itemHeight', label: '每项高度', type: 'number', min: 28, max: 48, step: 2 },
        { prop: 'confirmText', label: '确认文案', type: 'string' },
        { prop: 'cancelText', label: '取消文案', type: 'string' },
      ],
      events: ['af-picker:change', 'af-picker:confirm', 'af-picker:cancel'],
      styleTokens: [
        { token: '--c-brand', label: '主色', type: 'color' },
        { token: '--r-l', label: '圆角', type: 'range', min: 0, max: 24, default: 12 },
      ],
      init: () => {
        const picker = document.getElementById('picker');
        picker.columns = [
          ['2024', '2025', '2026'],
          ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
          ['1日', '15日', '28日'],
        ];
        picker.values = [1, 0, 0];
        document.getElementById('pk-open')?.addEventListener('click', () => picker.open());
        picker.addEventListener('af-picker:confirm', (e) => {
          const log = document.getElementById('pk-log');
          if (log) log.textContent = `确认: ${e.detail.values?.join(' / ')}`;
        });
        picker.addEventListener('af-picker:change', (e) => {
          const log = document.getElementById('pk-log');
          if (log) log.textContent = `变化: 第${e.detail.column + 1}列 ${e.detail.value}`;
        });
      },
    },
    {
      name: '省市级联',
      html: `
        <div class="actions">
          <button class="btn" id="pk-open2">打开选择器</button>
        </div>
        <af-picker id="picker2" title="选择省市"></af-picker>
        <p class="caption" id="pk-log2">切换省份联动城市列</p>
      `,
      main: { selector: 'af-picker' },
      props: [
        { prop: 'title', label: '标题', type: 'string' },
        { prop: 'visibleCount', label: '可见项数', type: 'number', min: 3, max: 7, step: 1 },
      ],
      events: ['af-picker:change', 'af-picker:confirm', 'af-picker:cancel'],
      styleTokens: [
        { token: '--c-brand', label: '主色', type: 'color' },
      ],
      init: () => {
        const data = {
          广东: ['广州', '深圳', '珠海'],
          浙江: ['杭州', '宁波', '温州'],
          江苏: ['南京', '苏州', '无锡'],
        };
        const picker = document.getElementById('picker2');
        picker.columns = [Object.keys(data), data['广东']];
        picker.values = ['广东', '广州'];
        document.getElementById('pk-open2')?.addEventListener('click', () => picker.open());
        picker.addEventListener('af-picker:change', (e) => {
          if (e.detail.column === 0) picker.setColumn(1, data[e.detail.value] || []);
        });
        picker.addEventListener('af-picker:confirm', (e) => {
          const log = document.getElementById('pk-log2');
          if (log) log.textContent = `确认: ${e.detail.values?.join(' / ')}`;
        });
      },
    },
  ],
};
