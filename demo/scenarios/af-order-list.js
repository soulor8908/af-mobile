// 沙盒场景：af-order-list（L3.5 订单列表五态块）
export default {
  tag: 'af-order-list',
  name: '订单列表',
  scenarios: [
    {
      name: '详细模式',
      html: '<af-order-list id="demo-detailed"></af-order-list>',
      main: { selector: '#demo-detailed' },
      props: [{ prop: 'title', label: '标题', type: 'string' }],
      events: ['af-order-list:itemclick'],
      init() {
        const el = document.getElementById('demo-detailed');
        el.variant = 'detailed';
        el.title = '近期订单';
        el.items = [
          { no: 'SO202608270001', time: '今天 14:20', status: '待发货', tone: 'warn', amount: '¥1299.00', thumbs: ['', '', ''] },
          { no: 'SO202608260009', time: '昨天 09:05', status: '已完成', tone: 'ok', amount: '¥59.90', thumbs: [''] },
          { no: 'SO202608250012', time: '08-25 18:33', status: '已取消', amount: '¥29.00' },
        ];
      },
    },
    {
      name: '简单模式',
      html: '<af-order-list id="demo-simple"></af-order-list>',
      main: { selector: '#demo-simple' },
      props: [],
      events: ['af-order-list:itemclick'],
      init() {
        const el = document.getElementById('demo-simple');
        el.variant = 'simple';
        el.items = [
          { no: 'SO202608240007', status: '已完成', tone: 'ok', amount: '¥199.00' },
          { no: 'SO202608230021', status: '已发货', tone: 'warn', amount: '¥4999.00' },
        ];
      },
    },
  ],
};
