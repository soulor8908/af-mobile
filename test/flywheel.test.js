// 数据飞轮 v2 —— 分析层测试（多源摄取 / 挖掘 / 加权 / 缺口 / 报告）
import { describe, it, expect } from 'vitest';
import {
  legacyRawToEvents, parseSince, analyze, renderReport, generatePrDraft,
  mineWhitelistCandidates, mineArbitraryValues,
} from '../eval/flywheel.mjs';

// 构造测试事件（消息文本为纯 prose，不含属性字面量）
function ev(source, tool, violations, opts = {}) {
  return {
    v: 1,
    ts: opts.ts || new Date().toISOString(),
    source, tool,
    file: opts.file || 'f.html',
    passed: violations.length === 0,
    violations: violations.map(v => ({ rule: v.rule, severity: 'error', line: 1, message: v.message })),
  };
}

describe('flywheel / legacyRawToEvents（旧 eval 结果适配）', () => {
  it('raw-*.json 条目 → source=eval / tool=self-llm 事件', () => {
    const events = legacyRawToEvents([{
      id: '001',
      attempts: [{ ok: false, lastErrors: [{ rule: 'aiflow/no-inline-style', message: 'x', line: 2 }] }],
    }]);
    expect(events).toHaveLength(1);
    expect(events[0].source).toBe('eval');
    expect(events[0].tool).toBe('self-llm');
    expect(events[0].file).toBe('eval:001');
    expect(events[0].violations[0].rule).toBe('aiflow/no-inline-style');
  });
});

describe('flywheel / parseSince', () => {
  it('支持 Nd / Nh / ISO', () => {
    expect(parseSince('30d')).toBeLessThanOrEqual(Date.now() - 29 * 86400000);
    expect(parseSince('12h')).toBeLessThanOrEqual(Date.now() - 11 * 3600000);
    expect(parseSince('2026-01-01T00:00:00Z')).toBe(Date.parse('2026-01-01T00:00:00Z'));
    expect(parseSince('garbage')).toBe(0);
    expect(parseSince('')).toBe(0);
  });
});

describe('flywheel / 挖掘器', () => {
  it('白名单候选：class / component 分开排名', () => {
    const events = [
      ev('mcp', 'trae-code', [
        { rule: 'aiflow/token-whitelist', message: "Class 'card-wrap' not in whitelist. Use recipe" },
        { rule: 'aiflow/token-whitelist', message: "Class 'card-wrap' not in whitelist. Use recipe" },
        { rule: 'aiflow/token-whitelist', message: "Component 'my-widget' not in whitelist. Register" },
      ]),
    ];
    const r = mineWhitelistCandidates(events);
    expect(r.classes[0]).toEqual({ name: 'card-wrap', count: 2 });
    expect(r.components[0]).toEqual({ name: 'my-widget', count: 1 });
  });

  it('任意值挖掘：只认 no-arbitrary-value 规则', () => {
    const events = [
      ev('cli', 'unknown', [
        { rule: 'aiflow/no-arbitrary-value', message: "'p-13' out of range (0/1/2/3/4/5/6/8/10); use closest atomic" },
        { rule: 'aiflow/no-arbitrary-value', message: "'p-[13px]' arbitrary value syntax forbidden" },
        { rule: 'aiflow/token-whitelist', message: "'p-13' unrelated" },
      ]),
    ];
    const r = mineArbitraryValues(events);
    expect(r).toHaveLength(2);
    expect(r.find(x => x.name === 'p-13').count).toBe(1);
  });
});

describe('flywheel / analyze', () => {
  it('加权聚合 + 来源/工具分解：mcp ×3 > eval ×1', async () => {
    const events = [
      ev('mcp', 'trae-code', [{ rule: 'aiflow/token-whitelist', message: 'x' }]),
      ev('eval', 'self-llm', [
        { rule: 'aiflow/token-whitelist', message: 'x' },
        { rule: 'aiflow/token-whitelist', message: 'x' },
      ]),
    ];
    const a = await analyze(events);
    const tw = a.perRule.find(r => r.rule === 'aiflow/token-whitelist');
    expect(tw.count).toBe(3);
    expect(tw.weighted).toBe(1 * 3 + 2 * 1);
    expect(tw.bySource).toEqual({ mcp: 1, eval: 2 });
    expect(tw.byTool).toEqual({ 'trae-code': 1, 'self-llm': 2 });
  });

  it('收敛度：只统计 source=mcp，按 tool 分组', async () => {
    const events = [
      ev('mcp', 'trae-code', []),
      ev('mcp', 'trae-code', [{ rule: 'r', message: 'x' }]),
      ev('cli', 'unknown', [{ rule: 'r', message: 'x' }]),
    ];
    const a = await analyze(events);
    expect(a.convergence['trae-code']).toEqual({ runs: 2, passed: 1 });
    expect(a.convergence.unknown).toBeUndefined();
  });

  it('RULE_HINTS 缺口：高频（≥3）且无提示的规则入选', async () => {
    const events = [
      ev('cli', 'unknown', [{ rule: 'aiflow/no-register-all', message: 'x' }]),
      ev('cli', 'unknown', [{ rule: 'aiflow/no-register-all', message: 'x' }]),
      ev('cli', 'unknown', [{ rule: 'aiflow/no-register-all', message: 'x' }]),
      // 有 hints 的规则不入选
      ev('cli', 'unknown', [
        { rule: 'aiflow/no-inline-style', message: 'x' },
        { rule: 'aiflow/no-inline-style', message: 'x' },
        { rule: 'aiflow/no-inline-style', message: 'x' },
      ]),
    ];
    const a = await analyze(events);
    expect(a.hintsGap).toContain('aiflow/no-register-all');
    expect(a.hintsGap).not.toContain('aiflow/no-inline-style');
  });

  it('--since 过滤旧事件', async () => {
    const oldTs = new Date(Date.now() - 40 * 86400000).toISOString();
    const events = [
      ev('cli', 'unknown', [{ rule: 'aiflow/token-whitelist', message: 'x' }], { ts: oldTs }),
      ev('cli', 'unknown', [{ rule: 'aiflow/no-inline-style', message: 'x' }]),
    ];
    const a = await analyze(events, { since: '30d' });
    expect(a.total).toBe(1);
    expect(a.perRule.map(r => r.rule)).toEqual(['aiflow/no-inline-style']);
  });

  it('fixableCoverage 标注高频规则可否 autofix', async () => {
    const events = [ev('cli', 'unknown', [{ rule: 'aiflow/no-inline-style', message: 'x' }])];
    const a = await analyze(events);
    const f = a.fixableCoverage.find(x => x.rule === 'aiflow/no-inline-style');
    expect(f).toBeTruthy();
    expect(typeof f.fixable).toBe('boolean');
  });
});

describe('flywheel / renderReport', () => {
  it('空数据给出喂数据指引', () => {
    const md = renderReport({ total: 0, perRule: [], whitelistCandidates: { classes: [], components: [] }, arbitraryValues: [], hintsGap: [], fixableCoverage: [], convergence: {} });
    expect(md).toContain('飞轮暂无输入');
  });

  it('完整报告含规则榜 / 白名单候选 / 修改清单', () => {
    const events = [
      ev('mcp', 'trae-code', [{ rule: 'aiflow/token-whitelist', message: "Class 'card-wrap' not in whitelist. Use recipe" }]),
      ev('eval', 'self-llm', [{ rule: 'aiflow/no-inline-style', message: 'x' }]),
    ];
    return analyze(events).then(a => {
      const md = renderReport(a, { threshold: 0.2 });
      expect(md).toContain('规则榜');
      expect(md).toContain('白名单候选');
      expect(md).toContain('card-wrap');
      expect(md).toContain('收敛度');
    });
  });
});

describe('flywheel / generatePrDraft（v1 兼容）', () => {
  it('旧 API 不变：超阈值规则产出 PR 草稿', () => {
    const results = [
      { attempts: [{ lastErrors: [{ rule: 'aiflow/no-inline-style', message: 'x', line: 1 }] }] },
      { attempts: [{ lastErrors: [{ rule: 'aiflow/no-inline-style', message: 'x', line: 1 }] }] },
      { attempts: [{ lastErrors: [] }] },
    ];
    const r = generatePrDraft(results, { threshold: 0.5 });
    expect(r.hasFindings).toBe(true);
    expect(r.findings[0].rule).toBe('aiflow/no-inline-style');
    expect(r.prDraft).toContain('建议的修改清单');
  });

  it('低于阈值返回 hasFindings=false', () => {
    const results = [
      { attempts: [{ lastErrors: [{ rule: 'aiflow/no-inline-style', message: 'x', line: 1 }] }] },
      { attempts: [{ lastErrors: [] }] },
    ];
    const r = generatePrDraft(results, { threshold: 0.9 });
    expect(r.hasFindings).toBe(false);
  });
});
