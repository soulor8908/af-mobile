import { startServer } from './visual.mjs';
import { chromium } from 'playwright';
const { server, port } = await startServer();
const browser = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('console', m => console.log('CONSOLE', m.type(), m.text().slice(0, 300)));
page.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 300)));
await page.goto(`http://127.0.0.1:${port}/001-k0.html`, { waitUntil: 'domcontentloaded' });
// 等待 import 完成
await page.waitForTimeout(3000);
const info = await page.evaluate(async () => {
  const out = { defined: !!customElements.get('af-list') };
  try {
    const mod = await import('/aiflow-ui.js');
    out.keys = Object.keys(mod).slice(0, 10);
  } catch (e) {
    out.importErr = e.message;
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));
await browser.close(); server.close();
