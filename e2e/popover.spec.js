// af-action-sheet / af-dropdown —— 原生 popover API 真实行为
import { test, expect } from '@playwright/test';

const ready = (page) => page.waitForFunction(() => window.__ready);

test.describe('af-action-sheet popover', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await ready(page);
  });

  test('showPopover 展开后点击选项派发 select + close', async ({ page }) => {
    const evt = page.evaluate(() => new Promise(res => {
      const sheet = document.getElementById('sheet');
      let select = null;
      sheet.addEventListener('af-action-sheet:select', (e) => { select = e.detail; });
      sheet.addEventListener('af-action-sheet:close', () => res(select));
    }));
    await page.click('#open-sheet');
    await page.locator('af-action-sheet .list-item:has-text("微博")').click();
    expect(await evt).toEqual({ index: 1, value: 'weibo' });
  });

  test('showCancel=true 时渲染取消按钮并关闭', async ({ page }) => {
    await page.click('#open-sheet');
    const cancelBtn = page.locator('af-action-sheet .af-action-sheet-cancel');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await expect(page.locator('af-action-sheet .sheet')).toBeHidden();
  });
});

test.describe('af-dropdown popover', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await ready(page);
  });

  test('点击 trigger 展开 listbox，选择后更新 value + 派发 select', async ({ page }) => {
    const evt = page.evaluate(() => new Promise(res => {
      document.getElementById('dd').addEventListener('af-dropdown:select', (e) => res(e.detail));
    }));
    await page.locator('#dd .af-dropdown-trigger').click();
    await expect(page.locator('#dd .list[popover]')).toBeVisible();
    await page.locator('#dd .list-item:has-text("上海")').click();
    expect(await evt).toEqual({ index: 1, value: 'sh' });
    await expect(page.locator('#dd .af-dropdown-trigger')).toContainText('上海');
  });

  test('↑↓ 方向键在 listbox 内导航', async ({ page }) => {
    await page.locator('#dd .af-dropdown-trigger').click();
    await expect(page.locator('#dd .list[popover]')).toBeVisible();
    // 打开后 rAF 移焦到首项
    await expect(page.locator('#dd .list-item').first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#dd .list-item').nth(1)).toBeFocused();
  });
});
