import { startServer } from './visual.mjs';
import { chromium } from 'playwright';
const { server, port } = await startServer();
const browser = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
const out = await page.evaluate(async (p) => {
  const m = await import(`http://127.0.0.1:${p}/aiflow-ui.js`);
  return { keys: Object.keys(m), hasRegisterAll: typeof m.registerAll };
}, port);
console.log(JSON.stringify(out));
await browser.close(); server.close();