// af-dialog —— showModal 真实行为（jsdom 不覆盖）
import { test, expect } from '@playwright/test';

const ready = (page) => page.waitForFunction(() => window.__ready);

test.describe('af-dialog showModal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await ready(page);
  });

  test('open() 调用 showModal，dialog 进入 top-layer 且锁滚动', async ({ page }) => {
    await page.click('#open-dialog');
    const dlg = page.locator('af-dialog [part=dialog]');
    await expect(dlg).toBeVisible();
    // lockScroll 设 body.style.overflow = 'hidden'
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  });

  test('ESC 关闭并派发 af-dialog:close { action: "esc" }', async ({ page }) => {
    const closeEvt = page.evaluate(() => new Promise(res => {
      document.getElementById('dlg').addEventListener('af-dialog:close', (e) => res(e.detail));
    }));
    await page.click('#open-dialog');
    // 对 dialog 元素按 Escape，确保 cancel 事件触发
    await page.locator('af-dialog [part=dialog]').press('Escape');
    expect(await closeEvt).toEqual({ action: 'esc' });
    await expect(page.locator('af-dialog [part=dialog]')).toBeHidden();
    // 关闭后滚动解锁
    await expect(page.locator('body')).toHaveCSS('overflow', 'visible');
  });

  test('backdrop 点击关闭（close-on-backdrop）', async ({ page }) => {
    await page.click('#open-dialog');
    const dlg = page.locator('af-dialog [part=dialog]');
    await expect(dlg).toBeVisible();
    // 点 dialog 元素自身的边缘（backdrop 区域 = dialog 自身非内容区）
    const box = await dlg.boundingBox();
    await page.mouse.click(box.x + 2, box.y + 2);
    await expect(dlg).toBeHidden();
  });

  test('showModal 后焦点进入 dialog（焦点陷阱入口）', async ({ page }) => {
    await page.click('#open-dialog');
    // Shadow DOM：document.activeElement 返回 host(af-dialog)，需穿透 shadowRoot
    await page.waitForTimeout(100); // 等 _focusFirst 的 rAF
    const focusedInDialog = await page.evaluate(() => {
      const host = document.getElementById('dlg');
      const sr = host.shadowRoot;
      const active = sr ? sr.activeElement : null;
      const dlg = sr.querySelector('dialog');
      return !!active && (dlg === active || dlg.contains(active));
    });
    expect(focusedInDialog).toBeTruthy();
  });

  test('关闭后焦点还原到打开前的触发元素', async ({ page }) => {
    const trigger = page.locator('#open-dialog');
    await trigger.focus();
    await trigger.click();
    await expect(page.locator('af-dialog [part=dialog]')).toBeVisible();
    // ESC 关闭（action: esc）
    await page.locator('af-dialog [part=dialog]').press('Escape');
    await expect(page.locator('af-dialog [part=dialog]')).toBeHidden();
    // 焦点应回到触发按钮（_previouslyFocused.focus()）
    const restored = await page.evaluate(() => document.activeElement === document.getElementById('open-dialog'));
    expect(restored).toBeTruthy();
  });
});
