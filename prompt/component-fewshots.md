<!-- 由 scripts/gen-component-fewshots.mjs 自动生成，勿手改；源：demo/scenarios/af-*.js -->
<!-- 手写 fewshot 字段的组件优先内联；其余为回退骨架。协议见 demo/scenarios/af-picker.js 头注释 -->

### <af-action-sheet>

```html
<af-action-sheet id="as" title="选择操作" show-cancel></af-action-sheet>
```

```js
const as = document.getElementById('as');
as.options = [
  { label: '微信好友', value: 'wx' },
  { label: '删除', value: 'del', danger: true }, // danger 红色项
];
as.addEventListener('af-action-sheet:select', (e) => console.log(e.detail.index, e.detail.value));
as.showPopover(); // 显隐必须走 popover API，禁手动 display 切换
```

- options 数组（label/value/danger/disabled）；showPopover()/hidePopover() 控制显隐

### <af-backtop>

```html
<af-backtop threshold="120" text="↑"></af-backtop>
```

```js
document.querySelector('af-backtop').addEventListener('af-backtop:click', () => console.log('回顶'));
```

- threshold 触发阈值；target 指定滚动容器选择器（缺省 window）；fixed 定位，click 平滑回顶

### <af-badge>

```html
<af-badge content="8"></af-badge>
<af-badge content="99" max="99"></af-badge>
<af-badge dot></af-badge>
```

- content 数字/文字；max 封顶显示 99+；dot 纯红点（无数字）

### <af-calendar>

```html
<af-calendar id="cal" min="2026-01-01"></af-calendar>
```

```js
const cal = document.getElementById('cal');
cal.addEventListener('af-calendar:select', (e) => console.log(e.detail.date));
cal.addEventListener('af-calendar:monthchange', (e) => console.log(e.detail.month));
```

- value/min/max（YYYY-MM-DD）；select 载荷 e.detail.date，翻月触发 monthchange

### <af-cascade-picker>

```html
<af-cascade-picker id="cp" title="选择地区"></af-cascade-picker>
```

```js
const cp = document.getElementById('cp');
cp.tree = [
  { label: '浙江省', value: 'zj', children: [{ label: '杭州市', value: 'hz' }, { label: '宁波市', value: 'nb' }] },
  { label: '广东省', value: 'gd', children: [{ label: '广州市', value: 'gz' }] },
];
cp.addEventListener('af-picker:confirm', (e) => console.log(e.detail.values));
cp.open();
```

- tree 树形数据（children 缺省为叶节点）；事件沿用 af-picker:*；confirm 载荷 e.detail.values

### <af-chart-bar>

```html
<af-chart-bar id="c" legend></af-chart-bar>
```

```js
import { registerChart } from '../../src/charts/index.js'; // 子库注册，禁主入口 register
await registerChart('af-chart-bar');
const c = document.getElementById('c');
c.labels = ['一月', '二月', '三月', '四月'];
c.series = [{ name: '销售额', values: [1280, 960, 540, 420] }];
```

- 子库注册（registerChart）；labels + series[{name, values}]；variant：column/bar/stacked/grouped

### <af-chart-funnel>

```html
<af-chart-funnel id="c" show-rate></af-chart-funnel>
```

```js
import { registerChart } from '../../src/charts/index.js'; // 子库注册，禁主入口 register
await registerChart('af-chart-funnel');
document.getElementById('c').data = [
  { label: '曝光', value: 10000 },
  { label: '点击', value: 6200 },
  { label: '支付', value: 980 },
];
```

- 子库注册（registerChart）；data=[{label, value}]，show-rate 显示层间转化率；层色可 data.color 覆盖

### <af-chart-line>

```html
<af-chart-line id="c" smooth legend></af-chart-line>
```

```js
import { registerChart } from '../../src/charts/index.js'; // 子库注册，禁主入口 register
await registerChart('af-chart-line');
const c = document.getElementById('c');
c.labels = ['周一', '周二', '周三'];
c.series = [{ name: '销售额', values: [1280, 960, 540] }];
```

- 子库注册（registerChart）；labels + series[{name, values}]；variant：line/area/scatter/spark，select/retry 事件

### <af-chart-pie>

```html
<af-chart-pie id="c" variant="donut" center-text="总量"></af-chart-pie>
```

```js
import { registerChart } from '../../src/charts/index.js'; // 子库注册，禁主入口 register
await registerChart('af-chart-pie');
document.getElementById('c').data = [
  { label: '直接访问', value: 400 },
  { label: '搜索引擎', value: 310 },
];
```

- 子库注册（registerChart）；data=[{label, value}]；variant：pie/donut/half/rose，center-text 中心文案

### <af-chart-radar>

```html
<af-chart-radar id="c" shape="circle"></af-chart-radar>
```

```js
import { registerChart } from '../../src/charts/index.js'; // 子库注册，禁主入口 register
await registerChart('af-chart-radar');
const c = document.getElementById('c');
c.data = [{ label: '性能', max: 100 }, { label: '易用', max: 100 }];
c.series = [{ name: '机型 A', values: [90, 75] }];
```

- 子库注册（registerChart）；data=[{label, max}] 定维度 + series[{name, values}] 定主体；shape：polygon/circle

### <af-chat>

```html
<af-chat placeholder="请输入您的问题"></af-chat>
```

```js
import { registerChat, createSession } from '../../src/chat/index.js'; // 子库注册，禁主入口 register
await registerChat();
const session = createSession({ endpoint: '/api/chat' });
const el = document.querySelector('af-chat');
el.session = session;
el.addEventListener('af-chat:send', (e) => console.log(e.detail.text));
```

- 子库注册（registerChat）+ session 绑定为推荐接入；send/action/confirm/abort/error 事件；messages 受控渲染为备选

### <af-countdown>

```html
<af-countdown id="cd" time="3600" autostart></af-countdown>
```

```js
const cd = document.getElementById('cd');
cd.addEventListener('af-countdown:change', (e) => console.log(e.detail.remaining, '/', e.detail.total));
cd.addEventListener('af-countdown:end', () => console.log('已结束'));
```

- time 单位秒；autostart 自动开始；change 载荷 {remaining, total}，归零触发 end

### <af-dialog>

```html
<af-dialog id="d" title="确认操作" open>
  <div slot="body"><p class="body">确定要删除这条记录吗？</p></div>
  <div slot="footer">
    <button class="btn btn-ghost btn-block" data-act="cancel">取消</button>
    <button class="btn btn-block" data-act="confirm">删除</button>
  </div>
</af-dialog>
```

```js
const d = document.getElementById('d');
d.open(); // 打开（组件方法控制显隐，焦点陷阱内置）；初始即打开可加 open 属性
d.querySelector('[data-act="confirm"]').addEventListener('click', () => d.close('confirm'));
d.addEventListener('af-dialog:close', (e) => console.log(e.detail.action)); // 'confirm' / undefined=取消
```

- 内容用 slot=body / slot=footer 分发；open 属性=初始打开；open()/close(action) 控制显隐，action 进 close 事件载荷

### <af-dropdown>

```html
<af-dropdown id="dd" placeholder="请选择城市"></af-dropdown>
```

```js
const dd = document.getElementById('dd');
dd.options = ['北京', '上海', '广州', '深圳']; // 数组注入须在 register 之后
dd.addEventListener('af-dropdown:select', (e) => console.log(e.detail.index, e.detail.value));
```

- options 数组注入；value/placeholder/disabled 属性；选中派发 select（载荷 index/value）

### <af-field>

```html
<af-field label="用户名" placeholder="请输入用户名" help="3-20 位字符"></af-field>
<af-field label="密码" input-type="password" placeholder="请输入密码"></af-field>
<af-field label="留言" type="textarea"></af-field>
```

```js
const f = document.querySelector('af-field');
f.addEventListener('af-field:input', (e) => console.log(e.detail.value));
f.setError('格式不正确'); // 动态写错误态；setError('') 清除
```

- label/input-type/type=textarea/help/error 属性；值经 e.detail.value 外发；setError(msg) 动态校验

### <af-img>

```html
<af-img src="goods.jpg" alt="商品图" placeholder-src="ph.jpg" fail-src="fail.jpg" variant="thumb"></af-img>
```

- 懒加载（IntersectionObserver）；placeholder-src 占位 / fail-src 失败兜底；variant：default/thumb/avatar

### <af-list>

```html
<af-list id="list"></af-list>
```

```js
const list = document.getElementById('list');
list.data = [{ title: '商品 1', subtitle: '更新于 08-01' }]; // 数组注入，默认渲染 title/subtitle
list.addEventListener('af-list:itemclick', (e) => console.log(e.detail.index, e.detail.item));
list.addEventListener('af-list:loadmore', () => list.endLoadMore(false)); // 已到底：false 显示「没有更多」
```

- data 数组注入即渲染；自定义行样式用 renderItem；endLoadMore(hasMore) 控制翻页判停

### <af-navbar>

```html
<af-navbar title="商品详情" show-back back-text="返回">
  <button slot="right" class="btn btn-ghost btn-sm">分享</button>
</af-navbar>
```

```js
document.querySelector('af-navbar').addEventListener('af-navbar:back', () => history.back());
```

- title/show-back/back-text 属性；右侧自定义内容 slot="right"；sticky 定位自带 safe-area 适配

### <af-notice-bar>

```html
<af-notice-bar text="活动公告：全场满 199 减 30" scroll></af-notice-bar>
```

- text 公告文案；scroll 循环滚动（缺省静态）

### <af-number-keyboard>

```html
<af-password-input id="pi" length="6" mask></af-password-input>
<af-number-keyboard id="kb" random title="输入密码"></af-number-keyboard>
```

```js
import { register } from '/af-mobile.js'; // 页面用任何 af-* 都必须先引主入口
await register('af-password-input', 'af-number-keyboard', 'af-toast');
const kb = document.getElementById('kb');
const pi = document.getElementById('pi');
kb.addEventListener('af-number-keyboard:input', (e) => { pi.value = e.detail.value; });
kb.addEventListener('af-number-keyboard:complete', (e) => console.log('完成:', e.detail.value));
kb.addEventListener('af-number-keyboard:delete', (e) => { pi.value = e.detail.value; });
kb.open(); // 弹层组件（原生 dialog），默认关闭，必须调用 open() 才可见
```

- 弹层组件：默认关闭，必须 kb.open()（可进入页面即调）；random 随机布局键盘；input 载荷 { key, value }，输满 maxlength 派发 complete；与 af-password-input 配对使用

### <af-password-input>

```html
<af-password-input id="pi" length="6" mask focused></af-password-input>
```

```js
const pi = document.getElementById('pi');
pi.addEventListener('af-password-input:complete', () => console.log('输入完成，可发起校验'));
pi.addEventListener('af-password-input:change', (e) => console.log(e.detail.value));
```

- length/mask/focused 属性；输满 length 触发 complete；值经 e.detail.value 外发；配 af-number-keyboard 使用

### <af-picker>

```html
<af-picker id="p" title="选择日期"></af-picker>
```

```js
const p = document.getElementById('p');
p.columns = [['2024', '2025'], ['1月', '2月', '3月'], ['1日', '15日']]; // 二维数组 = 多列
p.values = ['2025', '2月', '15日']; // 可选：默认选中值
p.open(); // 打开滚轮（须由用户手势触发）
p.addEventListener('af-picker:confirm', (e) => console.log(e.detail.values)); // 确认后的选中值数组
```

- columns 二维数组=多列联动；setColumn(i, cols) 做省市级联；open() 打开滚轮

### <af-progress>

```html
<af-progress value="680" max="1000"></af-progress>
```

- value/max 属性；颜色可用 --c-brand 等令牌覆盖

### <af-pull-refresh>

```html
<af-pull-refresh id="pr">
  <div class="list"><div class="list-item">列表项</div></div>
</af-pull-refresh>
```

```js
const pr = document.getElementById('pr');
pr.addEventListener('af-pull-refresh:refresh', () => {
  setTimeout(() => { pr.refreshing = false; }, 1500); // 数据加载完成后复位
});
```

- 包裹列表内容；refreshing 属性单向输入，refresh 事件里加载数据后手动置 false 复位

### <af-rate>

```html
<af-rate id="rt" value="4" max="5"></af-rate>
```

```js
document.getElementById('rt').addEventListener('af-rate:change', (e) => console.log(e.detail.value));
```

- value/max/readonly/size 属性；change 载荷 e.detail.value

### <af-search-bar>

```html
<af-search-bar id="sb" placeholder="搜索商品、店铺"></af-search-bar>
```

```js
const sb = document.getElementById('sb');
sb.addEventListener('af-search-bar:search', (e) => console.log(e.detail.value)); // 防抖确认后触发
sb.addEventListener('af-search-bar:clear', (e) => console.log(e.detail.value)); // 清除后自动聚焦
sb.focus();
```

- value/placeholder/debounce 属性；input 实时 / search 防抖确认 / clear 清除三事件；有值时自带清除按钮

### <af-skeleton-page>

```html
<af-skeleton-page variant="list"></af-skeleton-page>
```

- variant 四选一：list / detail / profile / card；加载完成后移除元素换成真实内容

### <af-stepper>

```html
<af-stepper id="sp" value="1" min="1" max="99"></af-stepper>
```

```js
document.getElementById('sp').addEventListener('af-stepper:change', (e) => console.log(e.detail.value));
```

- value/min/max/step/disabled 属性；change 载荷 e.detail.value；setValue(i) 编程赋值

### <af-steps>

```html
<af-steps id="st"></af-steps>
```

```js
const st = document.getElementById('st');
st.steps = ['提交订单', '付款', '发货', '收货'];
st.current = 2; // 当前进行到第 3 步
```

- steps 字符串数组或 {label} 对象数组；current 高亮当前步

### <af-swipe-cell>

```html
<af-swipe-cell>
  <div slot="content" class="list-item">消息内容</div>
  <div slot="right"><button class="btn btn-danger" data-action="delete">删除</button></div>
</af-swipe-cell>
```

```js
document.querySelector('af-swipe-cell').addEventListener('af-swipe-cell:action', (e) => {
  if (e.detail.action === 'delete') /* 移除该项 */;
});
```

- slot=content 主内容 / slot=right 操作区；操作按钮 data-action 值进载荷 e.detail.action；同类单元按数据条数重复多个

### <af-swiper>

```html
<af-swiper autoplay="3000" loop>
  <div>slide 1</div>
  <div>slide 2</div>
  <div>slide 3</div>
</af-swiper>
```

- 子元素即 slide（slot 分发）；autoplay(ms)/loop/showDots 属性；goTo(i)/next()/prev() 编程切换；触摸横竖向判定防误滚页面

### <af-switch>

```html
<div class="cell"><span class="body">通知推送</span><af-switch id="sw" checked></af-switch></div>
```

```js
const sw = document.getElementById('sw');
sw.addEventListener('af-switch:change', (e) => console.log(e.detail.checked));
sw.toggle(true); // 受控切换：与当前态相同时不派发事件
```

- checked/loading/disabled/size 属性；toggle(force) 受控切换；载荷 e.detail.checked

### <af-tabbar>

```html
<af-tabbar id="tb" active-index="0"></af-tabbar>
```

```js
import { register } from '/af-mobile.js'; // 页面用任何 af-* 都必须先引主入口
await register('af-tabbar');
const tb = document.getElementById('tb');
tb.tabs = [
  { label: '首页', value: 'home' },
  { label: '消息', value: 'msg', badge: '3' }, // badge 可选
  { label: '我的', value: 'me' },
];
tb.addEventListener('af-tabbar:change', (e) => console.log(e.detail.index, e.detail.value));
```

- tabs 数组注入（label/value/badge 可选）；默认吸底 + safe-area，fixed="false" 取消；icon 省略即纯文字（禁 emoji）

### <af-tabs>

```html
<af-tabs id="tt"></af-tabs>
```

```js
const tt = document.getElementById('tt');
tt.tabs = [{ label: '商品' }, { label: '评价' }, { label: '详情' }];
tt.addEventListener('af-tabs:change', (e) => console.log(e.detail.index, e.detail.value));
```

- tabs 数组（label/value/disabled 可选）+ active-index；setActive(i) 编程切换；选中态由 aria-selected 驱动；面板内容自行联动 change 事件

### <af-toast>

```html
<af-toast id="toast"></af-toast>
```

```js
const toast = document.getElementById('toast');
toast.show('操作成功', { type: 'success' }); // success / warning / error / loading
toast.show('加载中…', { type: 'loading', duration: 0, closeOnClick: true }); // duration=0 常驻
toast.dismiss(); // 手动关闭，派发 af-toast:dismiss
```

- 单例组件：页面放一个 <af-toast>，全部提示走 show()；duration 默认自动消失

### <af-upload>

```html
<af-upload accept="image/*" multiple max-count="3" button-text="上传图片"></af-upload>
```

```js
document.querySelector('af-upload').addEventListener('af-upload:change', (e) => {
  console.log(e.detail.files, e.detail.errors); // files: [{ file, url, name, size }]
});
```

- accept/multiple/max-count/max-size/button-text 属性；change 载荷 { files, errors }；超限走 af-upload:error
