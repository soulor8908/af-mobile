// eslint-plugin-af-mobile 规则测试 —— k 层 3 条（D-001=B 应用层推广配套）
// k-no-bare-and / k-no-object-interpolation / k-for-require-key
// 只对从 k 入口（@af-mobile/ui/k 或仓库内 k/index.js）导入的 html/For 生效
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import bareAnd from '../../eslint-plugin-af-mobile/rules/k-no-bare-and.js';
import objectInterp from '../../eslint-plugin-af-mobile/rules/k-no-object-interpolation.js';
import forKey from '../../eslint-plugin-af-mobile/rules/k-for-require-key.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('af-mobile/k-no-bare-and', () => {
  it('k html`` 子位裸 &&：报 error', () => {
    ruleTester.run('k-no-bare-and', bareAnd, {
      valid: [],
      invalid: [{
        code: 'import { html } from "@af-mobile/ui/k"; const el = html`<div>${cond && html`<b>x</b>`}</div>`;',
        errors: [{ messageId: 'bareAnd' }],
      }],
    });
  });

  it('别名导入（html as h）：同样命中', () => {
    ruleTester.run('k-no-bare-and', bareAnd, {
      valid: [],
      invalid: [{
        code: 'import { html as h } from "@af-mobile/ui/k"; const el = h`<div>${a && b}</div>`;',
        errors: [{ messageId: 'bareAnd' }],
      }],
    });
  });

  it('仓库相对路径导入（k/index.js）：命中', () => {
    ruleTester.run('k-no-bare-and', bareAnd, {
      valid: [],
      invalid: [{
        code: 'import { html } from "../src/k/index.js"; const el = html`<div>${a && b}</div>`;',
        errors: [{ messageId: 'bareAnd' }],
      }],
    });
  });

  it('三元 / Show / 主包 html 的 &&：放行', () => {
    ruleTester.run('k-no-bare-and', bareAnd, {
      valid: [
        { code: 'import { html, Show } from "@af-mobile/ui/k"; const el = html`<div>${cond ? html`<b>x</b>` : null}</div>`;' },
        { code: 'import { html, Show } from "@af-mobile/ui/k"; const el = html`<div>${Show({ when: () => cond, kids: () => html`<b>x</b>` })}</div>`;' },
        // 主包 html``（字符串拼接）语义不同，不受 k 规则约束
        { code: 'import { html } from "@af-mobile/ui"; const s = html`<div>${cond && "<b>x</b>"}</div>`;' },
        // 未从 k 导入 html：不报
        { code: 'const el = html`<div>${cond && x}</div>`;' },
        // || 是合法默认值写法
        { code: 'import { html } from "@af-mobile/ui/k"; const el = html`<div>${name || "anon"}</div>`;' },
      ],
      invalid: [],
    });
  });
});

describe('af-mobile/k-no-object-interpolation', () => {
  it('k html`` 子位对象字面量：报 error', () => {
    ruleTester.run('k-no-object-interpolation', objectInterp, {
      valid: [],
      invalid: [{
        code: 'import { html } from "@af-mobile/ui/k"; const el = html`<div>${{ name: "x" }}</div>`;',
        errors: [{ messageId: 'objectInterpolation' }],
      }],
    });
  });

  it('主包 { raw } 幻觉写法在 k：报 error（子位与属性位）', () => {
    ruleTester.run('k-no-object-interpolation', objectInterp, {
      valid: [],
      invalid: [{
        code: 'import { html } from "@af-mobile/ui/k"; const a = html`<p>${{ raw: "<b>x</b>" }}</p>`; const b = html`<a title=${{ raw: "t" }}></a>`;',
        errors: [
          { messageId: 'objectInterpolation' },
          { messageId: 'objectInterpolation' },
        ],
      }],
    });
  });

  it('数组字面量 / JSON.stringify / 主包 { raw }：放行', () => {
    ruleTester.run('k-no-object-interpolation', objectInterp, {
      valid: [
        // 数组在 k 子位合法（bindKids 展开为多节点）
        { code: 'import { html } from "@af-mobile/ui/k"; const el = html`<ul>${[html`<li>1</li>`, html`<li>2</li>`]}</ul>`;' },
        { code: 'import { html } from "@af-mobile/ui/k"; const el = html`<pre>${JSON.stringify(cfg)}</pre>`;' },
        // 主包 html`` 的 { raw } 是合法语法
        { code: 'import { html } from "@af-mobile/ui"; const s = html`<div>${{ raw: "<b>x</b>" }}</div>`;' },
      ],
      invalid: [],
    });
  });
});

describe('af-mobile/k-for-require-key', () => {
  it('For 缺 key：报 warn', () => {
    ruleTester.run('k-for-require-key', forKey, {
      valid: [],
      invalid: [{
        code: 'import { For, html } from "@af-mobile/ui/k"; const el = For({ each: () => rows(), kids: (r) => html`<li>${r.t}</li>` });',
        errors: [{ messageId: 'forKeyMissing' }],
      }],
    });
  });

  it('别名导入（For as List）缺 key：同样命中', () => {
    ruleTester.run('k-for-require-key', forKey, {
      valid: [],
      invalid: [{
        code: 'import { For as List } from "@af-mobile/ui/k"; const el = List({ each: () => rows(), kids });',
        errors: [{ messageId: 'forKeyMissing' }],
      }],
    });
  });

  it('显式 key / 字符串 key / 非 k 的 For：放行', () => {
    ruleTester.run('k-for-require-key', forKey, {
      valid: [
        { code: 'import { For, html } from "@af-mobile/ui/k"; const el = For({ each: () => rows(), key: "id", kids: (r) => html`<li>${r.t}</li>` });' },
        { code: 'import { For, html } from "@af-mobile/ui/k"; const el = For({ each: () => rows(), "key": "id", kids });' },
        // 未从 k 导入的 For（本地函数）：不报
        { code: 'function For(opts) { return opts; } const el = For({ each: () => rows(), kids });' },
      ],
      invalid: [],
    });
  });
});
