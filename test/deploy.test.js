// 交付链 P1 —— doctor / deploy 测试（网络与命令执行全部 mock，无副作用）
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  TARGETS,
  PROVIDERS,
  ASSETS,
  resolveTarget,
  resolveProvider,
  checkCombo,
  checkDist,
  checkAssets,
  checkKeyPrefix,
  checkSupabaseEnv,
  checkWrangler,
  checkIgaCli,
  checkIgaAuth,
  checkOnline,
  buildDeployCommand,
  runDoctor,
  printDoctor,
  runDeploy,
} from '../scripts/deploy.mjs';

let tmpDir;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'af-mobile-deploy-'));
});

afterEach(() => {
  // 清理 best-effort：沙箱 safe-delete shim 下 rmSync 可能失败，os 临时目录残留无害
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* 下轮 mkdtemp 新目录 */ }
});

// 造一个「可用于部署」的项目骨架：dist + 全部配件 + index.html 引用 manifest
function makeProject({ target = 'supabase', provider = 'cloudflare', env = '', withDist = true } = {}) {
  const cwd = join(tmpDir, 'proj');
  mkdirSync(join(cwd, '.af-mobile'), { recursive: true });
  writeFileSync(join(cwd, '.af-mobile', 'target.json'), JSON.stringify({ target }));
  writeFileSync(join(cwd, '.af-mobile', 'deploy.json'), JSON.stringify({ provider }));
  writeFileSync(join(cwd, '.env'), env);
  if (withDist) {
    mkdirSync(join(cwd, 'dist'), { recursive: true });
    for (const f of ASSETS) writeFileSync(join(cwd, 'dist', f), 'x');
    writeFileSync(join(cwd, 'dist', 'index.html'), '<link rel="manifest" href="/manifest.webmanifest"><div id="app"></div>');
  }
  return cwd;
}

describe('deploy / 配置解析', () => {
  it('缺省值：target=supabase、provider=cloudflare（D-010 阶段 1）', () => {
    const cwd = join(tmpDir, 'empty');
    mkdirSync(cwd);
    expect(resolveTarget(cwd)).toBe('supabase');
    expect(resolveProvider(cwd)).toBe('cloudflare');
  });

  it('读取 .af-mobile 下的 target / provider', () => {
    const cwd = makeProject({ target: 'cloudflare', provider: 'cloudflare' });
    expect(resolveTarget(cwd)).toBe('cloudflare');
    expect(resolveProvider(cwd)).toBe('cloudflare');
  });

  it('非法取值回落到缺省，不崩', () => {
    const cwd = join(tmpDir, 'bad');
    mkdirSync(join(cwd, '.af-mobile'), { recursive: true });
    writeFileSync(join(cwd, '.af-mobile', 'target.json'), '{ not json');
    writeFileSync(join(cwd, '.af-mobile', 'deploy.json'), JSON.stringify({ provider: 'nope' }));
    expect(resolveTarget(cwd)).toBe('supabase');
    expect(resolveProvider(cwd)).toBe('cloudflare');
  });

  it('取值集合与文档一致', () => {
    expect(TARGETS).toEqual(['supabase', 'cloudflare']);
    expect(PROVIDERS).toEqual(['cloudflare', 'iga', 'self-hosted', 'cn']);
  });
});

describe('deploy / 组合矩阵', () => {
  it('supabase 可落四个 provider（iga 为 D-016 国内选项）', () => {
    for (const p of PROVIDERS) expect(checkCombo('supabase', p).ok).toBe(true);
  });

  it('cloudflare 全栈只能落 cloudflare（Workers 不可脱离 CF，iga 亦不可）', () => {
    expect(checkCombo('cloudflare', 'cloudflare').ok).toBe(true);
    expect(checkCombo('cloudflare', 'iga').ok).toBe(false);
    expect(checkCombo('cloudflare', 'self-hosted').ok).toBe(false);
    expect(checkCombo('cloudflare', 'cn').ok).toBe(false);
    expect(checkCombo('cloudflare', 'iga').reason).toContain('不兼容');
  });
});

describe('doctor / 通用检查项', () => {
  it('dist 缺失 → required 失败并给出 build 提示', () => {
    const cwd = makeProject({ withDist: false });
    const r = checkDist(cwd);
    expect(r.level).toBe('required');
    expect(r.ok).toBe(false);
    expect(r.hint).toContain('npm run build');
  });

  it('配件齐全 + index.html 引用 manifest → 通过', () => {
    expect(checkAssets(makeProject()).ok).toBe(true);
  });

  it('配件缺失 → 列出缺哪几个', () => {
    const cwd = makeProject();
    rmSync(join(cwd, 'dist', 'icon-192.png'));
    rmSync(join(cwd, 'dist', 'favicon.ico'));
    const r = checkAssets(cwd);
    expect(r.ok).toBe(false);
    expect(r.title).toContain('icon-192.png');
    expect(r.title).toContain('favicon.ico');
  });

  it('index.html 未引用 manifest → 失败（PWA 不可安装）', () => {
    const cwd = makeProject();
    writeFileSync(join(cwd, 'dist', 'index.html'), '<div id="app"></div>');
    const r = checkAssets(cwd);
    expect(r.ok).toBe(false);
    expect(r.title).toContain('manifest');
  });

  it('密钥前缀红线：部署类凭据带 VITE_ 前缀 → 失败', () => {
    const cwd = makeProject({ env: 'VITE_CLOUDFLARE_API_TOKEN=abc\nVITE_SUPABASE_DB_URL=postgres://x' });
    const r = checkKeyPrefix(cwd);
    expect(r.ok).toBe(false);
    expect(r.title).toContain('VITE_CLOUDFLARE_API_TOKEN');
    expect(r.title).toContain('VITE_SUPABASE_DB_URL');
  });

  it('anon key 是公开设计，不算违规（不当误报）', () => {
    const cwd = makeProject({ env: 'VITE_SUPABASE_URL=https://x.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJ' });
    expect(checkKeyPrefix(cwd).ok).toBe(true);
  });

  it('service_role 命中敏感词 → 违规', () => {
    const cwd = makeProject({ env: 'VITE_SUPABASE_SERVICE_ROLE=xxx' });
    expect(checkKeyPrefix(cwd).ok).toBe(false);
  });

  it('无 .env 时跳过，不阻断', () => {
    const cwd = makeProject();
    rmSync(join(cwd, '.env'));
    const r = checkKeyPrefix(cwd);
    expect(r.ok).toBe(true);
    expect(r.level).toBe('info');
  });
});

describe('doctor / target 专属检查项', () => {
  it('supabase：环境变量缺失 → 失败', () => {
    expect(checkSupabaseEnv(makeProject({ env: '' })).ok).toBe(false);
    const cwd = makeProject({ env: 'VITE_SUPABASE_URL=https://x\nVITE_SUPABASE_ANON_KEY=k' });
    expect(checkSupabaseEnv(cwd).ok).toBe(true);
  });

  it('cloudflare：无 wrangler.toml → 失败；无 D1 binding → 失败', () => {
    const cwd = makeProject({ target: 'cloudflare' });
    expect(checkWrangler(cwd).ok).toBe(false);
    writeFileSync(join(cwd, 'wrangler.toml'), 'name = "x"\n');
    expect(checkWrangler(cwd).ok).toBe(false);
    writeFileSync(join(cwd, 'wrangler.toml'), 'name = "x"\n[[d1_databases]]\nbinding = "DB"\n');
    expect(checkWrangler(cwd).ok).toBe(true);
  });
});

describe('doctor / 线上可达（fetch mock）', () => {
  it('200 → 通过；非 200 → 提示但不阻断（info 级）', async () => {
    const ok = await checkOnline('https://x.pages.dev', async () => ({ status: 200 }));
    expect(ok.ok).toBe(true);
    const bad = await checkOnline('https://x.pages.dev', async () => ({ status: 404 }));
    expect(bad.ok).toBe(false);
    expect(bad.level).toBe('info');
  });

  it('请求抛错 → info 级失败，不抛异常', async () => {
    const r = await checkOnline('https://x.pages.dev', async () => { throw new Error('ENOTFOUND'); });
    expect(r.ok).toBe(false);
    expect(r.level).toBe('info');
  });

  it('未给 url → 跳过', async () => {
    const r = await checkOnline('', async () => ({ status: 200 }));
    expect(r.ok).toBe(true);
    expect(r.title).toContain('跳过');
  });
});

describe('deploy / 命令构建', () => {
  it('supabase + cloudflare → wrangler pages deploy dist', () => {
    const c = buildDeployCommand({ target: 'supabase', provider: 'cloudflare', project: 'demo' });
    expect(c.cmd).toBe('npx');
    expect(c.args).toContain('pages');
    expect(c.args).toContain('--project-name');
    expect(c.args).toContain('demo');
  });

  it('project 缺省时回落 af-mobile-app', () => {
    const c = buildDeployCommand({ target: 'supabase', provider: 'cloudflare' });
    expect(c.args).toContain('af-mobile-app');
  });

  it('cloudflare 全栈 → wrangler deploy（无 pages 子命令）', () => {
    const c = buildDeployCommand({ target: 'cloudflare', provider: 'cloudflare' });
    expect(c.args).toEqual(['wrangler', 'deploy']);
  });

  it('supabase + iga → iga pages deploy --name <project>', () => {
    const c = buildDeployCommand({ target: 'supabase', provider: 'iga', project: 'demo' });
    expect(c.cmd).toBe('iga');
    expect(c.args).toEqual(['pages', 'deploy', '--name', 'demo']);
    expect(c.note).toContain('IGA');
  });

  it('iga 缺省项目名回落 af-mobile-app', () => {
    const c = buildDeployCommand({ target: 'supabase', provider: 'iga' });
    expect(c.args).toContain('af-mobile-app');
  });

  it('cloudflare 全栈 + iga → 组合错误（非 unsupported）', () => {
    const c = buildDeployCommand({ target: 'cloudflare', provider: 'iga' });
    expect(c.unsupported).toContain('不兼容');
  });

  it('未实现的 provider → unsupported 且带 D-010 阶段说明', () => {
    const a = buildDeployCommand({ target: 'supabase', provider: 'self-hosted' });
    expect(a.unsupported).toContain('self-hosted');
    expect(a.unsupported).toContain('D-010');
    const b = buildDeployCommand({ target: 'supabase', provider: 'cn' });
    expect(b.unsupported).toContain('备案');
  });

  it('非法组合优先报组合错误', () => {
    const c = buildDeployCommand({ target: 'cloudflare', provider: 'self-hosted' });
    expect(c.unsupported).toContain('不兼容');
  });
});

describe('doctor / iga 专属检查项（D-016）', () => {
  it('iga CLI：无 runFn → info 跳过；版本 ≥1.1.0 → 通过', () => {
    expect(checkIgaCli(null).level).toBe('info');
    expect(checkIgaCli(() => ({ status: 0, stdout: '1.1.0' })).ok).toBe(true);
    expect(checkIgaCli(() => ({ status: 0, stdout: '2.3.0' })).ok).toBe(true);
  });

  it('iga CLI：未安装 / 版本过低 → required 失败', () => {
    const miss = checkIgaCli(() => ({ status: 1, stdout: '' }));
    expect(miss.ok).toBe(false);
    expect(miss.level).toBe('required');
    expect(miss.hint).toContain('@iga-pages/cli');
    expect(checkIgaCli(() => ({ status: 0, stdout: '1.0.9' })).ok).toBe(false);
  });

  it('iga 登录态：whoami 成功且有输出 → 通过；否则失败', () => {
    expect(checkIgaAuth(() => ({ status: 0, stdout: 'Account: x' })).ok).toBe(true);
    const bad = checkIgaAuth(() => ({ status: 1, stdout: '' }));
    expect(bad.ok).toBe(false);
    expect(bad.hint).toContain('iga login');
  });

  it('runDoctor provider=iga：注入 run 后含 CLI/登录态检查；env 提示为 IGA 措辞', async () => {
    const cwd = makeProject({ env: 'VITE_SUPABASE_URL=https://x\nVITE_SUPABASE_ANON_KEY=k', provider: 'iga' });
    const r = await runDoctor({
      dir: cwd,
      run: (cmd, args) => (args[0] === '--version' ? { status: 0, stdout: '1.1.0' } : { status: 0, stdout: 'Account: x' }),
    });
    expect(r.ok).toBe(true);
    expect(r.items.some(i => i.title.includes('iga CLI'))).toBe(true);
    expect(r.items.some(i => i.title.includes('IGA 登录态'))).toBe(true);
    expect(r.items.some(i => i.title.includes('IGA 环境变量'))).toBe(true);
  });

  it('runDoctor provider=iga 且 CLI 缺失 → 阻断', async () => {
    const r = await runDoctor({ dir: makeProject({ provider: 'iga', env: 'VITE_SUPABASE_URL=https://x\nVITE_SUPABASE_ANON_KEY=k' }), run: () => ({ status: 1, stdout: '' }) });
    expect(r.ok).toBe(false);
  });

  it('runDoctor cloudflare+supabase：含国内引导 info；iga 时不出现', async () => {
    const cf = await runDoctor({ dir: makeProject({ env: 'VITE_SUPABASE_URL=https://x\nVITE_SUPABASE_ANON_KEY=k' }) });
    expect(cf.items.some(i => i.title.includes('国内用户'))).toBe(true);
    const cwd = makeProject({ env: 'VITE_SUPABASE_URL=https://x\nVITE_SUPABASE_ANON_KEY=k', provider: 'iga' });
    const iga = await runDoctor({ dir: cwd, run: () => ({ status: 0, stdout: 'x' }) });
    expect(iga.items.some(i => i.title.includes('国内用户'))).toBe(false);
  });
});

describe('doctor / 汇总与打印', () => {
  it('全绿项目：ok=true 且退出码 0', async () => {
    const cwd = makeProject({ env: 'VITE_SUPABASE_URL=https://x\nVITE_SUPABASE_ANON_KEY=k' });
    const r = await runDoctor({ dir: cwd });
    expect(r.ok).toBe(true);
    expect(r.blocking).toHaveLength(0);
    expect(printDoctor(r)).toBe(0);
  });

  it('有阻断项：ok=false 且退出码 1', async () => {
    const r = await runDoctor({ dir: makeProject({ withDist: false }) });
    expect(r.ok).toBe(false);
    expect(r.blocking.length).toBeGreaterThan(0);
    expect(printDoctor(r)).toBe(1);
  });

  it('info 级失败不阻断（线上不可达仍可部署）', async () => {
    const cwd = makeProject({ env: 'VITE_SUPABASE_URL=https://x\nVITE_SUPABASE_ANON_KEY=k' });
    const r = await runDoctor({ dir: cwd, url: 'https://x', fetch: async () => ({ status: 500 }) });
    expect(r.ok).toBe(true);
  });

  it('target 专属检查按 target 切换：supabase 项目不检查 wrangler', async () => {
    const r = await runDoctor({ dir: makeProject({ target: 'supabase' }) });
    expect(r.items.some(i => i.title.includes('wrangler'))).toBe(false);
    expect(r.items.some(i => i.title.includes('Supabase'))).toBe(true);
  });

  it('非法组合在 doctor 阶段即暴露', async () => {
    const cwd = makeProject({ target: 'cloudflare', provider: 'self-hosted' });
    const r = await runDoctor({ dir: cwd });
    expect(r.ok).toBe(false);
    expect(r.blocking[0].title).toContain('不兼容');
  });
});

describe('deploy / 执行', () => {
  const goodEnv = 'VITE_SUPABASE_URL=https://x\nVITE_SUPABASE_ANON_KEY=k';

  it('--dry-run：只打印命令，不执行 run', async () => {
    let called = 0;
    const r = await runDeploy({
      dir: makeProject({ env: goodEnv }),
      dryRun: true,
      run: () => { called++; return { status: 0 }; },
    });
    expect(r.dryRun).toBe(true);
    expect(r.status).toBe(0);
    expect(called).toBe(0);
    expect(r.command.args).toContain('pages');
  });

  it('前置检查未过 → 阻断，不执行命令', async () => {
    let called = 0;
    const r = await runDeploy({
      dir: makeProject({ withDist: false }),
      run: () => { called++; return { status: 0 }; },
    });
    expect(r.blocked).toBe(true);
    expect(r.status).toBe(1);
    expect(called).toBe(0);
  });

  it('前置通过 → 调用注入的 run 并透传退出码', async () => {
    const calls = [];
    const r = await runDeploy({
      dir: makeProject({ env: goodEnv }),
      project: 'demo',
      run: (cmd, args) => { calls.push([cmd, args]); return { status: 0 }; },
    });
    expect(r.status).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toContain('demo');
  });

  it('run 返回非零退出码时透传', async () => {
    const r = await runDeploy({
      dir: makeProject({ env: goodEnv }),
      run: () => ({ status: 3 }),
    });
    expect(r.status).toBe(3);
  });

  it('未实现 provider：前置通过后报 unsupported，不执行命令', async () => {
    let called = 0;
    const r = await runDeploy({
      dir: makeProject({ env: goodEnv, provider: 'self-hosted' }),
      run: () => { called++; return { status: 0 }; },
    });
    expect(r.unsupported).toBe(true);
    expect(r.status).toBe(1);
    expect(called).toBe(0);
  });

  it('未提供 run 时退化为 dry-run，不产生副作用', async () => {
    const r = await runDeploy({ dir: makeProject({ env: goodEnv }) });
    expect(r.dryRun).toBe(true);
    expect(r.status).toBe(0);
  });
});
