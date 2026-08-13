// router —— 浏览器原生行为（jsdom 不覆盖：真实 history/query/scrollIntoView/RouterError）
import { test, expect } from '@playwright/test';

const ready = (page) => page.waitForFunction(() => window.__ready);

test.describe('router query / scrollBehavior / outlet 抛错', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await ready(page);
  });

  test('query string 解析进 params 并渲染', async ({ page }) => {
    await page.click('#router-go-query');
    await expect(page.locator('#router-query-out')).toHaveText('page=2');
    await expect(page.locator('#router-app [data-router-view]')).toContainText('list page 2');
    // 真实 history 地址也带上了 query
    expect(await page.evaluate(() => location.search)).toBe('?page=2');
  });

  test('scrollBehavior 返回 { el } 滚动到目标元素', async ({ page }) => {
    await page.click('#router-go-el');
    await expect.poll(() => page.evaluate(() => {
      const el = document.getElementById('scroll-target');
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight;
    })).toBe(true);
  });

  test('子 outlet 选择器未命中抛 RouterError', async ({ page }) => {
    const name = await page.evaluate(() =>
      window.__routerGo('/bad').then(() => 'none', e => e.name)
    );
    expect(name).toBe('RouterError');
  });

  test('浏览器 back 触发 popstate 路由回退', async ({ page }) => {
    await page.click('#router-go-query');
    await expect(page.locator('#router-query-out')).toHaveText('page=2');
    await page.goBack();
    await expect(page.locator('#router-app [data-router-view]')).toContainText('home');
    expect(await page.evaluate(() => location.pathname)).toBe('/');
  });
});
