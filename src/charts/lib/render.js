// AIFlow UI charts —— SVG 元素工厂 + ResizeObserver/IntersectionObserver 绑定
// 详见 docs/design/charts-sublibrary-detailed-design.md §3.3
const SVG_NS = 'http://www.w3.org/2000/svg';

// SVG 命名空间元素工厂，attrs 一次性 set（null/undefined 跳过）
export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
  return el;
}

// resize → rAF 合并 → 重绘；返回 { disconnect }
export function bindResize(el, cb) {
  let raf = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(cb);
  });
  ro.observe(el);
  return {
    disconnect() {
      cancelAnimationFrame(raf);
      ro.disconnect();
    },
  };
}

// 首次可见才渲染（离屏图表零渲染成本）；返回 { disconnect }
export function bindLazy(el, cb) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      io.disconnect();
      cb();
    }
  });
  io.observe(el);
  return io;
}
