# IGA 部署 Provider 实施计划（D-016）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `af-mobile deploy` 新增 IGA Pages provider（薄封装），国内消费者可选 IGA、海外沿用 Cloudflare。

**Architecture:** 在现有 [scripts/deploy.mjs](../../../scripts/deploy.mjs) 的 provider 抽象内加 `iga` 分支：组合矩阵放开 `supabase+iga`、部署命令 `iga pages deploy --name <project>`、doctor 追加 iga CLI/登录态检查项、`--provider` flag 首次指定后持久化到 `.af-mobile/deploy.json`。不改 `af-mobile.mjs`（flag 已透传），不加新文件。

**Tech Stack:** Node.js ESM 脚本（零依赖）、vitest、IGA CLI（外部命令，测试全 mock）。

**设计依据:** [consumer-delivery-design.md §8](../design/consumer-delivery-design.md)、[DECISIONS.md D-016](../../DECISIONS.md)

**红线提醒（本仓门禁）：**
- 提交前全量门禁：`npx eslint src/ test/ scripts/ ... --max-warnings 0` + `npx vitest run`；scripts 属发布产物，**必须带 changeset**
- 禁 `eslint-disable`；测试禁 skip
- `iga` 命令在测试中一律 mock（`opts.run` 注入），不产生真实网络/进程副作用

---

### Task 1: PROVIDERS 集合与组合矩阵放开 `iga`

**Files:**
- Modify: `scripts/deploy.mjs:20-27`（PROVIDERS / ALLOWED / 头注释）
- Test: `test/deploy.test.js:74-91`（取值集合 + 组合矩阵）

- [ ] **Step 1: 更新测试（先失败）**

`test/deploy.test.js` 改两处：

```js
  it('取值集合与文档一致', () => {
    expect(TARGETS).toEqual(['supabase', 'cloudflare']);
    expect(PROVIDERS).toEqual(['cloudflare', 'iga', 'self-hosted', 'cn']);
  });
```

```js
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/deploy.test.js`
Expected: FAIL（`PROVIDERS` 断言不匹配；`cloudflare+iga` 目前 ok=true 因 ALLOWED 未收 iga——注意 `supabase` 循环用 PROVIDERS，加 iga 后矩阵未改会先暴露）

- [ ] **Step 3: 最小实现**

`scripts/deploy.mjs` 头注释（`:6-7` 附近）与常量：

```js
//   provider = 部署落点（cloudflare / iga / self-hosted / cn），部署时选，D-010 阶段切换；iga 为 D-016 国内选项
```

```js
export const PROVIDERS = ['cloudflare', 'iga', 'self-hosted', 'cn'];

// 组合矩阵：target=cloudflare 是 Workers 全栈，只能落在 Cloudflare
const ALLOWED = {
  supabase: ['cloudflare', 'iga', 'self-hosted', 'cn'],
  cloudflare: ['cloudflare'],
};
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run test/deploy.test.js`
Expected: PASS（原有 35 例全绿）

- [ ] **Step 5: Commit**

```bash
git add scripts/deploy.mjs test/deploy.test.js
git commit -m "feat(deploy): 组合矩阵放开 supabase+iga（D-016 第 1 步）"
```

---

### Task 2: `buildDeployCommand` iga 分支

**Files:**
- Modify: `scripts/deploy.mjs:153-167`（`buildDeployCommand`）
- Test: `test/deploy.test.js`（「deploy / 命令构建」describe 内追加）

- [ ] **Step 1: 写失败测试**

在 `describe('deploy / 命令构建', ...)` 内追加：

```js
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/deploy.test.js`
Expected: FAIL（iga 目前落入 unsupported 分支）

- [ ] **Step 3: 最小实现**

`buildDeployCommand` 中，在 `if (provider !== 'cloudflare')` unsupported 判断**之前**插入：

```js
  if (provider === 'iga') {
    const name = project || 'af-mobile-app';
    return { cmd: 'iga', args: ['pages', 'deploy', '--name', name], note: `IGA Pages 静态托管（project=${name}）；IGA 对 Vite 的自动构建行为实施时实测（D-016 §8.5）` };
  }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run test/deploy.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/deploy.mjs test/deploy.test.js
git commit -m "feat(deploy): iga 部署命令 iga pages deploy --name（D-016 第 2 步）"
```

---

### Task 3: doctor iga 专属检查项 + 引导提示 + env 提示差异化

**Files:**
- Modify: `scripts/deploy.mjs`（新增 `checkIgaCli` / `checkIgaAuth`；`runDoctor` 接线，约 `:169-193`）
- Test: `test/deploy.test.js`（新增 describe）

- [ ] **Step 1: 写失败测试**

文件头部 import 增加 `checkIgaCli, checkIgaAuth`；新增 describe（放在「doctor / target 专属检查项」之后）：

```js
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/deploy.test.js`
Expected: FAIL（`checkIgaCli` 未导出）

- [ ] **Step 3: 最小实现**

`scripts/deploy.mjs` 新增导出（放在 `checkSupabaseEnv` 之后）：

```js
/** provider=iga：CLI 已安装且版本 ≥ 1.1.0（iga-pages skill 硬性要求） */
export function checkIgaCli(runFn) {
  if (!runFn) return item('info', true, '无命令执行器，跳过 iga CLI 检查');
  const r = runFn('iga', ['--version'], { stdio: 'pipe' });
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(String((r && r.stdout) || ''));
  const ok = !!m && (+m[1] > 1 || (+m[1] === 1 && +m[2] >= 1));
  return ok
    ? item('required', true, `iga CLI 版本合规（${m[0]}）`)
    : item('required', false, 'iga CLI 未安装或版本过低（需 ≥ 1.1.0）', 'npm i -g @iga-pages/cli@latest');
}

/** provider=iga：登录态有效（whoami 成功且有输出） */
export function checkIgaAuth(runFn) {
  if (!runFn) return item('info', true, '无命令执行器，跳过 IGA 登录态检查');
  const r = runFn('iga', ['whoami'], { stdio: 'pipe' });
  const ok = !!r && r.status === 0 && String(r.stdout || '').trim() !== '';
  return ok
    ? item('required', true, 'IGA 登录态有效')
    : item('required', false, 'IGA 未登录', '本地执行 iga login（浏览器）；远程/CI 用 iga login --accessKey <AK> --secretKey <SK>（火山引擎 IAM 控制台取）');
}
```

`runDoctor` 内，`items.push(checkKeyPrefix(cwd));` 之后改为：

```js
  if (provider === 'iga') {
    items.push(checkIgaCli(opts.run));
    items.push(checkIgaAuth(opts.run));
    items.push(item('info', true, 'IGA 环境变量下次 deploy 才生效', '先 iga pages env add <KEY> 再 deploy（VITE_* 构建时注入，顺序反了线上白屏）；可用 iga pages integration link supabase 自动同步连接变量'));
  } else {
    items.push(item('info', true, '部署端环境变量需单独配置', 'VITE_* 在构建时注入：本地 .env 与部署平台两处各配一份，缺后者线上白屏'));
  }
  if (provider === 'cloudflare' && target === 'supabase') {
    items.push(item('info', true, '国内用户可选 IGA', 'af-mobile deploy --provider iga（火山引擎默认域名，国内可达性更优，D-016）'));
  }
```

（原 `:184` 行的固定 env info 项被上述 if/else 取代。）

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run test/deploy.test.js`
Expected: PASS（含原有全绿——「全绿项目」用例 provider=cloudflare+supabase 多一条 info 不影响 `ok` 判定）

- [ ] **Step 5: Commit**

```bash
git add scripts/deploy.mjs test/deploy.test.js
git commit -m "feat(deploy): doctor iga 检查项（CLI/登录态）+ 国内引导与 env 提示差异化（D-016 第 3 步）"
```

---

### Task 4: `--provider` flag 解析与持久化写回

**Files:**
- Modify: `scripts/deploy.mjs`（新增 `persistProvider` 导出；`runDeploy` 收尾写回；CLI `isMain` 参数解析 `:244-249` 与 usage `:240`）
- Test: `test/deploy.test.js`（新增 describe）

- [ ] **Step 1: 写失败测试**

import 增加 `persistProvider`；新增 describe：

```js
describe('deploy / provider 持久化（D-016）', () => {
  it('persistProvider：写入新文件 / 保留其他字段 / 同值不写', () => {
    const cwd = join(tmpDir, 'p1');
    mkdirSync(join(cwd, '.af-mobile'), { recursive: true });
    writeFileSync(join(cwd, '.af-mobile', 'deploy.json'), JSON.stringify({ provider: 'cloudflare', host: 'x' }));
    expect(persistProvider(cwd, 'iga')).toBe(true);
    const cur = JSON.parse(readFileSync(join(cwd, '.af-mobile', 'deploy.json'), 'utf8'));
    expect(cur.provider).toBe('iga');
    expect(cur.host).toBe('x');
    expect(persistProvider(cwd, 'iga')).toBe(false);
  });

  it('persistProvider：目录不存在时自动创建', () => {
    const cwd = join(tmpDir, 'p2');
    mkdirSync(cwd, { recursive: true });
    expect(persistProvider(cwd, 'iga')).toBe(true);
    expect(resolveProvider(cwd)).toBe('iga');
  });

  it('runDeploy --provider iga 成功后写回 deploy.json', async () => {
    const cwd = makeProject({ env: 'VITE_SUPABASE_URL=https://x\nVITE_SUPABASE_ANON_KEY=k' });
    const r = await runDeploy({ dir: cwd, provider: 'iga', run: () => ({ status: 0 }) });
    expect(r.status).toBe(0);
    expect(JSON.parse(readFileSync(join(cwd, '.af-mobile', 'deploy.json'), 'utf8')).provider).toBe('iga');
  });

  it('dry-run 不写回', async () => {
    const cwd = makeProject({ env: 'VITE_SUPABASE_URL=https://x\nVITE_SUPABASE_ANON_KEY=k' });
    await runDeploy({ dir: cwd, provider: 'iga', dryRun: true });
    expect(JSON.parse(readFileSync(join(cwd, '.af-mobile', 'deploy.json'), 'utf8')).provider).toBe('cloudflare');
  });

  it('命令失败不写回', async () => {
    const cwd = makeProject({ env: 'VITE_SUPABASE_URL=https://x\nVITE_SUPABASE_ANON_KEY=k' });
    await runDeploy({ dir: cwd, provider: 'iga', run: () => ({ status: 1 }) });
    expect(JSON.parse(readFileSync(join(cwd, '.af-mobile', 'deploy.json'), 'utf8')).provider).toBe('cloudflare');
  });
});
```

（`readFileSync` 需确认已在文件头 import——现有 import 行为 `mkdtempSync, rmSync, mkdirSync, writeFileSync`，追加 `readFileSync`。）

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/deploy.test.js`
Expected: FAIL（`persistProvider` 未导出）

- [ ] **Step 3: 最小实现**

`scripts/deploy.mjs` import 行补 `writeFileSync`、`mkdirSync`：

```js
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
```

新增导出（`resolveProvider` 之后）：

```js
/** 把 provider 持久化到 .af-mobile/deploy.json（保留其他字段）；同值不写返回 false */
export function persistProvider(cwd, provider) {
  const file = join(cwd, '.af-mobile', 'deploy.json');
  const cur = readJson(file) || {};
  if (cur.provider === provider) return false;
  mkdirSync(join(cwd, '.af-mobile'), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ ...cur, provider }, null, 2)}\n`);
  return true;
}
```

`runDeploy` 收尾（真实 run 之后）：

```js
  const r = opts.run(command.cmd, args, { cwd: doctor.cwd, stdio: 'inherit' });
  const status = r?.status ?? 1;
  if (status === 0 && opts.provider) persistProvider(doctor.cwd, opts.provider);
  return { status, doctor, command };
```

CLI `isMain` 段：usage 行加 `[--provider <cloudflare|iga>]`；参数循环加：

```js
    else if (args[i] === '--provider') opts.provider = args[++i];
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run test/deploy.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/deploy.mjs test/deploy.test.js
git commit -m "feat(deploy): --provider flag 持久化到 deploy.json（D-016 第 4 步）"
```

---

### Task 5: starter/DEPLOY.md 补 IGA 路径 + changeset

**Files:**
- Modify: `starter/DEPLOY.md:1`（标题）与正文（路径 B 之后、自定义域名之前）
- Create: `.changeset/iga-provider.md`

- [ ] **Step 1: DEPLOY.md 标题与新增路径 C**

标题改为：

```markdown
# 部署指南（Cloudflare Pages / IGA Pages）
```

「路径 B」小节末尾（`自定义域名` 标题之前）插入：

```markdown
## 路径 C：IGA Pages（国内用户推荐）

火山引擎体系，部署后自动提供平台默认域名，国内可达性更优；自定义域名可选。

```bash
npm i -g @iga-pages/cli@latest
iga login          # 本地浏览器登录；远程/CI 用 iga login --accessKey <AK> --secretKey <SK>（火山引擎 IAM 控制台取）
npm run build
af-mobile deploy --provider iga    # 首次指定后记住选择，之后 af-mobile deploy 即可
```

- **环境变量顺序**：先 `iga pages env add VITE_SUPABASE_URL`（配置项目级 env）**再** deploy——IGA 的 env 在下次 deploy 才生效，而 `VITE_*` 是构建时注入，顺序反了线上白屏
- 更省事：`iga pages integration link supabase` 连接火山 Supabase，连接变量自动同步，免两处手工配置
- 预览链接带 `?iga_token=…` 参数，分享时必须带全，否则打不开
```

- [ ] **Step 2: 创建 changeset**

`.changeset/iga-provider.md`：

```markdown
---
'@af-mobile/ui': patch
---

deploy 新增 IGA provider（D-016）：`af-mobile deploy --provider iga`（首次指定后持久化到 .af-mobile/deploy.json），doctor 增加 iga CLI/登录态检查、国内引导与 env 提示差异化；supabase target 可落 IGA Pages，Workers 全栈仍仅 Cloudflare
```

- [ ] **Step 3: Commit**

```bash
git add starter/DEPLOY.md .changeset/iga-provider.md
git commit -m "docs(starter): 部署指南补 IGA Pages 路径 C（D-016）"
```

---

### Task 6: 全量门禁 + 冒烟

**Files:** 无新改动（验证任务）

- [ ] **Step 1: 全量单元测试**

Run: `npx vitest run`
Expected: 全绿（原 1371+ 例 + 新增 ~12 例）

- [ ] **Step 2: ESLint**

Run: `npx eslint scripts/ test/ --max-warnings 0`
Expected: 0 error 0 warning

- [ ] **Step 3: 冒烟（dry-run，不产生真实部署）**

Run: `node scripts/deploy.mjs deploy --dir starter --provider iga --dry-run`（starter 无 dist 时会阻断——先确认输出为「dist 缺失」阻断即逻辑正确）
Expected: doctor 打印含 `provider=iga` 与 iga 检查项；无 dist 时退出码 1 且不打印部署命令；对已有 dist 的真实项目 dry-run 打印 `iga pages deploy --name <name>` 且退出码 0、`deploy.json` **未**被写回

- [ ] **Step 4: 实测项提醒（非本计划范围，发布该 provider 前必须完成）**

D-016 §8.5 四项：① `iga pages deploy` 对 Vite 的构建行为 ② `_redirects` SPA fallback 是否生效 ③ IGA 计费/免费额度 ④ 默认域名国内可达性抽样。实测结果回填 design 文档 §8.5。

---

## Self-Review 结论

- **Spec 覆盖**：§8.2 矩阵/命令→Task 1/2；§8.3 检查项+env 差异化+引导→Task 3；§8.4 flag 持久化+doctor 只读→Task 4；DEPLOY.md+changeset→Task 5；门禁+冒烟→Task 6。无遗漏。
- **占位符**：无 TBD/TODO；所有代码步骤含完整代码。
- **类型一致性**：`checkIgaCli(runFn)` / `checkIgaAuth(runFn)` / `persistProvider(cwd, provider)` 在测试与实现中签名一致；`opts.run` 约定（返回 `{status, stdout}`）与现有注入模式一致。
