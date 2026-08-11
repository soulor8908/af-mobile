// af-backtop —— window 滚动真实行为（显隐阈值 + 平滑回到顶部，jsdom 无布局/滚动）
import { test, expect } from '@playwright/test';

const ready = (page) => page.waitForFunction(() => window.__ready);

const scrollY = (page) => page.evaluate(() => window.scrollY);

test.describe('af-backtop scroll', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  test('初始位于顶部时隐藏（带 hidden 属性）', async ({ page }) => {
    expect(await scrollY(page)).toBe(0);
    await expect(page.locator('#bt')).toBeHidden();
  });

  test('滚动越过阈值(100)后显示并派发 af-backtop:show', async ({ page }) => {
    const show = page.evaluate(() => new Promise(res => {
      document.getElementById('bt').addEventListener('af-backtop:show', () => res(true));
    }));
    await page.evaluate(() => window.scrollTo(0, 300));
    await expect(page.locator('#bt')).toBeVisible();
    expect(await show).toBeTruthy();
  });

  test('点击回到顶部：派发 af-backtop:click 且滚动位置回到阈值上方', async ({ page }) => {
    const click = page.evaluate(() => new Promise(res => {
      document.getElementById('bt').addEventListener('af-backtop:click', () => res(true));
    }));
    await page.evaluate(() => window.scrollTo(0, 400));
    await expect(page.locator('#bt')).toBeVisible();
    await page.locator('#bt button').click();
    expect(await click).toBeTruthy();
    await expect.poll(() => scrollY(page)).toBeLessThan(100);
  });
});
