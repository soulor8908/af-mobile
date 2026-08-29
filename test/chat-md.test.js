import { describe, it, expect } from 'vitest';
import { md } from '../src/chat/lib/md.js';

describe('chat md 安全子集渲染', () => {
  it('原生 h1-h3 标题（# 无空格不误判，todo #标签 场景）', () => {
    expect(md('# 标题')).toContain('<h1>标题</h1>');
    expect(md('## 二级')).toContain('<h2>二级</h2>');
    expect(md('### 三级')).toContain('<h3>三级</h3>');
    expect(md('#生活')).toBe('#生活');
  });

  it('无序列表分组（含缩进行）', () => {
    expect(md('- 项目一\n- 项目二')).toBe('<ul><li>项目一</li><li>项目二</li></ul>');
    expect(md('  - 缩进项')).toContain('<ul><li>缩进项</li></ul>');
  });

  it('有序列表分组（数字标记优先于 -/*）', () => {
    expect(md('1. 有序一\n2. 有序二')).toBe('<ol><li>有序一</li><li>有序二</li></ol>');
    expect(md('- a\n1. b')).toBe('<ol><li>a</li><li>b</li></ol>');   // 混合标记合并（已知取舍）
  });

  it('行内语法：粗体/斜体/行内码', () => {
    const out = md('**加粗** 与 *斜体* 及 `行内码`');
    expect(out).toContain('<strong>加粗</strong>');
    expect(out).toContain('<em>斜体</em>');
    expect(out).toContain('<code>行内码</code>');
  });

  it('链接：免引号属性 + 固定 target/rel；非 http(s) 不生成 a 标签', () => {
    const out = md('[链接](https://x.com/a?b=1&c=2)');
    expect(out).toBe('<a href=https://x.com/a?b=1&amp;c=2 target=_blank rel=noopener>链接</a>');
    expect(md('[x](javascript:alert(1))')).not.toContain('<a');
  });

  it('代码块：转义 + 复制钮 + 占位符无残留；围栏内语法不误伤', () => {
    const out = md('```js\nconst a = "<b>&\'";\n- 不是列表\n# 也不是标题\n```');
    expect(out).toContain('<div class=cd><pre>const a = &quot;&lt;b&gt;&amp;&#39;&quot;;\n- 不是列表\n# 也不是标题</pre>');
    expect(out).toContain('<button class=cc data-copy></button>');
    expect(out).not.toContain('<li>');
    expect(out).not.toContain('<h1>');
    expect(out).not.toContain('\x00');
  });

  it('XSS：文本/围栏内容全部转义，无存活 script/img', () => {
    const out = md('尾段 <script>alert(1)</script> 和 <img onerror=alert(1)>\n```\n<x>\n```');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(out).toContain('&lt;x&gt;');
  });

  it('未闭合围栏（流式中）原样透出，闭合后成形', () => {
    expect(md('para\n```js\nconst')).toContain('```js');
    expect(md('para\n```js\nconst\n```')).toContain('<div class=cd><pre>const</pre>');
  });

  it('纯文本/空输入原样（pre-wrap 换行不生成 <p>）', () => {
    expect(md('just text')).toBe('just text');
    expect(md('')).toBe('');
    expect(md('一\n二')).toBe('一\n二');
  });
});
