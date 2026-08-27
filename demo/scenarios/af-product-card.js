// 沙盒场景：af-product-card（L3.5 商品卡片五态块）
// 契约见 af-dialog.js 顶部注释
export default {
  tag: 'af-product-card',
  name: '商品卡片',
  scenarios: [
    {
      name: '商品列表',
      html: '<af-product-card id="demo"></af-product-card>',
      main: { selector: '#demo' },
      props: [
        { prop: 'title', label: '标题', type: 'string' },
        { prop: 'loading', label: 'loading 态', type: 'boolean' },
      ],
      events: ['af-product-card:itemclick', 'af-product-card:retry'],
      init() {
        const el = document.getElementById('demo');
        el.title = '本周热销';
        el.items = [
          { label: '无线耳机 Pro', action: 'arrow' },
          { label: '便携充电宝 2 万毫安', action: 'arrow' },
          { label: '蓝牙音箱 mini', disabled: true },
        ];
      },
    },
    {
      name: '空态 / 错误态',
      html: '<af-product-card id="demo-empty"></af-product-card>',
      main: { selector: '#demo-empty' },
      props: [],
      events: ['af-product-card:retry'],
      init() {
        const el = document.getElementById('demo-empty');
        el.title = '加载失败示例';
        // 五态块错误态：setError 展示错误文案 + 重试按钮
        el.setError(new Error('网络超时'));
      },
    },
  ],
};
