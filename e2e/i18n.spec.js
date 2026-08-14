// i18n —— CLDR 复数规则浏览器验证（en 两形式 / ar 六形式）
import { test, expect } from '@playwright/test';

const ready = (page) => page.waitForFunction(() => window.__ready);

test.describe('i18n 复数规则', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await ready(page);
  });

  test('en-US：n=1 用 one，其余用 other', async ({ page }) => {
    await page.click('#i18n-en');
    const out = page.locator('#i18n-plural-out');
    await expect(out).toContainText('0:0 items');
    await expect(out).toContainText('1:1 item');
    await expect(out).toContainText('2:2 items');
    await expect(out).toContainText('100:100 items');
  });

  test('ar-SA：六形式（zero/one/two/few/many/other）', async ({ page }) => {
    await page.click('#i18n-ar');
    const out = page.locator('#i18n-plural-out');
    await expect(out).toContainText('0:لا عناصر');
    await expect(out).toContainText('1:عنصر واحد');
    await expect(out).toContainText('2:عنصران');
    await expect(out).toContainText('3:3 عناصر');
    await expect(out).toContainText('11:11 عنصرًا');
    await expect(out).toContainText('100:100 عنصر');
  });
});
