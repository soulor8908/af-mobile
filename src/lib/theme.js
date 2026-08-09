// AIFlow UI —— L1 主题 API：getTheme / setTheme / toggleTheme / initTheme
// setTheme 触发 themechange 事件让 af-swiper 等组件响应
const root = document.documentElement;

export function getTheme() {
  const explicit = root.dataset.theme;
  if (explicit) return explicit;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(t) {
  root.dataset.theme = t;
  localStorage.setItem('theme', t);
  root.dispatchEvent(new CustomEvent('themechange', { detail: t }));
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// 从 localStorage 恢复主题（应在入口尽早调用，先于组件挂载）
export function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
}
