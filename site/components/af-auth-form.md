# af-auth-form

> blocks 子库 · L3.5 登录/注册表单块（phone-code 验证码 / password 密码，内置校验 + 发送验证码倒计时）

## 在线调试

<iframe src="../demo/playground/index.html?c=af-auth-form" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 验证码登录

```js
import { registerBlocks } from '@af-mobile/ui/blocks';

registerBlocks('af-auth-form');
```

```html
<af-auth-form title="欢迎回来" subtitle="请输入手机号登录"></af-auth-form>
```

```js
const form = document.querySelector('af-auth-form');
form.addEventListener('af-auth-form:sendcode', async (e) => {
  await fetch('/api/sms?phone=' + e.detail.phone);
});
form.addEventListener('af-auth-form:submit', async (e) => {
  form.loading = true;
  try {
    await login(e.detail.phone, e.detail.code);
  } catch (err) {
    form.setError(err); // 错误写入 form-err 区，输入值保留
  } finally {
    form.loading = false;
  }
});
```

### 密码注册（variant=password）

```html
<af-auth-form variant="password" title="注册账号" submit-text="注册"></af-auth-form>
```

密码变体内置：手机号/密码/确认密码三行 + 协议勾选行；提交前校验两次密码一致性与协议勾选。

## 内置交互（库作者预写，页面零 JS）

- **提交校验**：空值 / 两次密码不一致 / 未勾选协议 → `form-err` 错误区 + `input-err` 红框 + 聚焦首个错误项；输入即清除
- **发送验证码倒计时**：点击后按钮禁用 60s 并显示秒数，`unmounted` 自动清理定时器
- **loading 态**：命令式切换（按钮禁用 + spinner + aria-busy），**不重渲染**，用户已输入的值保留

## API

### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| variant | `'phone-code' \| 'password'` | 'phone-code' | 验证码登录 / 密码注册 |
| title | `string` | '' | 标题（兼作 aria-label 回退） |
| subtitle | `string` | '' | 副标题 |
| submitText | `string` | '' | 提交按钮文案（空则走 i18n：登录/Sign in） |
| loading | `boolean` | false | 提交中（按钮禁用 + spinner + aria-busy） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-auth-form:sendcode` | 点击发送验证码（内部已校验手机号非空），detail: `{ phone }` |
| `af-auth-form:submit` | 校验通过后提交，detail: `{ phone, code }` 或 `{ phone, password, confirm }` |

### 方法

| 签名 | 说明 |
| --- | --- |
| `setError(err: unknown): void` | 外部提交失败写入错误区（不清输入值） |

## 无障碍

- 表单值不落 DOM 属性：内部 input 读取，经事件外发（防 XSS 面）
- 错误区 `role="alert"`；输入 placeholder 走 i18n（`au.*` 字典随模块注册，zh-CN / en-US）
- 原生 form 提交：输入框内 Enter 即提交；autocomplete 语义标注（tel / one-time-code / new-password）
