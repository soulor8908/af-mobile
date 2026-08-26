// 原型 E2E 矩阵 —— AI 生成原型的渲染回归（v1.7.0 视觉改进的守护网）
// 夹具来源：.workbuddy/原型样式诊断/e2e/ 的咖啡点单 3 页（AI 按 v1.7.0 prompt 生成，lint 首轮 0 违规）
//           + 状态矩阵补页（empty/error，同规范生成）
// 验证目标：recipes.css/atomic.css 的原型视觉模式（hero-grad/grid/card-media/tabbar/dots/seg/empty）
//           若被后续改动破坏，此 spec 拦下——"AI 能生成好看原型"不因库演进回退
import { test, expect } from '@playwright/test';

const P = (name) => `/prototype/${name}.html`;

test.describe('原型 / 高视觉首页（index）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(P('index'));
  });

  test('hero-grad 渐变主视觉渲染（品牌渐变而非纯色）', async ({ page }) => {
    const hero = page.locator('.hero-grad');
    await expect(hero).toBeVisible();
    const bg = await hero.evaluate(el => getComputedStyle(el).backgroundImage);
    expect(bg).toContain('linear-gradient');
  });

  test('grid-3 三列图标宫格 + 6 个 icon-badge（24px stroke SVG）', async ({ page }) => {
    await expect(page.locator('.grid-3 .icon-badge')).toHaveCount(6);
    // 三列布局：前三个宫格同一行，第四个换行
    const boxes = await page.locator('.grid-3 > div').evaluateAll(els =>
      els.slice(0, 4).map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
    expect(boxes[1].y).toBeCloseTo(boxes[0].y, 0);
    expect(boxes[2].y).toBeCloseTo(boxes[0].y, 0);
    expect(boxes[3].y).toBeGreaterThan(boxes[0].y);
  });

  test('card-media 全出血图卡 ×4（含价格 + 语义角标）', async ({ page }) => {
    await expect(page.locator('.card-media')).toHaveCount(4);
    await expect(page.locator('.card-media .price').first()).toBeVisible();
    // 语义角标：tag-danger/tag-ok/tag-plain 至少其一
    expect(await page.locator('.card-media .tag').count()).toBeGreaterThan(0);
  });

  test('chips 标签流渲染（wrap 换行容器 + tag 系）', async ({ page }) => {
    await expect(page.locator('.chips .tag').first()).toBeVisible();
    expect(await page.locator('.chips .tag').count()).toBeGreaterThanOrEqual(6);
  });

  test('tabbar fixed 底部导航 + 4 项 + 当前页 aria-selected 高亮', async ({ page }) => {
    const bar = page.locator('.tabbar-fixed');
    await expect(bar).toBeVisible();
    await expect(bar).toHaveCSS('position', 'fixed');
    await expect(page.locator('.tabbar-fixed .tab-item')).toHaveCount(4);
    // 选中态视觉差异：selected 与未选中项颜色不同（属性选择器驱动）
    const colors = await page.locator('.tabbar-fixed .tab-item').evaluateAll(els =>
      els.map(el => getComputedStyle(el).color));
    const selected = await page.locator('.tab-item[aria-selected="true"]').evaluate(el => getComputedStyle(el).color);
    expect(colors.some(c => c !== selected)).toBe(true);
  });

  test('bg-grad-brand 渐变横幅 + text-onbrand 白字', async ({ page }) => {
    const banner = page.locator('.bg-grad-brand');
    await expect(banner).toBeVisible();
    const bg = await banner.evaluate(el => getComputedStyle(el).backgroundImage);
    expect(bg).toContain('linear-gradient');
    const color = await page.locator('.bg-grad-brand .text-onbrand').first().evaluate(el => getComputedStyle(el).color);
    expect(color).not.toBe('rgb(0, 0, 0)');
  });
});

test.describe('原型 / 商品详情（detail）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(P('detail'));
  });

  test('dots 圆点指示器 ×4 且首项激活', async ({ page }) => {
    await expect(page.locator('.dots .dot')).toHaveCount(4);
    await expect(page.locator('.dots .dot-on')).toHaveCount(1);
  });

  test('stats-grid 三联彩色大数字', async ({ page }) => {
    await expect(page.locator('.stats-grid .stat-num')).toHaveCount(3);
    // 彩色强调：text-brand 与 text-success 上色生效（非默认文本色）
    const brand = await page.locator('.stat-num.text-brand').evaluate(el => getComputedStyle(el).color);
    const plain = await page.locator('.stat-num').nth(2).evaluate(el => getComputedStyle(el).color);
    expect(brand).not.toBe(plain);
  });

  test('seg-brand 规格选择：3 项且首项 aria-selected', async ({ page }) => {
    await expect(page.locator('.seg .seg-it')).toHaveCount(3);
    await expect(page.locator('.seg .seg-it[aria-selected="true"]')).toHaveCount(1);
    // 选中态品牌色描边/底色生效
    const sel = await page.locator('.seg-it[aria-selected="true"]').evaluate(el => getComputedStyle(el).color);
    const un = await page.locator('.seg-it:not([aria-selected])').first().evaluate(el => getComputedStyle(el).color);
    expect(sel).not.toBe(un);
  });

  test('cob 底部操作栏 fixed + 三段式按钮', async ({ page }) => {
    const cob = page.locator('.cob-fx');
    await expect(cob).toBeVisible();
    await expect(cob).toHaveCSS('position', 'fixed');
    await expect(cob.locator('button')).toHaveCount(3);
  });

  test('card-media 图文详情卡（16:9 图 + 文案区）', async ({ page }) => {
    await expect(page.locator('.card-media img.aspect-16-9')).toBeVisible();
    await expect(page.locator('.card-media .body').first()).toBeVisible();
  });
});

test.describe('原型 / 订单列表（orders）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(P('orders'));
  });

  test('4 张订单卡 + 三态语义标签（进行中/已完成/已取消）', async ({ page }) => {
    await expect(page.locator('.card')).toHaveCount(4);
    await expect(page.locator('.tag-warn')).toHaveCount(1);
    await expect(page.locator('.tag-ok')).toHaveCount(2);
    await expect(page.locator('.tag-danger')).toHaveCount(1);
  });

  test('thumb 缩略图 + ellipsis 元信息截断类存在', async ({ page }) => {
    await expect(page.locator('.card .thumb').first()).toBeVisible();
    await expect(page.locator('.caption.ellipsis').first()).toBeVisible();
  });

  test('底部 .empty 提示区（专用空态语义，非 .center 混用）', async ({ page }) => {
    await expect(page.locator('.empty')).toBeVisible();
    await expect(page.locator('.empty .caption')).toBeVisible();
  });
});

test.describe('原型 / 状态矩阵（empty + error）', () => {
  test('空态：图标 + 主次文案 + CTA + tabbar 当前页高亮', async ({ page }) => {
    await page.goto(P('empty'));
    await expect(page.locator('.page.center')).toBeVisible();
    await expect(page.locator('.title')).toHaveText('还没有订单');
    await expect(page.locator('.body.text-muted')).toBeVisible();
    // CTA 可达：去点单 → index.html
    const cta = page.locator('a.btn');
    await expect(cta).toHaveAttribute('href', 'index.html');
    await expect(page.locator('.tab-item[aria-selected="true"]')).toHaveCount(1);
    await expect(page.locator('.tab-item[aria-selected="true"]')).toContainText('订单');
  });

  test('错误态：错误图标 + 提示 + 双 CTA（返回/重试）', async ({ page }) => {
    await page.goto(P('error'));
    await expect(page.locator('.title')).toHaveText('网络开小差了');
    await expect(page.locator('#retry')).toBeVisible();
    await expect(page.locator('a.btn')).toHaveAttribute('href', 'index.html');
    // 24px stroke SVG 图标（非 emoji）
    await expect(page.locator('.icon-badge svg')).toBeVisible();
  });

  test('空态 CTA 真实跳转到首页（导航冒烟）', async ({ page }) => {
    await page.goto(P('empty'));
    await page.click('a.btn');
    await expect(page.locator('.hero-grad')).toBeVisible();
  });
});
