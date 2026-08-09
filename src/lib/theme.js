// AIFlow UI —— L1 主题 API：getTheme / setTheme / toggleTheme / initTheme
// setTheme 触发 themechange 事件让 af-swiper 等组件响应
// SSR/Node 安全：所有 DOM/localStorage/matchMedia 访问惰性执行 + typeof 守卫，
// 模块顶层无副作用，import 不会在非浏览器环境抛错

function getRoot() {
  return typeof document !== 'undefined' ? document.documentElement : null;
}

export function getTheme() {
  const root = getRoot();
  if (!root) return 'light';
  const explicit = root.dataset.theme;
  if (explicit) return explicit;
  if (typeof matchMedia === 'function') {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function setTheme(t) {
  const root = getRoot();
  if (!root) return;
  root.dataset.theme = t;
  if (typeof localStorage !== 'undefined') localStorage.setItem('theme', t);
  root.dispatchEvent(new CustomEvent('themechange', { detail: t }));
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// 从 localStorage 恢复主题（应在入口尽早调用，先于组件挂载）
export function initTheme() {
  const root = getRoot();
  if (!root || typeof localStorage === 'undefined') return;
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
}
