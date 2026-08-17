// 应用入口：注册组件 → 声明路由 → 守卫 → 启动
import './backend.js';                       // 副作用装配 supabase:// scheme（设计 §4.3）
import './styles.css';
import { register, route, start, beforeEach, go } from '@af-mobile/ui';
import { supabase } from './backend.js';
import loginPage from './pages/login.js';
import listPage from './pages/list.js';
import detailPage from './pages/detail.js';

// 显式注册页面用到的 af-* 组件（禁止 registerAll()，会失去 Tree Shaking）
register('af-list', 'af-search-bar', 'af-navbar', 'af-img', 'af-field');

route('/login', loginPage);
route('/', listPage);
route('/detail/:id', detailPage);

// 登录守卫：未登录访问受保护页 → 跳 /login
beforeEach(async (to) => {
  const { data } = await supabase.auth.getSession();
  if (!data.session && to.path !== '/login') return '/login';
});

start('#app');
