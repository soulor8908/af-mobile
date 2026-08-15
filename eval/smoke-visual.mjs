// 冒烟：验证 渲染+截图+LLM视觉评审 链路
import { startServer, renderCapture } from './visual.mjs';
import { visualReferee } from './visual-judge.mjs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { server, port } = await startServer();
mkdirSync(join(ROOT, 'eval/results'), { recursive: true });

const htmlPath = join(ROOT, 'eval/results/001-k0.html');
const expects = ['.card', '.title', '.price', '.price-del', '.btn'];
const cap = await renderCapture(htmlPath, expects, { port, outDir: join(ROOT, 'eval/results') });
console.log('DOM 断言:', cap.ok ? 'PASS' : 'FAIL', 'missing=', cap.missing);
console.log('截图:', cap.screenshotPath);
if (cap.errors.length) console.log('页面错误:', cap.errors.slice(0, 5));

const verdict = await visualReferee(cap.screenshotPath, '商品列表页：竖向商品卡片列表，每张卡片含商品图、标题、副标题、价格、删除线原价，底部有加入购物车按钮', expects);
console.log('LLM 视觉评审:', JSON.stringify(verdict));

server.close();