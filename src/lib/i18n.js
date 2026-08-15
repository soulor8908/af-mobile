// AIFlow UI —— i18n 国际化 API
// 与 theme.js 对称：函数式 API + CustomEvent('localechange') 通知
// SSR/Node 安全：所有 DOM/localStorage/navigator 访问惰性执行 + typeof 守卫
// 字典扁平 key（{组件2字母缩写}.{后缀}）；复数条目用 { zero/one/two/few/many/other } 对象 + CLDR 规则（W7）

let _locale = 'zh-CN';

// 语言包懒加载表：locale → Promise<dict>（addMessages 函数式调用去重，加载后常驻缓存）
const _loaders = new Map();

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

// CLDR plural rules（轻量 ICU 子集；按 '-' 前的主语言匹配，未知语言回退 en）
// 注：仅计算可数整数 n 的语法复数类别；中文/日语恒为 'other'
const _twoForm = n => (n === 0 || n === 1) ? 'one' : 'other';   // fr/es/pt/it 等
const _slavicForm = n => {                                      // ru/uk/pl 等
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'one';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'few';
  return 'many';
};
const PLURAL_RULES = {
  en: n => n === 1 ? 'one' : 'other',
  zh: () => 'other',
  ja: () => 'other',
  ar: n => {
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    if (n % 100 >= 3 && n % 100 <= 10) return 'few';
    if (n % 100 >= 11 && n % 100 <= 99) return 'many';
    return 'other';
  },
  fr: _twoForm, es: _twoForm, pt: _twoForm,
  ru: _slavicForm, uk: _slavicForm,
};

/** 翻译：回退链 当前→zh-CN→key 自身；复数条目按 CLDR 规则选形（无 n 时用 other） */
export function t(key, vars) {
  const dict = messages[_locale] || messages['zh-CN'];
  let s = dict[key];
  if (s == null) s = messages['zh-CN'][key] ?? key;
  if (s && typeof s === 'object') {
    const rule = (PLURAL_RULES[_locale.split('-')[0]] || PLURAL_RULES.en)(vars && vars.n);
    s = s[rule] ?? s.other;
    if (s == null) s = key;
  }
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

/** 注册/覆盖语言包（浅合并）；dict 为函数时支持懒加载（如 () => import(...)），返回加载 Promise */
export function addMessages(locale, dictOrLoader) {
  if (typeof dictOrLoader === 'function') {
    if (!_loaders.has(locale)) {
      _loaders.set(locale, Promise.resolve(dictOrLoader()).then(
        dict => { messages[locale] = { ...messages[locale], ...dict }; return dict; },
        err => { _loaders.delete(locale); throw err; }  // 失败移出表，允许重试
      ));
    }
    return _loaders.get(locale);
  }
  messages[locale] = { ...messages[locale], ...dictOrLoader };
  return undefined;
}

// 测试用：重置懒加载表（不导出到 index.js）
export function _resetLoaders() {
  _loaders.clear();
}
