// af-swipe-cell —— 原生 touch 拖拽真实行为（jsdom 无法模拟 touch 事件）
import { test, expect } from '@playwright/test';

const ready = (page) => page.waitForFunction(() => window.__ready);

// 在元素上派发一段合成 touch 拖拽（组件读取 e.touches[0].clientX/Y）
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

const swipeX = (page) =>
  page.locator('#swc [data-role="track"]').evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue('--af-swipe-x')) || 0);

test.describe('af-swipe-cell touch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await ready(page);
  });

  test('open() 程序化展开右侧操作（--af-swipe-x 为负）', async ({ page }) => {
    await page.locator('#swc').evaluate(el => el.open());
    expect(await swipeX(page)).toBeLessThan(0);
  });

  test('close() 复位（--af-swipe-x 归零）', async ({ page }) => {
    await page.locator('#swc').evaluate(el => el.open());
    expect(await swipeX(page)).toBeLessThan(0);
    await page.locator('#swc').evaluate(el => el.close());
    expect(await swipeX(page)).toBe(0);
  });

  test('向左拖拽越过阈值 → 吸附为完全打开', async ({ page }) => {
    // 从 (200,50) 拖到 (0,55)：dx=-200，远大于右栏宽度一半阈值 → 完全打开
    await touchDrag(page, '#swc', 200, 50, 0, 55);
    const x = await swipeX(page);
    expect(x).toBeLessThan(0);
    // 完全打开 = -右栏宽度（非负）
    const rightW = await page.locator('#swc [data-role="right"]').evaluate(el => el.offsetWidth);
    expect(x).toBeCloseTo(-rightW, 3);
  });

  test('向左拖拽未达阈值 → 回弹收起', async ({ page }) => {
    // dx=-20，小于阈值，应回弹到 0
    await touchDrag(page, '#swc', 100, 50, 80, 55);
    expect(await swipeX(page)).toBe(0);
  });

  test('点击操作按钮派发 af-swipe-cell:action 并收起', async ({ page }) => {
    const evt = page.evaluate(() => new Promise(res => {
      document.getElementById('swc').addEventListener('af-swipe-cell:action', (e) => res(e.detail));
    }));
    await page.locator('#swc').evaluate(el => el.open());
    await page.locator('#swc [data-action="delete"]').click();
    expect(await evt).toEqual({ action: 'delete' });
    expect(await swipeX(page)).toBe(0);
  });
});
