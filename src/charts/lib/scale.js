// af-mobile UI charts —— 线性刻度 + nice-ticks（详见 docs/design/charts-sublibrary-detailed-design.md §3.1）

// nice-ticks：把 [min,max] 归整为"好看"的刻度序列（步长 1/2/5 × 10^n，经典算法）
// 返回 { ticks: 数值数组（升序），min, max }
export function niceTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { ticks: [0, 1], min: 0, max: 1 };
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const step0 = span / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag; // 1 ≤ norm < 10
  const step = (norm > 5 ? 10 : norm > 2.5 ? 5 : norm > 2 ? 2.5 : norm > 1 ? 2 : 1) * mag;
  const nMin = Math.floor(min / step) * step;
  const nMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = nMin; v <= nMax + step / 2; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : +v.toFixed(10));
  return { ticks, min: nMin, max: nMax };
}

// linear：domain [d0,d1] → range [r0,r1] 的线性映射，返回纯函数 (v) => 像素值
export function linear(d0, d1, r0, r1) {
  const dd = d1 - d0 || 1; // 防除零（domain 退化时压平到 r0）
  return (v) => r0 + ((v - d0) / dd) * (r1 - r0);
}
