// chat 子库 md 渲染器：安全 Markdown 子集（escape-first：全文先转义再标注，渲染管线无未转义插值点）
// 子集：h1-h3 / ul/ol / 围栏代码（.cd + data-copy 复制钮）/ 粗斜体 / 行内码 / http(s) 链接；普通行走 pre-wrap 换行不生成 <p>
// 体积手法：围栏先抽 \x00N\x00 占位符（防内部语法被后续 replace 误伤）→ 全 replace 链零循环
// 决策：D-013（推翻 D-012 的 markdown 禁令），子集封闭不支持图片/表格/嵌套引用
import { escapeHtml as esc } from '../../lib/af-element.js';

export const md = (s) => {
  const c = [];
  return esc(s)
    // 围栏代码：先抽取占位（含尾随换行吞并，避免 pre 首行空行）
    .replace(/```\w*\n?([\s\S]*?)\n?```/g, (_, b) => `\x00${c.push(b) - 1}\x00`)
    // 列表：m 标志整块匹配连续行；混合标记连续行合并为单列表（ol 优先，拆分语义 +85B 不做）
    .replace(/((?:^ *(?:[-*]|\d+\.) .*(?:\n|$))+)/gm, (b) => {
      const t = /^ *\d/m.test(b) ? 'ol' : 'ul';
      return `<${t}>${b.trim().split('\n').map((l) => `<li>${l.replace(/^ *\S+ ?/, '')}</li>`).join('')}</${t}>`;
    })
    // 标题：原生 h1-h3（免自造元素）
    .replace(/^(#{1,3}) (.*)$/gm, (m, h, x) => `<h${h.length}>${x}</h${h.length}>`)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    // 链接：仅 http(s)（javascript: 天然拒绝）；免引号属性合法（值已被 esc 且排除空白/引号）
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href=$2 target=_blank rel=noopener>$1</a>')
    // 占位符还原为代码块；复制钮文案走 content:attr(aria-label)，由 af-chat 按 i18n 设置
    .replace(/\x00(\d+)\x00/g, (_, i) => `<div class=cd><pre>${c[i]}</pre><button class=cc data-copy></button></div>`);
};
