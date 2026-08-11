// af-pull-refresh —— 原生 touch 下拉真实行为（阻尼 + 阈值激活，jsdom 无法模拟）
import { test, expect } from '@playwright/test';

const ready = (page) => page.waitForFunction(() => window.__ready);

// 在元素上派发合成 touch 拖拽（组件读取 e.touches[0].clientY）
async function touchDrag(page, selector, fromX, fromY, toX, toY) {
  await page.locator(selector).evaluate((el, p) => {
    const mk = (type, x, y) => {
      const t = { identifier: 1, clientX: x, clientY: y, target: el };
      const ev = new Event(type, { bubbles: true, cancelable: true });
      ev.touches = [t];
      ev.changedTouches = [t];
      ev.targetTouches = [t];
      return ev;
    };
    el.dispatchEvent(mk('touchstart', p.fromX, p.fromY));
    el.dispatchEvent(mk('touchmove', p.toX, p.toY));
    el.dispatchEvent(mk('touchend', p.toX, p.toY));
  }, { fromX, fromY, toX, toY });
}

test.describe('af-pull-refresh touch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await ready(page);
  });

  test('向下拖拽越过阈值(60) → 派发 refresh 且 refreshing=true、指示器显示 spinner', async ({ page }) => {
    const evt = page.evaluate(() => new Promise(res => {
      document.getElementById('pr').addEventListener('af-pull-refresh:refresh', () => res(true));
    }));
    // 拖 200px：damped = 100*0.5 + 100*0.2 = 70 ≥ 60 → 触发刷新
    await touchDrag(page, '#pr', 100, 100, 100, 300);
    expect(await evt).toBeTruthy();
    expect(await page.locator('#pr').evaluate(el => el.refreshing)).toBe(true);
    await expect(page.locator('#pr [data-role="indicator"] .spinner')).toBeVisible();
  });

  test('endRefresh() 复位：refreshing=false 且指示器隐藏', async ({ page }) => {
    await touchDrag(page, '#pr', 100, 100, 100, 300);
    await expect(page.locator('#pr [data-role="indicator"]')).toBeVisible();
    await page.locator('#pr').evaluate(el => el.endRefresh());
    expect(await page.locator('#pr').evaluate(el => el.refreshing)).toBe(false);
    await expect(page.locator('#pr [data-role="indicator"]')).toBeHidden();
  });

  test('向下拖拽未达阈值 → 不刷新，pull 高度复位为 0', async ({ page }) => {
    const fired = page.evaluate(() => {
      let done = false;
      document.getElementById('pr').addEventListener('af-pull-refresh:refresh', () => { done = true; });
      return new Promise(res => setTimeout(() => res(done), 1000));
    });
    // 拖 100px：damped = 50 < 60 → 回弹，不刷新
    await touchDrag(page, '#pr', 100, 100, 100, 200);
    expect(await fired).toBe(false);
    expect(await page.locator('#pr').evaluate(el => el.refreshing)).toBe(false);
    await expect(page.locator('#pr [data-role="indicator"]')).toBeHidden();
  });
});
