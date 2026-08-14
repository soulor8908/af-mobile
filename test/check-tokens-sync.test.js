import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCssRules, parseDecls, buildTokensFromCss, buildTokensFromSources } from '../scripts/gen-tokens.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const FIXTURE = `
@layer tokens {
  :root {
    --palette-brand: #2563eb; --palette-muted-bg: #f1f4f8;
    --palette-shadow-sm: 0 1px 2px rgba(0,0,0,.05);
    --palette-color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --palette-brand: #3b82f6;
    }
  }
  :root[data-theme="dark"] {
    --palette-brand: #3b82f6; --palette-color-scheme: dark;
  }
  :root {
    --c-brand: var(--palette-brand);
    --s-1: 4px;
    --t-md: 16px;
    --lh-normal: 1.7;
    --fw-bold: 700;
    --r-m: 8px;
    --shadow-sm: var(--palette-shadow-sm);
    --z-modal: 1100;
    --ease-out: cubic-bezier(.16,1,.3,1);
    --dur-fast: 150ms;
    color-scheme: var(--palette-color-scheme);
  }
}
`;

describe('tokens / parseCssRules', () => {
  it('@ 规则递归展开，返回扁平 rule 列表', () => {
    const rules = parseCssRules(FIXTURE);
    expect(rules.filter(r => r.selector.includes(':root')).length).toBe(4);
    expect(rules.some(r => r.selector.trim() === ':root')).toBe(true);
  });

  it('parseDecls 只提取 -- 自定义属性，忽略普通属性', () => {
    const pub = parseCssRules(FIXTURE).find(r => r.selector.trim() === ':root' && r.decls.some(d => d.name.startsWith('--c-')));
    expect(pub.decls.map(d => d.name)).not.toContain('color-scheme');
    expect(pub.decls.map(d => d.name)).toContain('--c-brand');
  });
});

describe('tokens / buildTokensFromCss（DTCG 映射）', () => {
  const t = buildTokensFromCss(FIXTURE);

  it('palette：light 基准值 + dark 主题扩展', () => {
    expect(t.palette.brand).toEqual({ $type: 'color', $value: '#2563eb' });
    expect(t.palette['shadow-sm'].$value).toBe('0 1px 2px rgba(0,0,0,.05)');
    expect(t.palette['color-scheme']).toEqual({ $type: 'other', $value: 'light' });
    expect(t.palette.$extensions.aiflow.theme.dark.brand).toBe('#3b82f6');
    expect(t.palette.$extensions.aiflow.theme.dark['color-scheme']).toBe('dark');
  });

  it('派生 token：var() 引用转为 DTCG 别名 {group.name}', () => {
    expect(t.color.brand).toEqual({ $type: 'color', $value: '{palette.brand}' });
    expect(t.shadow.sm).toEqual({ $type: 'string', $value: '{palette.shadow-sm}' });
  });

  it('类型映射：number / cubicBezier / duration / dimension', () => {
    expect(t.spacing['1']).toEqual({ $type: 'dimension', $value: '4px' });
    expect(t.typography.lineHeight.normal).toEqual({ $type: 'number', $value: 1.7 });
    expect(t.typography.weight.bold).toEqual({ $type: 'number', $value: 700 });
    expect(t.zIndex.modal).toEqual({ $type: 'number', $value: 1100 });
    expect(t.motion.out).toEqual({ $type: 'cubicBezier', $value: { x1: 0.16, y1: 1, x2: 0.3, y2: 1 } });
    expect(t.motion.duration.fast).toEqual({ $type: 'duration', $value: '150ms' });
  });

  it('结构异常时抛错', () => {
    expect(() => buildTokensFromCss(':root { --c-x: 1px; }')).toThrow(/tokens\.css 结构异常/);
  });
});

describe('tokens / 真实仓库基线', () => {
  const generated = buildTokensFromSources();

  it('tokens.css 生成树与已提交 src/tokens.json 完全一致', () => {
    const committed = readFileSync(join(ROOT, 'packages/ui/src/tokens.json'), 'utf8');
    expect(JSON.stringify(generated, null, 2) + '\n').toBe(committed);
  });

  it('token 组与数量符合预期（58 个叶子 token）', () => {
    const count = (node) => {
      let n = 0;
      for (const [k, v] of Object.entries(node)) {
        if (k === '$extensions') continue;
        if (v && typeof v === 'object' && '$value' in v) n++;
        else if (v && typeof v === 'object') n += count(v);
      }
      return n;
    };
    expect(count(generated)).toBe(58);
    expect(generated.palette).toBeDefined();
    expect(generated.color).toBeDefined();
    expect(generated.spacing).toBeDefined();
    expect(generated.typography).toBeDefined();
    expect(generated.radius).toBeDefined();
    expect(generated.shadow).toBeDefined();
    expect(generated.zIndex).toBeDefined();
    expect(generated.motion).toBeDefined();
  });
});
