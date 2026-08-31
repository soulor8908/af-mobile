// AI 待办 · 最小完整应用（三页：列表 / AI 助手 / 统计）——官方教科书画像
// 三页各覆盖一个能力域：主库 CRUD / chat 子库工具闭环 / charts 子库
import { register, route, start, afterEach, go, initLocale } from '../../../src/index.js';
import { registerChat } from '../../../src/chat/index.js';
import { registerChart } from '../../../src/charts/index.js';
import listPage from './pages/list.js';
import chatPage from './pages/chat.js';
import statsPage from './pages/stats.js';

// 按需注册：主库组件 / chat 子库 / charts 子库（子库必须走子入口，禁主入口 register）
// ⚠️ 入口禁写「顶层 await register(...)」（TLA）：生产构建（Vite/Rollup 分包）会把入口变成
// TLA 模块，与组件 chunk 形成 entry ↔ chunk 循环依赖——组件永不注册、页面空白且零报错。
// register()/registerChat() 发起注册即可，router 首次渲染前自动等待（start 内部 whenReady）；
// 普通模块/脚本片段里紧跟 property 操作时才需要 await（upgrade 后赋值才生效）。
register('af-tabbar', 'af-swipe-cell', 'af-dialog', 'af-toast');
registerChat();
registerChart('af-chart-bar');
initLocale();

route('/', listPage);
route('/chat', chatPage);
route('/stats', statsPage);
start('#app', { hash: true });

// tabbar：点击 → 导航；路由 → 高亮（单一真相源，kitchen-sink 同款）
const tabbar = document.getElementById('tabbar');
tabbar.tabs = [
  { label: '待办', value: '/' },
  { label: 'AI 助手', value: '/chat' },
  { label: '统计', value: '/stats' },
];
tabbar.addEventListener('af-tabbar:change', (e) => go(tabbar.tabs[e.detail.index].value));
afterEach((r, p, path) => {
  const idx = tabbar.tabs.findIndex((t) => t.value === path);
  if (idx >= 0) tabbar.activeIndex = idx;
});
