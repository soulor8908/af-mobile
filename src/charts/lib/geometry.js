// AIFlow UI charts —— SVG path 几何生成（纯函数，可单测）
// 详见 docs/design/charts-sublibrary-detailed-design.md §3.2
// 全部返回 SVG d 属性字符串；不含任何 DOM 操作

// Catmull-Rom 样条 → 三次贝塞尔控制点（端点用重复点 clamp）
function smoothSeg(pts) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

// 折线 path：pts = [[x,y],...]；smooth=true 用 Catmull-Rom 平滑
export function linePath(pts, { smooth = false } = {}) {
  if (!pts.length) return '';
  if (smooth && pts.length > 2) return smoothSeg(pts);
  return 'M' + pts.map(p => `${p[0]},${p[1]}`).join('L');
}

// 面积 path：折线 + 闭合到基线 baseY（y 轴向下为正，基线通常是绘图区底边）
export function areaPath(pts, baseY, { smooth = false } = {}) {
  if (!pts.length) return '';
  return linePath(pts, { smooth }) + `L${pts[pts.length - 1][0]},${baseY}L${pts[0][0]},${baseY}Z`;
}

// 环形扇区 path：圆心 (cx,cy)、外/内半径 r/r0、起止角 a0/a1（弧度制，0 = 12 点方向，顺时针为正）
// r0=0 时退化为饼扇区；跨角 ≥ 2π 时拆两段画整环（SVG 弧命令无法一段画整圆）
export function arcPath(cx, cy, r, r0, a0, a1) {
  const P = (ang, rad) => {
    const x = cx + rad * Math.sin(ang);
    const y = cy - rad * Math.cos(ang);
    return [x, y];
  };
  let span = a1 - a0;
  if (span <= 0) return '';
  if (span >= Math.PI * 2 - 1e-6) return arcPath(cx, cy, r, r0, a0, a0 + Math.PI) + arcPath(cx, cy, r, r0, a0 + Math.PI, a0 + Math.PI * 2);
  const large = span > Math.PI ? 1 : 0;
  const [sx, sy] = P(a0, r);
  const [ex, ey] = P(a1, r);
  const [isx, isy] = P(a1, r0);
  const [iex, iey] = P(a0, r0);
  const f = (n) => +n.toFixed(2);
  return r0 <= 0
    ? `M${f(cx)},${f(cy)}L${f(sx)},${f(sy)}A${f(r)},${f(r)} 0 ${large} 1 ${f(ex)},${f(ey)}Z`
    : `M${f(sx)},${f(sy)}A${f(r)},${f(r)} 0 ${large} 1 ${f(ex)},${f(ey)}L${f(isx)},${f(isy)}A${f(r0)},${f(r0)} 0 ${large} 0 ${f(iex)},${f(iey)}Z`;
}

// 极坐标点位：0 = 12 点方向，顺时针为正（arcPath 同一约定）
export function polar(cx, cy, r, ang) {
  return [cx + r * Math.sin(ang), cy - r * Math.cos(ang)];
}

// 雷达多边形 path：angles 弧度数组（0=12 点顺时针），values 为 0-1 归一化数组（半径 = r × v）
export function radarPath(cx, cy, r, angles, values) {
  if (!angles.length) return '';
  const pts = angles.map((a, i) => polar(cx, cy, r * (values[i] ?? 0), a));
  const f = (n) => +n.toFixed(2);
  return 'M' + pts.map(p => `${f(p[0])},${f(p[1])}`).join('L') + 'Z';
}

// 漏斗梯形 path：居中于 cx，顶宽 w0 → 底宽 w1，层高 h（零坐标系，纯宽度比例）
export function funnelPath(cx, y, w0, w1, h) {
  const f = (n) => +n.toFixed(2);
  return `M${f(cx - w0 / 2)},${f(y)}L${f(cx + w0 / 2)},${f(y)}L${f(cx + w1 / 2)},${f(y + h)}L${f(cx - w1 / 2)},${f(y + h)}Z`;
}

// 数值格式化：轴刻度与 tooltip 共用（大数缩写，保留必要精度）
export function fmtNum(v) {
  const a = Math.abs(v);
  if (a >= 1e8) return (v / 1e8).toFixed(1).replace(/\.0$/, '') + '亿';
  if (a >= 1e4) return (v / 1e4).toFixed(1).replace(/\.0$/, '') + '万';
  return String(+v.toFixed(2));
}
