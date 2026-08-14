// eslint-plugin-aiflow 独立包验证：@aiflow-ui/eslint-plugin 可作为独立 npm 包发布/消费
// 验证：包元信息 / 27 规则完整性 / recommended 配置自洽 / 端到端集成（Linter 跑通）
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import plugin from '../../eslint-plugin-aiflow/index.js';

const PKG_DIR = resolve(fileURLToPath(import.meta.url), '../../../eslint-plugin-aiflow');

describe('@aiflow-ui/eslint-plugin 独立包', () => {
  it('package.json 元信息完整（name/version/exports/files/peerDeps）', () => {
    const pkg = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('@aiflow-ui/eslint-plugin');
    expect(pkg.version).toBe(plugin.meta.version);
    expect(pkg.type).toBe('module');
    expect(pkg.main).toBe('./index.js');
    expect(pkg.exports['.']).toBe('./index.js');
    // files 字段承诺的路径必须存在（发布包内容完整，目录与文件均可）
    for (const f of pkg.files) {
      expect(statSync(join(PKG_DIR, f)).isDirectory() || statSync(join(PKG_DIR, f)).isFile()).toBe(true);
    }
    expect(pkg.peerDependencies.eslint).toBe('>=9.0.0');
  });

  it('导出完整 27 条规则（L1(2)+L2(7)+L3(6)+L3.5(12)）', () => {
    const names = Object.keys(plugin.rules);
    expect(names).toHaveLength(27);
    // 抽查三层代表规则
    expect(plugin.rules['no-token-modification']).toBeDefined();
    expect(plugin.rules['wc-light-no-style']).toBeDefined();
    expect(plugin.rules['wc-bind-syntax']).toBeDefined();
  });

  it('recommended 配置自洽：所有 aiflow/* 规则都已在 plugin.rules 中声明', () => {
    const { rules } = plugin.configs.recommended;
    expect(plugin.configs.recommended.plugins.aiflow).toBe(plugin);
    for (const key of Object.keys(rules)) {
      expect(key.startsWith('aiflow/')).toBe(true);
      const name = key.slice('aiflow/'.length);
      expect(plugin.rules[name], `recommended 引用了未导出规则 ${name}`).toBeDefined();
    }
  });

  it('端到端：recommended 配置在 Linter 中能检出违规（独立消费路径）', () => {
    const linter = new Linter();
    const messages = linter.verify(
      'const html = `<div class="custom-btn" style="color:red">x</div>`;',
      [{ plugins: { aiflow: plugin }, rules: plugin.configs.recommended.rules }],
      { filename: 'consumer.js' },
    );
    const ids = messages.map((m) => m.ruleId);
    expect(ids).toContain('aiflow/token-whitelist'); // 白名单外 class
    expect(ids).toContain('aiflow/no-inline-style'); // 内联 style
  });

  it('端到端：白名单内 class + 合法代码零报错', () => {
    const linter = new Linter();
    const messages = linter.verify(
      'const html = `<button class="btn btn-sm" disabled>x</button>`;',
      [{ plugins: { aiflow: plugin }, rules: plugin.configs.recommended.rules }],
      { filename: 'consumer.js' },
    );
    expect(messages).toHaveLength(0);
  });
});
