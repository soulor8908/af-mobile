// af-mobile UI —— Playwright e2e 配置
// 职责：验证 jsdom 覆盖不到的浏览器原生 API 真实行为
//   showModal/popover/scroll-snap/ResizeObserver/touch
// 串行执行（workers=1）：dialog/action-sheet 的 top-layer 会互相干扰
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5181',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite --config e2e/vite.config.js',
    port: 5181,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [
    // hasTouch: 移动端 UI 库 e2e 模拟触摸设备，mouse 拖拽会触发 touch 事件
    { name: 'chromium', use: { ...devices['Desktop Chrome'], hasTouch: true } },
  ],
});
