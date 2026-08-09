// AIFlow UI —— L1 主题 API：getTheme / setTheme / toggleTheme
// 仅 3 个 API：setTheme 触发 themechange 事件让 af-swiper 等组件响应
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
