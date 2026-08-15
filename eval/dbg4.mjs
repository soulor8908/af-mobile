import { startServer } from './visual.mjs';
import { chromium } from 'playwright';
const { server, port } = await startServer();
const browser = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto(`http://127.0.0.1:${port}/001-k0.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const list = document.getElementById('list');
  return { data: list.data.length, inner: list.innerHTML.slice(0, 400), css: document.styleSheets.length };
});
console.log(JSON.stringify(info, null, 2));
await browser.close(); server.close();
