#!/usr/bin/env node
// af-mobile 交付链 —— doctor（只读自检）+ deploy（部署）
// 设计：docs/design/consumer-delivery-design.md §3.2（D-009 可插拔 / D-010 三阶段演进）
//
// 两个正交维度（勿混淆）：
//   target   = 后端形态（supabase 静态前端 + Supabase BaaS / cloudflare Workers + D1 全栈），脚手架生成时定
//   provider = 部署落点（cloudflare / iga / self-hosted / cn），部署时选，D-010 阶段切换；iga 为 D-016 国内选项
// 组合非笛卡尔积：Workers 全栈不可脱离 Cloudflare（见 ALLOWED）。
//
// 用法：
//   node scripts/deploy.mjs doctor [--dir <项目根>] [--url <线上地址>] [--provider <cloudflare|iga>]
//   node scripts/deploy.mjs deploy [--dir <项目根>] [--project <name>] [--provider <cloudflare|iga>] [--dry-run]
//
// 依赖注入（测试用）：opts.fetch / opts.run，默认分别取全局 fetch 与 spawnSync。
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const TARGETS = ['supabase', 'cloudflare'];
export const PROVIDERS = ['cloudflare', 'iga', 'self-hosted', 'cn'];

// 组合矩阵：target=cloudflare 是 Workers 全栈，只能落在 Cloudflare
const ALLOWED = {
  supabase: ['cloudflare', 'iga', 'self-hosted', 'cn'],
  cloudflare: ['cloudflare'],
};

// P0 配件清单（与 consumer-delivery-design.md §3.1 一致）
export const ASSETS = ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'favicon.ico'];

// 部署类凭据敏感词：命中且带 VITE_ 前缀 → 会被打进前端 bundle（红线，见设计 §4）
const SECRET_WORDS = ['TOKEN', 'SECRET', 'PASSWORD', 'SERVICE_ROLE', 'DB_URL', 'DATABASE_URL', 'PRIVATE_KEY', 'CONNECTION_STRING'];

// provider 未实现的说明（D-010：阶段 2 香港 self-hosted、阶段 3 国内 cn）
const PROVIDER_TODO = {
  'self-hosted': 'D-010 阶段 2（发布后视国内实测决定），形态为 build → rsync + nginx conf 模板',
  cn: 'D-010 阶段 3（流量足够大，需 ICP 备案），形态为 COS/OSS + CDN',
};

function readJson(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

/** 读 .af-mobile/target.json，缺省 supabase */
export function resolveTarget(cwd) {
  const t = readJson(join(cwd, '.af-mobile', 'target.json'))?.target;
  return TARGETS.includes(t) ? t : 'supabase';
}

/** 读 .af-mobile/deploy.json，缺省 cloudflare（D-010 阶段 1） */
export function resolveProvider(cwd) {
  const p = readJson(join(cwd, '.af-mobile', 'deploy.json'))?.provider;
  return PROVIDERS.includes(p) ? p : 'cloudflare';
}

/** 组合合法性：Workers 全栈不可脱离 CF */
export function checkCombo(target, provider) {
  const allowed = ALLOWED[target] || [];
  if (!allowed.includes(provider)) {
    return { ok: false, reason: `target=${target} 与 provider=${provider} 不兼容（允许：${allowed.join(' / ')}）` };
  }
  return { ok: true };
}

/**
 * 构造一条检查项结果。
 * level: 'required'（失败阻断 deploy）| 'info'（仅提示，不阻断）
 */
function item(level, ok, title, hint = '') {
  return { level, ok, title, hint };
}

/** 通用：构建产物存在 */
export function checkDist(cwd) {
  return existsSync(join(cwd, 'dist'))
    ? item('required', true, 'dist/ 存在')
    : item('required', false, 'dist/ 缺失', '先 npm run build');
}

/** 通用：P0 配件齐全且被 index.html 引用 */
export function checkAssets(cwd) {
  const dist = join(cwd, 'dist');
  const missing = ASSETS.filter(f => !existsSync(join(dist, f)));
  if (missing.length > 0) {
    return item('required', false, `配件缺失：${missing.join(', ')}`, '脚手架 P0 补齐后重新 build（设计 §3.1）');
  }
  let html = '';
  try { html = readFileSync(join(dist, 'index.html'), 'utf8'); } catch { /* 下面统一判缺失 */ }
  if (!html) {
    return item('required', false, 'dist/index.html 不可读', '先 npm run build');
  }
  if (!/manifest\.webmanifest|manifest\.json/.test(html)) {
    return item('required', false, 'index.html 未引用 manifest', 'manifest link 缺失则 PWA 不可安装');
  }
  return item('required', true, '配件完整（manifest + 3 图标 + favicon，且 index.html 已引用）');
}

/** 通用：密钥前缀红线 —— 部署类凭据不得带 VITE_ 前缀 */
export function checkKeyPrefix(cwd) {
  const envFile = join(cwd, '.env');
  if (!existsSync(envFile)) return item('info', true, '无 .env（跳过密钥前缀检查）');
  let text = '';
  try { text = readFileSync(envFile, 'utf8'); } catch { return item('info', true, '.env 不可读（跳过）'); }
  const bad = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?(VITE_[A-Z0-9_]+)\s*=/.exec(line);
    if (!m) continue;
    const key = m[1];
    if (SECRET_WORDS.some(w => key.includes(w))) bad.push(key);
  }
  return bad.length === 0
    ? item('required', true, '密钥前缀合规（无部署类凭据带 VITE_ 前缀）')
    : item('required', false, `密钥前缀违规：${bad.join(', ')}`, '带 VITE_ 前缀会被打进前端 bundle（设计 §4 红线）');
}

/** target=supabase：后端环境变量 */
export function checkSupabaseEnv(cwd) {
  const envFile = join(cwd, '.env');
  let text = '';
  try { text = existsSync(envFile) ? readFileSync(envFile, 'utf8') : ''; } catch { text = ''; }
  const need = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missing = need.filter(k => !new RegExp(`^\\s*${k}\\s*=`, 'm').test(text));
  return missing.length === 0
    ? item('required', true, 'Supabase 环境变量已填')
    : item('required', false, `Supabase 环境变量缺失：${missing.join(', ')}`, '从 Supabase 控制台 Project Settings → API 复制');
}

/** target=cloudflare：wrangler 配置与 D1 binding */
export function checkWrangler(cwd) {
  const file = join(cwd, 'wrangler.toml');
  if (!existsSync(file)) return item('required', false, 'wrangler.toml 缺失', 'CF 全栈 target 需要 wrangler 配置');
  let text = '';
  try { text = readFileSync(file, 'utf8'); } catch { text = ''; }
  return /d1_databases/.test(text)
    ? item('required', true, 'wrangler.toml 含 D1 binding')
    : item('required', false, 'wrangler.toml 无 D1 binding', '全栈 target 需要 [[d1_databases]] 配置');
}

/** 通用：线上可达。无 url 则跳过（info） */
export async function checkOnline(url, fetchFn = globalThis.fetch) {
  if (!url) return item('info', true, '未提供 --url，跳过线上可达检查');
  if (!fetchFn) return item('info', true, '无 fetch 实现，跳过线上可达检查');
  try {
    const res = await fetchFn(url, { method: 'HEAD' });
    if (res && res.status === 200) return item('info', true, `线上可达（${url} → 200）`);
    return item('info', false, `线上不可达（${url} → ${res?.status ?? 'no response'}）`, '确认已部署且域名解析生效');
  } catch (e) {
    return item('info', false, `线上请求失败（${url}）`, String(e?.message || e));
  }
}

/**
 * 组装部署命令。provider=self-hosted / cn 尚未实现（D-010 阶段 2/3），返回 unsupported。
 */
export function buildDeployCommand({ target, provider, project = '' }) {
  const combo = checkCombo(target, provider);
  if (!combo.ok) return { unsupported: combo.reason };
  if (provider !== 'cloudflare') {
    return { unsupported: `provider=${provider} 尚未实现；${PROVIDER_TODO[provider] || ''}`.trim() };
  }
  if (target === 'cloudflare') {
    return { cmd: 'npx', args: ['wrangler', 'deploy'], note: 'Workers + assets 单单元部署' };
  }
  const name = project || 'af-mobile-app';
  return { cmd: 'npx', args: ['wrangler', 'pages', 'deploy', 'dist', '--project-name', name], note: `Pages 静态托管（project=${name}）` };
}

/** 汇总所有检查项（含 target 专属与组合兼容性） */
export async function runDoctor(opts = {}) {
  const cwd = opts.dir ? resolve(opts.dir) : process.cwd();
  const target = opts.target || resolveTarget(cwd);
  const provider = opts.provider || resolveProvider(cwd);

  const items = [];
  const combo = checkCombo(target, provider);
  items.push(combo.ok
    ? item('required', true, `组合合法（target=${target} / provider=${provider}）`)
    : item('required', false, combo.reason, '见 ALLOWED 组合矩阵'));

  items.push(checkDist(cwd));
  items.push(checkAssets(cwd));
  items.push(checkKeyPrefix(cwd));
  items.push(item('info', true, '部署端环境变量需单独配置', 'VITE_* 在构建时注入：本地 .env 与部署平台两处各配一份，缺后者线上白屏'));

  if (target === 'supabase') items.push(checkSupabaseEnv(cwd));
  if (target === 'cloudflare') items.push(checkWrangler(cwd));

  items.push(await checkOnline(opts.url, opts.fetch));

  const blocking = items.filter(i => i.level === 'required' && !i.ok);
  return { cwd, target, provider, items, ok: blocking.length === 0, blocking };
}

/** 打印检查结果，返回进程退出码（0 = 可部署） */
export function printDoctor(result) {
  console.log(`af-mobile doctor  target=${result.target}  provider=${result.provider}`);
  for (const i of result.items) {
    const mark = i.level === 'info' ? '○' : (i.ok ? '✓' : '✗');
    console.log(`  ${mark} ${i.title}${i.hint && !i.ok ? `\n      → ${i.hint}` : ''}`);
  }
  if (!result.ok) {
    console.error(`\n✗ ${result.blocking.length} 项未通过，先修复再 deploy`);
    return 1;
  }
  console.log('\n✓ 前置检查通过，可部署');
  return 0;
}

/**
 * 部署：先跑前置检查（required 全绿才执行），再调用 provider 命令。
 * opts.run 注入命令执行器（默认 spawnSync），返回 { status, dryRun, command, doctor }。
 */
export async function runDeploy(opts = {}) {
  const doctor = await runDoctor(opts);
  if (!doctor.ok) {
    return { status: 1, blocked: true, doctor, command: null };
  }
  const project = opts.project || '';
  const command = buildDeployCommand({ target: doctor.target, provider: doctor.provider, project });
  if (command.unsupported) {
    console.error(`✗ ${command.unsupported}`);
    return { status: 1, unsupported: true, doctor, command };
  }
  const args = command.args;
  if (opts.dryRun || !opts.run) {
    console.log(`[dry-run] ${command.cmd} ${args.join(' ')}`);
    return { status: 0, dryRun: true, doctor, command };
  }
  const r = opts.run(command.cmd, args, { cwd: doctor.cwd, stdio: 'inherit' });
  return { status: r?.status ?? 1, doctor, command };
}

// CLI
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const sub = args[0];
  if (sub !== 'doctor' && sub !== 'deploy') {
    console.error('Usage: deploy.mjs <doctor|deploy> [--dir <项目根>] [--project <name>] [--url <线上地址>] [--dry-run]');
    process.exit(2);
  }
  const opts = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--dir') opts.dir = args[++i];
    else if (args[i] === '--project') opts.project = args[++i];
    else if (args[i] === '--url') opts.url = args[++i];
    else if (args[i] === '--dry-run') opts.dryRun = true;
  }
  opts.run = (cmd, argv, spawnOpts) => spawnSync(cmd, argv, spawnOpts);

  if (sub === 'doctor') {
    const result = await runDoctor(opts);
    process.exit(printDoctor(result));
  }
  const r = await runDeploy(opts);
  process.exit(r.status);
}
