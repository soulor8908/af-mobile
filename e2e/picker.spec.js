// af-picker —— scroll-snap 滚轮 + popover 真实行为
import { test, expect } from '@playwright/test';

const ready = (page) => page.waitForFunction(() => window.__ready);

test.describe('af-picker scroll-snap', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await ready(page);
  });

  test('open() 后 popover 展开且列渲染正确', async ({ page }) => {
    await page.click('#open-picker');
    await expect(page.locator('af-picker [part=picker]')).toBeVisible();
    await expect(page.locator('af-picker .column')).toHaveCount(2);
    await expect(page.locator('af-picker .item')).toHaveCount(10);
  });

  test('滚动列触发 af-picker:change（scroll-stop 100ms debounce）', async ({ page }) => {
    const change = page.evaluate(() => new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('change 超时')), 3000);
      document.getElementById('picker').addEventListener('af-picker:change', (e) => {
        clearTimeout(t); res(e.detail);
      });
    }));
    await page.click('#open-picker');
    // shadow DOM 内设 scrollTop + dispatch scroll → _onColumnScroll → 100ms 后 change
    await page.locator('af-picker').evaluate(el => {
      const col = el.shadowRoot.querySelector('.column');
      col.scrollTop = 36; // idx=1 → 2021
      col.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    expect(await change).toMatchObject({ column: 0, value: 2021 });
  });

  test('确认派发 af-picker:confirm 携带当前 values', async ({ page }) => {
    const evt = page.evaluate(() => new Promise(res => {
      document.getElementById('picker').addEventListener('af-picker:confirm', (e) => res(e.detail));
    }));
    await page.click('#open-picker');
    await page.locator('af-picker .btn-confirm').click();
    expect(await evt).toEqual({ values: [2025, 2] });
  });
});
