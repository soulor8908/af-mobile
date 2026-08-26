// af-mobile UI —— HTML 转义工具（自 lib/af-element.js 拆分，基类再导出保持 API 兼容）
// 与 router/state/i18n 同属共享运行时模块，非生命周期核心（size-check CORE_MODULES 计量口径一致）

// HTML 转义：注入数据到 innerHTML 前必经，防 XSS
// 使用命名实体（&lt; &gt; &amp; &quot;）+ 数值实体（&#39;）匹配浏览器 DOM 行为
// 转义结果有界缓存：列表重渲染对同一文案（标题/标签名）反复转义，命中即省正则扫描；
// 超 256 条整体清空、超长串（>512 字符）不入缓存，防不可信输入撑爆内存
const _ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const _escCache = new Map();
export const escapeHtml = (s) => {
  s = String(s ?? '');
  const hit = _escCache.get(s);
  if (hit !== undefined) return hit;
  const out = s.replace(/[&<>"']/g, (c) => _ENT[c]);
  if (s.length <= 512) {
    if (_escCache.size >= 256) _escCache.clear();
    _escCache.set(s, out);
  }
  return out;
};

// 安全 HTML 模板标签：${value} 插值自动转义，${{ raw: '<b>html</b>' }} 标记可信 HTML
// 用法：html`<div class="body">${item.title}</div>` ← title 自动转义
//       html`<div>${{ raw: '<b>加粗</b>' }}</div>` ← 显式声明可信 HTML 不转义
// 强制 af-list.renderItem / af-dropdown._renderList 等动态 HTML 拼接使用，杜绝 XSS
export function html(strings, ...values) {
  let r = '';
  for (let i = 0; i < strings.length; i++) {
    r += strings[i];
    if (i < values.length) r += values[i]?.raw ?? escapeHtml(values[i]);
  }
  return r;
}
