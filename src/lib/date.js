// af-mobile UI —— 日期工具（OPT-8）
// 统一时区口径：'YYYY-MM-DD' 字符串一律按**本地时区**解析（new Date(str) 按 UTC，
// 是 UTC+8 前 8 小时逾期判断出错一类的根因）。todayISO/formatDate 全走本地时区。
// tree-shaking 友好：不用不付费（独立预算，见 scripts/size-check.mjs）

const P2 = (n) => String(n).padStart(2, '0');

// 归一化为 Date：'YYYY-MM-DD' 按本地时区；其余（Date/时间戳/含时间串）交给 Date 构造；无效返回 null
function toDate(v) {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 格式化日期为本地时区字符串
 * @param {Date | string | number} value Date / 'YYYY-MM-DD'（本地时区）/ 时间戳
 * @param {string} fmt 记号：YYYY MM DD HH mm ss（默认 'YYYY-MM-DD'）
 * @returns {string} 无效输入返回 ''
 */
export function formatDate(value, fmt = 'YYYY-MM-DD') {
  const d = toDate(value);
  if (!d) return '';
  return fmt
    .replace(/YYYY/g, String(d.getFullYear()))
    .replace(/MM/g, P2(d.getMonth() + 1))
    .replace(/DD/g, P2(d.getDate()))
    .replace(/HH/g, P2(d.getHours()))
    .replace(/mm/g, P2(d.getMinutes()))
    .replace(/ss/g, P2(d.getSeconds()));
}

/** 今天的本地时区日期（YYYY-MM-DD）。消费端统一用它做"今天"判断，禁再手写 toISOString().slice(0,10)（UTC） */
export function todayISO() {
  return formatDate(new Date(), 'YYYY-MM-DD');
}
