// 测试环境 polyfill：补 jsdom 缺失的浏览器 API
import { vi } from 'vitest';
// 浏览器 API 桩统一走库内预设（@af-mobile/ui/test 的源码形态）——仓库自身即预设的第一个消费者，
// 避免「脚手架模板 / 库内预设 / 仓库自用」三份桩各自漂移
import '../src/test-setup.js';

// === ESLint RuleTester 同步执行（防止假绿） ===
// vitest globals:true 提供全局 it/describe，RuleTester 会把用例注册给全局 it()，
// 而运行期调用全局 it() 被 vitest 静默忽略 → 断言从未执行（用例永远假绿）。
// 强制走同步执行器，valid/invalid 断言真实生效。
import { RuleTester } from 'eslint';
RuleTester.describe = (name, fn) => fn();
RuleTester.it = (name, fn) => fn();

// 全局清理：每个测试之间隔离
beforeEach(() => {
  document.documentElement.dataset.theme = '';
  document.body.innerHTML = '';
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});
