// af-img —— IntersectionObserver 懒加载真实行为（jsdom 无 IO，且不触发 onload/onerror）
import { test, expect } from '@playwright/test';

const ready = (page) => page.waitForFunction(() => window.__ready);

const innerSrc = (page, id) =>
  page.locator(`#${id} img.af-img-inner`).evaluate(el => el.getAttribute('src'));

test.describe('af-img lazy & fallback', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await ready(page);
  });

  test('lazy=false 立即加载：内图可见且占位被移除', async ({ page }) => {
    await expect(page.locator('#img-eager img.af-img-inner')).toBeVisible();
    await expect(page.locator('#img-eager [data-role="placeholder"]')).toHaveCount(0);
  });

  test('lazy=true 初始不加载：内图带 hidden（未进入视口）', async ({ page }) => {
    await expect(page.locator('#img-lazy img.af-img-inner')).toBeHidden();
  });

  test('滚动进入视口后懒加载触发：内图可见', async ({ page }) => {
    await expect(page.locator('#img-lazy img.af-img-inner')).toBeHidden();
    // 将懒加载图滚入视口，IntersectionObserver 触发 _load
    await page.locator('#img-lazy').scrollIntoViewIfNeeded();
    await expect(page.locator('#img-lazy img.af-img-inner')).toBeVisible();
  });

  test('加载失败且配置 failSrc → 回退到 failSrc 并可见', async ({ page }) => {
    await expect(page.locator('#img-fail img.af-img-inner')).toBeVisible();
    const src = await innerSrc(page, 'img-fail');
    expect(src).toContain('ea4335'); // failSrc 的填充色，证明已回退
    await expect(page.locator('#img-fail [data-role="placeholder"]')).toHaveCount(0);
  });
});
