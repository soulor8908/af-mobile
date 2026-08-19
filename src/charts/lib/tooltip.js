// af-mobile UI charts —— Shadow DOM 内 DOM tooltip + 最近点查找
// 详见 docs/design/charts-sublibrary-detailed-design.md §3.5

// 创建 tooltip 控制器（懒建 DOM，首 show 才建）
// root：shadowRoot；返回 { show(html, x, y), hide() }，坐标为 wrap 内相对像素
export function createTooltip(root) {
  let el = null;
  const ensure = () => {
    // _render 的 wrap.innerHTML='' 会销毁已挂载的 tooltip，isConnected 校验防失效引用
    if (el && el.isConnected) return el;
    el = document.createElement('div');
    el.className = 'chart-tooltip';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.display = 'none';
    root.querySelector('.chart-wrap').appendChild(el);
    return el;
  };
  return {
    show(html, x, y) {
      const t = ensure();
      t.innerHTML = html;
      // 两段定位：先平移到锚点 (x±8, y±8)，再用 -100%（相对自身尺寸）做角对齐；
      // flip=右半屏右对齐防溢出；above=锚点上方空间不足时翻到下方
      const flip = x > (t.parentElement.clientWidth || 320) / 2;
      const above = y > 48;
      t.style.transform = `translate(${flip ? x - 8 : x + 8}px, ${above ? y - 8 : y + 8}px) translate(${flip ? '-100%' : '0'}, ${above ? '-100%' : '0'})`;
      t.style.display = 'block';
    },
    hide() {
      if (el) el.style.display = 'none';
    },
  };
}

// 最近点查找：xs = 数据点 x 坐标数组（升序），px = 触点 x 坐标 → 索引
export function nearestIndex(xs, px) {
  if (!xs.length) return -1;
  let best = 0;
  let dist = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const d = Math.abs(xs[i] - px);
    if (d < dist) { dist = d; best = i; }
  }
  return best;
}
