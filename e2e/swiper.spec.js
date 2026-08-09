// af-swiper —— touch 拖拽 + loop 无缝循环 + ResizeObserver 响应
import { test, expect } from '@playwright/test';

const ready = (page) => page.waitForFunction(() => window.__ready);

test.describe('af-swiper touch & loop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await ready(page);
  });

  test('初始 activeIndex=0，索引回显正确', async ({ page }) => {
    await expect(page.locator('#swiper-index')).toHaveText('当前索引：0');
  });

  test('next() 切换到下一张，transitionend 后派发 af-swiper:change', async ({ page }) => {
    const change = page.evaluate(() => new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('change 超时')), 3000);
      document.getElementById('swp').addEventListener('af-swiper:change', (e) => {
        clearTimeout(t); res(e.detail.index);
      });
      document.getElementById('swp').next();
    }));
    expect(await change).toBe(1);
    await expect(page.locator('#swiper-index')).toHaveText('当前索引：1');
  });

  test('loop 边界：第 0 张 prev 跳到末张（clone 无缝修正）', async ({ page }) => {
    // prev 跨边界：_goToWithClone → transitionend(250ms) → _correctTransform + emit change
    await page.evaluate(() => document.getElementById('swp').prev());
    await page.waitForTimeout(600); // duration 250ms + correctTimer 100ms 缓冲
    const idx = await page.evaluate(() => document.getElementById('swp').activeIndex);
    expect(idx).toBe(2);
    await expect(page.locator('#swiper-index')).toHaveText('当前索引：2');
  });

  test('ResizeObserver 响应：容器尺寸变化后 transform 重新计算', async ({ page }) => {
    const before = await page.locator('#swp .track').evaluate(el => el.style.transform);
    await page.locator('#swp').evaluate(el => { el.style.width = '400px'; });
    await page.waitForTimeout(300); // 等 ResizeObserver + rAF
    const after = await page.locator('#swp .track').evaluate(el => el.style.transform);
    expect(after).not.toBe(before);
    // 400px 宽，activeIndex=0，loop 偏移 1 → translateX(-400px)
    expect(after).toContain('-400px');
  });
});
