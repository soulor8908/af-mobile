import { chromium } from 'playwright';

const base = 'http://localhost:4173/af-mobile/demo/components/';
const results = [];
const log = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} :: ${detail}`);
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0, 200)));

// 1. af-tabs 间距与标题
await page.goto(base + 'af-tabs.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
const tabs = await page.evaluate(() => {
  const el = document.querySelector('af-tabs');
  const bar = el.querySelector('.tabbar');
  const item = el.querySelector('.tab-item');
  return {
    marginBottom: getComputedStyle(bar).marginBottom,
    fontSize: getComputedStyle(item).fontSize,
    tabsCount: el.querySelectorAll('.tab-item').length,
  };
});
log('af-tabs 间距', tabs.marginBottom === '16px', `tabbar.margin-bottom=${tabs.marginBottom}（期望16px）`);
log('af-tabs 字号', tabs.fontSize === '15px', `tab-item.font-size=${tabs.fontSize}（期望15px）`);
log('af-tabs 渲染', tabs.tabsCount === 3, `tabs=${tabs.tabsCount}`);

// 2. af-dialog 打开/关闭
await page.goto(base + 'af-dialog.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.click('#open');
await page.waitForTimeout(300);
const dlgOpen = await page.evaluate(() => {
  const dlg = document.querySelector('af-dialog');
  const pop = dlg.shadowRoot ? dlg.shadowRoot.querySelector('.dialog') : dlg.querySelector('.dialog');
  return pop ? pop.matches(':popover-open') : false;
});
log('af-dialog 打开', dlgOpen, `dialog popover-open=${dlgOpen}`);
if (dlgOpen) {
  await page.click('#cancel');
  await page.waitForTimeout(200);
  const dlgClosed = await page.evaluate(() => {
    const dlg = document.querySelector('af-dialog');
    const pop = dlg.shadowRoot ? dlg.shadowRoot.querySelector('.dialog') : dlg.querySelector('.dialog');
    return pop ? !pop.matches(':popover-open') : false;
  });
  log('af-dialog 关闭', dlgClosed, `closed=${dlgClosed}`);
}

// 3. af-action-sheet 宽度 + 选项
await page.goto(base + 'af-action-sheet.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.click('#open');
await page.waitForTimeout(300);
const sheet = await page.evaluate(() => {
  const el = document.querySelector('af-action-sheet');
  const s = el.querySelector('.sheet');
  const st = getComputedStyle(s);
  const items = [...el.querySelectorAll('.list-item')].map(i => i.textContent.trim());
  return { width: st.width, viewportW: innerWidth, items, open: s.matches(':popover-open') };
});
log('af-action-sheet 宽度', Math.round(parseFloat(sheet.width)) === 390, `sheet.width=${sheet.width} viewport=${sheet.viewportW}（期望390px）`);
log('af-action-sheet 选项', JSON.stringify(sheet.items) === JSON.stringify(['微信', '朋友圈', 'QQ', '微博']), `items=${JSON.stringify(sheet.items)}`);

// 4. af-picker 数据 + 宽度
await page.goto(base + 'af-picker.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.click('#open');
await page.waitForTimeout(400);
const picker = await page.evaluate(() => {
  const el = document.querySelector('af-picker');
  const p = el.shadowRoot.querySelector('.picker');
  const st = getComputedStyle(p);
  const cols = [...el.shadowRoot.querySelectorAll('.column')].map(c => [...c.querySelectorAll('.item')].length);
  return { width: st.width, viewportW: innerWidth, cols, open: p.matches(':popover-open') };
});
log('af-picker 宽度', Math.round(parseFloat(picker.width)) === 390, `picker.width=${picker.width} viewport=${picker.viewportW}`);
log('af-picker 数据', JSON.stringify(picker.cols) === '[3,12,3]', `cols=${JSON.stringify(picker.cols)}`);

// 5. af-dropdown 选项 + 宽度
await page.goto(base + 'af-dropdown.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.click('.af-dropdown-trigger');
await page.waitForTimeout(300);
const dd = await page.evaluate(() => {
  const el = document.querySelector('af-dropdown');
  const list = el.querySelector('.list');
  const st = getComputedStyle(list);
  const items = [...el.querySelectorAll('.list-item')].map(i => i.textContent.trim());
  return { width: st.width, viewportW: innerWidth, items, open: list.matches(':popover-open') };
});
log('af-dropdown 选项', JSON.stringify(dd.items) === JSON.stringify(['北京', '上海', '广州', '深圳', '杭州']), `items=${JSON.stringify(dd.items)}`);
log('af-dropdown 宽度', parseFloat(dd.width) <= 390 && parseFloat(dd.width) > 200, `list.width=${dd.width} viewport=${dd.viewportW}`);
if (dd.open) {
  await page.click('.list-item');
  await page.waitForTimeout(200);
  const selected = await page.evaluate(() => document.querySelector('#log').textContent);
  log('af-dropdown 选择', selected.includes('北京'), `log=${selected}`);
}

// 6. af-list 虚拟滚动：底部触发 loadmore → 追加数据 → 到 totalCount 显示"没有更多了"
await page.goto(base + 'af-list.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const listInfo = await page.evaluate(() => {
  const l = document.querySelector('af-list');
  const footer = l.querySelector('[data-role="loadmore"]');
  return { totalCount: l.totalCount, dataLen: l.data.length, footerText: footer ? footer.textContent.trim() : 'NO FOOTER' };
});
log('af-list 初始', listInfo.dataLen === 20, `totalCount=${listInfo.totalCount} data=${listInfo.dataLen} footer=${listInfo.footerText}`);

// 连续滚动到底触发 loadmore，直到 totalCount 上限
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => {
    const l = document.querySelector('af-list');
    const scroller = l.querySelector('.list');
    if (scroller) { scroller.scrollTop = scroller.scrollHeight; scroller.dispatchEvent(new Event('scroll')); }
  });
  await page.waitForTimeout(700); // 等待 loadmore 500ms 追加完成
}
const listBottom = await page.evaluate(() => {
  const l = document.querySelector('af-list');
  const footer = l.querySelector('[data-role="loadmore"]');
  const logEl = document.getElementById('log');
  return { dataLen: l.data.length, footerText: footer ? footer.textContent.trim() : 'NO FOOTER', log: logEl ? logEl.textContent : '' };
});
log('af-list 到底停止加载', listBottom.dataLen === 100, `data=${listBottom.dataLen}（期望100）`);
log('af-list 无更多提示', listBottom.footerText.includes('没有更多了'), `footer=${JSON.stringify(listBottom.footerText)}`);

await browser.close();
console.log('\n==== 汇总 ====');
let pass = 0;
for (const r of results) { if (r.ok) pass++; console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}`); }
console.log(`通过 ${pass}/${results.length}`);
