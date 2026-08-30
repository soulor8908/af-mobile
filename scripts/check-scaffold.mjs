// scaffold:check —— P0 脚手架配件验证闸门（consumer-delivery-design.md §3.1）
// 跑 create-app.mjs 生成临时工程，断言 manifest / 图标 / favicon / index.html meta 齐全且插值正确。
// 不用 Lighthouse（不在门禁体系），纯文件级断言，秒级完成。
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'af-scaffold-check-'));
const app = join(tmp, 'my-app');

let failed = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    console.error(`  ✗ ${msg}`);
    failed += 1;
  }
};

try {
  const res = spawnSync(process.execPath, [join(ROOT, 'scripts/create-app.mjs'), app,
    '--desc', '测试描述', '--theme', '#ff5a00'], { encoding: 'utf8' });
  ok(res.status === 0, `create-app.mjs 退出码 0（${res.status}）${res.stderr ? '\n' + res.stderr : ''}`);

  // manifest：存在 + 合法 JSON + 插值正确
  const mfPath = join(app, 'public/manifest.webmanifest');
  ok(existsSync(mfPath), 'public/manifest.webmanifest 存在');
  const mf = JSON.parse(readFileSync(mfPath, 'utf8'));
  ok(mf.name === 'my-app', `manifest.name = my-app（${mf.name}）`);
  ok(mf.description === '测试描述', `manifest.description 插值（${mf.description}）`);
  ok(mf.theme_color === '#ff5a00', `manifest.theme_color 插值（${mf.theme_color}）`);
  ok(Array.isArray(mf.icons) && mf.icons.length === 3, 'manifest.icons 3 项（含 maskable）');

  // 图标 + favicon：二进制文件存在
  for (const icon of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'favicon.ico']) {
    ok(existsSync(join(app, 'public', icon)), `public/${icon} 存在`);
  }

  // index.html：配件 meta 齐全
  const html = readFileSync(join(app, 'index.html'), 'utf8');
  const needs = [
    '<link rel="manifest" href="./manifest.webmanifest">',
    '<meta name="theme-color" content="#ff5a00">',
    '<meta name="description" content="测试描述">',
    '<link rel="icon" href="./favicon.ico" sizes="any">',
    '<link rel="apple-touch-icon" href="./icon-192.png">',
    '<meta property="og:image" content="./icon-512.png">',
  ];
  for (const frag of needs) ok(html.includes(frag), `index.html 含 ${frag}`);

  // 缺省参数：不传 --desc/--theme 时用 name 派生与固定主色
  const app2 = join(tmp, 'plain');
  const res2 = spawnSync(process.execPath, [join(ROOT, 'scripts/create-app.mjs'), app2], { encoding: 'utf8' });
  ok(res2.status === 0, 'create-app.mjs 缺省参数退出码 0');
  const mf2 = JSON.parse(readFileSync(join(app2, 'public/manifest.webmanifest'), 'utf8'));
  ok(mf2.theme_color === '#1677ff', `缺省 theme_color = #1677ff（${mf2.theme_color}）`);
  ok(mf2.description === 'plain app', `缺省 description 派生（${mf2.description}）`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failed > 0) {
  console.error(`\nscaffold:check 失败：${failed} 项`);
  process.exit(1);
}
console.log('\nscaffold:check 通过');
