<!-- 由 scripts/gen-component-fewshots.mjs 自动生成，勿手改；源：demo/scenarios/af-*.js -->
<!-- 手写 fewshot 字段的组件优先内联；其余为回退骨架。协议见 demo/scenarios/af-picker.js 头注释 -->

### <af-action-sheet>

```html
<af-action-sheet id="sheet" title="选择操作"></af-action-sheet>
```

```js
const el = document.querySelector('af-action-sheet');
el.addEventListener('af-action-sheet:open', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-action-sheet:select', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-action-sheet:close', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-backtop>

```html
<af-backtop id="bt" target='[data-role="bt-scroller"]' threshold="120" text="↑"></af-backtop>
```

```js
const el = document.querySelector('af-backtop');
el.addEventListener('af-backtop:click', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-backtop:show', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-backtop:hide', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-badge>

```html
<af-badge id="b1" content="8"></af-badge>
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-calendar>

```html
<af-calendar id="cal"></af-calendar>
```

```js
const el = document.querySelector('af-calendar');
el.addEventListener('af-calendar:select', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-calendar:monthchange', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-cascade-picker>

```html
<af-cascade-picker id="cp" title="选择地区"></af-cascade-picker>
```

```js
const el = document.querySelector('af-cascade-picker');
el.addEventListener('af-picker:confirm', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-picker:cancel', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-chart-bar>

```html
<af-chart-bar id="demo" legend></af-chart-bar>
```

```js
const el = document.querySelector('af-chart-bar');
el.addEventListener('af-chart-bar:select', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-chart-bar:retry', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-chart-funnel>

```html
<af-chart-funnel id="demo"></af-chart-funnel>
```

```js
const el = document.querySelector('af-chart-funnel');
el.addEventListener('af-chart-funnel:select', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-chart-funnel:retry', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-chart-line>

```html
<af-chart-line id="demo" legend></af-chart-line>
```

```js
const el = document.querySelector('af-chart-line');
el.addEventListener('af-chart-line:select', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-chart-line:retry', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-chart-pie>

```html
<af-chart-pie id="demo" legend></af-chart-pie>
```

```js
const el = document.querySelector('af-chart-pie');
el.addEventListener('af-chart-pie:select', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-chart-pie:retry', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-chart-radar>

```html
<af-chart-radar id="demo" legend></af-chart-radar>
```

```js
const el = document.querySelector('af-chart-radar');
el.addEventListener('af-chart-radar:select', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-chart-radar:retry', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-chat>

```html
<af-chat id="chat" class="flex-1"></af-chat>
```

```js
const el = document.querySelector('af-chat');
el.addEventListener('af-chat:send', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-countdown>

```html
<af-countdown id="cd" time="90"></af-countdown>
```

```js
const el = document.querySelector('af-countdown');
el.addEventListener('af-countdown:end', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-countdown:change', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-dialog>

```html
<af-dialog id="d" title="确认操作">
  <div slot="body"><p class="body">确定要删除这条记录吗？</p></div>
  <div slot="footer">
    <button class="btn btn-ghost btn-block" data-act="cancel">取消</button>
    <button class="btn btn-block" data-act="confirm">删除</button>
  </div>
</af-dialog>
```

```js
const d = document.getElementById('d');
d.open(); // 打开（组件方法控制显隐，焦点陷阱内置）
d.querySelector('[data-act="confirm"]').addEventListener('click', () => d.close('confirm'));
d.addEventListener('af-dialog:close', (e) => console.log(e.detail.action)); // 'confirm' / undefined=取消
```

- 内容用 slot=body / slot=footer 分发；open()/close(action) 控制显隐，action 进 close 事件载荷

### <af-dropdown>

```html
<af-dropdown id="dd" placeholder="请选择城市"></af-dropdown>
```

```js
const el = document.querySelector('af-dropdown');
el.addEventListener('af-dropdown:select', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-dropdown:close', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-field>

```html
<af-field id="f1" label="用户名" placeholder="请输入用户名" help="3-20 位字符"></af-field>
```

```js
const el = document.querySelector('af-field');
el.addEventListener('af-field:input', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-field:change', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-img>

```html
<af-img id="img" alt="示例图片" src="https://picsum.photos/360/200" placeholder-src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='200'%3E%3Crect fill='%23eee' width='360' height='200'/%3E%3C/svg%3E"></af-img>
```

```js
const el = document.querySelector('af-img');
el.addEventListener('af-img:load', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-img:error', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

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
<af-navbar id="nb" title="商品详情" show-back back-text="返回"></af-navbar>
```

```js
const el = document.querySelector('af-navbar');
el.addEventListener('af-navbar:back', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-notice-bar>

```html
<af-notice-bar id="n1" text="系统将于今晚 23:00 进行维护升级，届时服务暂停 10 分钟"></af-notice-bar>
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-number-keyboard>

```html
<af-number-keyboard id="kb" title="安全键盘" maxlength="6" random></af-number-keyboard>
```

```js
const el = document.querySelector('af-number-keyboard');
el.addEventListener('af-number-keyboard:input', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-number-keyboard:delete', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-number-keyboard:complete', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-number-keyboard:close', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-password-input>

```html
<af-password-input id="pi" length="6" mask></af-password-input>
```

```js
const el = document.querySelector('af-password-input');
el.addEventListener('af-password-input:complete', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

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
<af-progress id="p1" value="60"></af-progress>
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-pull-refresh>

```html
<af-pull-refresh id="pr"></af-pull-refresh>
```

```js
const el = document.querySelector('af-pull-refresh');
el.addEventListener('af-pull-refresh:refresh', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-rate>

```html
<af-rate id="r1" value="3"></af-rate>
```

```js
const el = document.querySelector('af-rate');
el.addEventListener('af-rate:change', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-search-bar>

```html
<af-search-bar id="sb" placeholder="搜索商品、店铺"></af-search-bar>
```

```js
const el = document.querySelector('af-search-bar');
el.addEventListener('af-search-bar:input', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-search-bar:search', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-search-bar:clear', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-skeleton-page>

```html
<af-skeleton-page id="sk" variant="list"></af-skeleton-page>
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-stepper>

```html
<af-stepper id="st" value="2"></af-stepper>
```

```js
const el = document.querySelector('af-stepper');
el.addEventListener('af-stepper:change', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-steps>

```html
<af-steps id="s1" current="2"></af-steps>
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-swipe-cell>

```html
<af-swipe-cell></af-swipe-cell>
```

```js
const el = document.querySelector('af-swipe-cell');
el.addEventListener('af-swipe-cell:action', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-swiper>

```html
<af-swiper id="swiper"></af-swiper>
```

```js
const el = document.querySelector('af-swiper');
el.addEventListener('af-swiper:change', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-switch>

```html
<af-switch id="s1"></af-switch>
```

```js
const el = document.querySelector('af-switch');
el.addEventListener('af-switch:change', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-tabbar>

```html
<af-tabbar id="tb" active-index="0"></af-tabbar>
```

```js
const el = document.querySelector('af-tabbar');
el.addEventListener('af-tabbar:change', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-tabs>

```html
<af-tabs id="tabs"></af-tabs>
```

```js
const el = document.querySelector('af-tabs');
el.addEventListener('af-tabs:change', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-toast>

```html
<af-toast id="toast"></af-toast>
```

```js
const el = document.querySelector('af-toast');
el.addEventListener('af-toast:dismiss', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios

### <af-upload>

```html
<af-upload id="upload" accept="image/*" multiple max-count="3" max-size="2097152"></af-upload>
```

```js
const el = document.querySelector('af-upload');
el.addEventListener('af-upload:change', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
el.addEventListener('af-upload:error', (e) => console.log(e.detail)); // 载荷字段以 src/index.d.ts 为准
```

- 最小骨架（回退生成）；完整场景读本文件 scenarios
