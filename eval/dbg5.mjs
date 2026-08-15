import { startServer } from './visual.mjs';
import { chromium } from 'playwright';
const { server, port } = await startServer();
const browser = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.addInitScript(() => {
  const st = document.createElement('style');
  st.textContent = 'af-list{height:720px}.page{min-height:100vh}body{margin:0}';
  document.head.appendChild(st);
});
await page.goto(`http://127.0.0.1:${port}/001-k0.html`, { waitUntil: 'networkidle' });
await page.evaluate(() => import('/aiflow-ui.js').then((m) => {
  console.log('module keys:', Object.keys(m).length, 'registerAll:', typeof m.registerAll);
  if (typeof m.registerAll === 'function') m.registerAll();
}));
await page.waitForTimeout(2000);
const info = await page.evaluate(() => {
  const list = document.getElementById('list');
  return {
    defined: !!customElements.get('af-list'),
    data: list?.data?.length,
    inner: (list?.innerHTML || '').slice(0, 200),
    cardCount: document.querySelectorAll('.card').length,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close(); server.close();