// 测试环境：@af-mobile/ui/test 注入 jsdom 缺失的全部浏览器 API 桩
// （matchMedia / showModal / popover + ToggleEvent / IntersectionObserver / ResizeObserver /
//   requestAnimationFrame / slot assignedElements / createObjectURL / TouchEvent）
import '@af-mobile/ui/test';

// 全局清理：每个测试之间隔离
beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});
