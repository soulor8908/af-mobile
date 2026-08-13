// AIFlow UI —— i18n 国际化 API
// 与 theme.js 对称：函数式 API + CustomEvent('localechange') 通知
// SSR/Node 安全：所有 DOM/localStorage/navigator 访问惰性执行 + typeof 守卫
// 字典扁平 key（{组件2字母缩写}.{后缀}），不支持嵌套/复数/ICU 格式（YAGNI）

let _locale = 'zh-CN';

export const messages = {
  'zh-CN': {
    'bt.al': '回到顶部',
    'dg.cl': '关闭',
    'dg.al': '对话框',
    'as.al': '操作面板',
    'as.cn': '取消',
    'pk.tt': '请选择',
    'pk.ok': '确定',
    'pk.cn': '取消',
    'pk.col': '第 {n} 列',
    'dd.ph': '请选择',
    'nb.bk': '返回',
    'ls.rf': '正在刷新',
    'ls.ld': '加载中…',
    'ls.nm': '没有更多了',
    'ls.em': '暂无数据',
    'ls.al': '列表，共 {n} 项',
    'sw.dot': '第 {current} 张，共 {total} 张',
    'sw.al': '轮播图，共 {total} 张，当前第 {current} 张',
    'sb.ph': '搜索',
    'sb.clr': '清除',
    'tb.al': '标签页',
    'bb.al': '导航栏',
    'st.mn': '减少',
    'st.pl': '增加',
    'st.al': '数量',
    'pr.pl': '下拉刷新',
    'pr.rl': '释放立即刷新',
    'pr.ld': '加载中...',
    'sk.al': '加载中',
    'up.pv': '文件预览',
    'up.btn': '+ 选择文件',
    'up.al': '上传文件',
    'im.fail': '图片加载失败',
    'sg.al': '设置',
    'sg.em': '暂无设置项',
    'sg.ld': '加载中…',
    'sg.er': '加载失败',
    'sg.rt': '重试',
  },
  'en-US': {
    'bt.al': 'Back to top',
    'dg.cl': 'Close',
    'dg.al': 'Dialog',
    'as.al': 'Action sheet',
    'as.cn': 'Cancel',
    'pk.tt': 'Please select',
    'pk.ok': 'OK',
    'pk.cn': 'Cancel',
    'pk.col': 'Column {n}',
    'dd.ph': 'Please select',
    'nb.bk': 'Back',
    'ls.rf': 'Refreshing',
    'ls.ld': 'Loading...',
    'ls.nm': 'No more',
    'ls.em': 'No data',
    'ls.al': 'List, {n} items',
    'sw.dot': 'Slide {current} of {total}',
    'sw.al': 'Carousel, {total} slides, current {current}',
    'sb.ph': 'Search',
    'sb.clr': 'Clear',
    'tb.al': 'Tabs',
    'bb.al': 'Navigation bar',
    'st.mn': 'Decrease',
    'st.pl': 'Increase',
    'st.al': 'Quantity',
    'pr.pl': 'Pull to refresh',
    'pr.rl': 'Release to refresh',
    'pr.ld': 'Loading...',
    'sk.al': 'Loading',
    'up.pv': 'File preview',
    'up.btn': '+ Select file',
    'up.al': 'Upload file',
    'im.fail': 'Image load failed',
    'sg.al': 'Settings',
    'sg.em': 'No settings',
    'sg.ld': 'Loading...',
    'sg.er': 'Load failed',
    'sg.rt': 'Retry',
  },
};

/** 翻译：回退链 当前→zh-CN→key 自身 */
export function t(key, vars) {
  const dict = messages[_locale] || messages['zh-CN'];
  let s = dict[key];
  if (s == null) s = messages['zh-CN'][key] ?? key;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** 获取当前语言 */
export function getLocale() {
  return _locale;
}

/** 设置语言 + 持久化 + dispatch 'localechange' */
export function setLocale(locale) {
  if (_locale === locale) return;
  _locale = locale;
  if (typeof localStorage !== 'undefined') localStorage.setItem('locale', locale);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.documentElement.dispatchEvent(new CustomEvent('localechange', { detail: locale }));
  }
}

/** 从 localStorage 恢复语言（入口尽早调用） */
export function initLocale() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('locale');
    if (saved && messages[saved]) {
      _locale = saved;
      if (typeof document !== 'undefined') document.documentElement.lang = saved;
      return;
    }
  }
  if (typeof navigator !== 'undefined') {
    const nav = navigator.language || '';
    const matched = Object.keys(messages).find(k => k === nav || k.startsWith(nav.split('-')[0]));
    if (matched) _locale = matched;
  }
}

/** 注册/覆盖语言包（浅合并） */
export function addMessages(locale, dict) {
  messages[locale] = { ...messages[locale], ...dict };
}
