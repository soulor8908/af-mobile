// afMobileShakeCss 单元测试
// 不跑真实 Vite build（那在 scripts/check-css-shake-e2e.mjs，与 register:e2e 同模式）；
// 这里直接取出插件注入的 postcss 插件对象执行，验证接线语义（路径判定 / 扫描 / 保底 / 逃生舱）。
// 测试夹具含非白名单 class 字符串（btn / card / rate），按 AGENTS.md §1 测试夹具例外豁免
/* eslint-disable af-mobile/token-whitelist */
import { describe, it, expect, vi } from 'vitest';
import postcss from 'postcss';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afMobileShakeCss } from '../src/vite.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AF_CSS_FROM = join(ROOT, 'src', 'index.css').replace(/\\/g, '/');

const CSS = `
:root { --c-text: #000; }
.btn { padding: 4px; }
.card { padding: 8px; }
.rate { color: red; }
af-list { display: block; }
.spinner { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes unused { to { opacity: 0; } }
`;

// 造消费端源码目录：page.js 内静态用到 btn / card
function fixture(source = 'export const h = \'<div class="btn card"></div>\';') {
  const dir = mkdtempSync(join(tmpdir(), 'af-shake-'));
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'page.js'), source);
  return dir;
}

// 取出插件注入的 postcss 插件并执行一次
function run(from, { source, ...opts } = {}) {
  const dir = fixture(source);
  try {
    const vitePlugin = afMobileShakeCss({ scanDir: dir, ...opts });
    const cfg = vitePlugin.config({});
    const pcPlugin = cfg.css.postcss.plugins[0];
    const root = postcss.parse(CSS);
    pcPlugin.OnceExit(root, { result: { opts: { from } } });
    return root.toString();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('vite / afMobileShakeCss 插件形态', () => {
  it('仅 build 阶段生效（dev 裁剪会导致 HMR 样式丢失）', () => {
    expect(afMobileShakeCss().apply).toBe('build');
  });

  it('config() 注入 postcss 插件数组', () => {
    const cfg = afMobileShakeCss().config({});
    expect(cfg.css.postcss.plugins).toHaveLength(1);
    expect(cfg.css.postcss.plugins[0].postcssPlugin).toBe('af-mobile-shake-css');
  });

  it('css.postcss 为配置文件路径时不注入，避免覆盖用户链路', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cfg = afMobileShakeCss().config({ css: { postcss: './postcss.config.js' } });
    expect(cfg).toEqual({});
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('enabled:false 时降级为空插件', () => {
    expect(afMobileShakeCss({ enabled: false }).config).toBeUndefined();
  });
});

describe('vite / afMobileShakeCss 裁剪语义', () => {
  it('保留用到的 class，删除未用到的', () => {
    const out = run(AF_CSS_FROM);
    expect(out).toContain('.btn');
    expect(out).toContain('.card');
    expect(out).not.toContain('.rate');
  });

  it('保留 :root 变量与 af-* 组件宿主样式', () => {
    const out = run(AF_CSS_FROM);
    expect(out).toContain(':root');
    expect(out).toContain('af-list');
  });

  it('删除未被引用的 @keyframes', () => {
    const out = run(AF_CSS_FROM);
    expect(out).not.toContain('@keyframes unused');
  });

  it('不处理消费端自己的 CSS（路径不属于 af-mobile 包）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'af-shake-own-'));
    try {
      const own = join(dir, 'styles.css').replace(/\\/g, '/');
      expect(run(own)).toBe(postcss.parse(CSS).toString());
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('扫描不到任何 class 时放弃裁剪（否则等于全删）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dir = mkdtempSync(join(tmpdir(), 'af-shake-empty-'));
    try {
      const vitePlugin = afMobileShakeCss({ scanDir: dir });
      const pcPlugin = vitePlugin.config({}).css.postcss.plugins[0];
      const root = postcss.parse(CSS);
      pcPlugin.OnceExit(root, { result: { opts: { from: AF_CSS_FROM } } });
      expect(root.toString()).toBe(postcss.parse(CSS).toString());
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('safelist 逃生舱：强制保留动态拼接的 class', () => {
    expect(run(AF_CSS_FROM)).not.toContain('.rate');
    expect(run(AF_CSS_FROM, { safelist: ['rate'] })).toContain('.rate');
  });

  it('opts.include 可自定义命中路径（混合 symlink 解析的兜底）', () => {
    // 默认不命中这条路径
    const weird = '/some/linked/pkg/src/index.css';
    expect(run(weird)).toBe(postcss.parse(CSS).toString());
    // 指定 include 后命中并裁剪
    expect(run(weird, { include: '/linked/pkg/' })).not.toContain('.rate');
  });

  it('救回模板字面量三元里的 class（class="a ${x ? \'b\' : \'\'}"）', () => {
    const out = run(AF_CSS_FROM, {
      source: 'export const h = `<i class="btn ${x ? \'rate\' : \'\'}"></i>`;',
    });
    expect(out).toContain('.btn');
    expect(out).toContain('.rate');
  });
});
