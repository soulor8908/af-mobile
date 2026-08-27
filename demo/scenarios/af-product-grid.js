// 沙盒场景：af-product-grid（L3.5 商品网格五态块）
export default {
  tag: 'af-product-grid',
  name: '商品网格',
  scenarios: [
    {
      name: '单列大图',
      html: '<af-product-grid id="demo-one"></af-product-grid>',
      main: { selector: '#demo-one' },
      props: [],
      events: ['af-product-grid:itemclick'],
      init() {
        const el = document.getElementById('demo-one');
        el.variant = 'one-column';
        el.items = [
          { title: 'AI 无线耳机 Pro', subtitle: '主动降噪 · 40h 续航', price: '¥1299', priceDel: '¥1599' },
          { title: '智能手表 S7', subtitle: '血氧监测 · NFC', price: '¥1899' },
          { title: '下架商品示例', subtitle: '不可点击', price: '¥99', disabled: true },
        ];
      },
    },
    {
      name: '双列瀑布',
      html: '<af-product-grid id="demo-two"></af-product-grid>',
      main: { selector: '#demo-two' },
      props: [],
      events: ['af-product-grid:itemclick'],
      init() {
        const el = document.getElementById('demo-two');
        el.variant = 'two-column';
        el.items = [
          { title: '无线耳机 Pro', price: '¥1299', priceDel: '¥1599' },
          { title: '便携充电宝', price: '¥199' },
          { title: '蓝牙音箱 mini', price: '¥329' },
          { title: '智能台灯 Lite', price: '¥259' },
        ];
      },
    },
  ],
};
