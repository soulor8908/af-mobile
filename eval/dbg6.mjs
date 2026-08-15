import { startServer } from './visual.mjs';
import { chromium } from 'playwright';
const { server, port } = await startServer();
const browser = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
page.on('console', m => console.log('CONSOLE', m.type(), m.text().slice(0, 200)));
page.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 200)));
page.on('requestfailed', r => console.log('REQFAIL', r.url(), r.failure()?.errorText));
await page.goto(`http://127.0.0.1:${port}/001-k0.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => ({
  defined: !!customElements.get('af-list'),
  hasListEl: !!document.getElementById('list'),
  scripts: [...document.scripts].map(s => s.src || s.type),
}));
console.log(JSON.stringify(info, null, 2));
await browser.close(); server.close();
