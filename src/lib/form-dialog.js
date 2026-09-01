// af-mobile UI —— 表单对话框 helper（OPT-2，无组件方案）
// openFormDialog({ title, schema, onSubmit })：JSON Schema（defineTool parameters 同构）→ af-dialog 表单，
// 消费端 1 行调用替代 ~60 行手写 af-dialog + af-field 拼装；required/number 校验 + 错误回显内置。
// 复用既有组件（af-dialog/af-field 仍需 register），校验样式收敛在 .input:user-invalid / .form-err。
// tree-shaking 友好：不用不付费（独立预算，见 scripts/size-check.mjs）
import { escapeHtml as esc } from './html.js';

// schema 单字段 → af-field HTML（enum 走 slot="input" 原生 select）
function fieldHTML(key, p) {
  const label = p.title || key;
  const help = p.description ? ` help="${esc(p.description)}"` : '';
  if (p.enum) {
    const opts = p.enum.map((o) => {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(v)}">${esc(l)}</option>`;
    }).join('');
    return `<af-field data-key="${esc(key)}" label="${esc(label)}"${help}><select class="input" slot="input">${opts}</select></af-field>`;
  }
  const attrs = [`data-key="${esc(key)}"`, `label="${esc(label)}"`];
  if (p.format === 'textarea') {
    attrs.push('type="textarea"');
  } else {
    attrs.push(`input-type="${p.type === 'number' ? 'number' : (p.format === 'password' ? 'password' : 'text')}"`);
  }
  if (p.default != null) attrs.push(`value="${esc(p.default)}"`);
  return `<af-field ${attrs.join(' ')}${help}></af-field>`;
}

/**
 * 打开 schema 驱动的表单对话框
 * @param {Object} opts
 * @param {string} [opts.title] 对话框标题
 * @param {Object} opts.schema JSON Schema 子集（与 defineTool 的 parameters 同构）：
 *   { properties: { [key]: { type: 'string'|'number', title?, description?, default?,
 *                           enum?: Array<value|[value,label]>, format?: 'password'|'textarea' } },
 *     required?: string[] }
 *   format:'textarea' 时渲染 textarea；enum 优先于 type
 * @param {string} [opts.submitText] 确认按钮文案（默认 '确定'）
 * @param {string} [opts.cancelText] 取消按钮文案（默认 '取消'）
 * @param {string} [opts.requiredText] 必填校验文案（默认 '必填'；i18n 请随语言传入）
 * @param {string} [opts.numberText] 数字校验文案（默认 '请输入数字'）
 * @param {(values: Object) => (boolean|void|Promise<boolean|void>)} [opts.onSubmit]
 *   提交回调：返回 false 阻止关闭（如校验失败），否则关闭对话框
 * @returns {HTMLElement} af-dialog 元素（已挂到 body 并打开）
 */
export function openFormDialog(opts = {}) {
  const AfDialog = customElements.get('af-dialog');
  const AfField = customElements.get('af-field');
  if (!AfDialog || !AfField) {
    throw new Error('[af-mobile] openFormDialog 需先注册 af-dialog 与 af-field：register("af-dialog", "af-field")');
  }
  const {
    title = '', schema = {}, submitText = '确定', cancelText = '取消',
    requiredText = '必填', numberText = '请输入数字', onSubmit,
  } = opts;
  const { properties = {}, required = [] } = schema;
  const keys = Object.keys(properties);

  const dialog = new AfDialog();
  dialog.title = title;
  const body = document.createElement('div');
  body.setAttribute('slot', 'body');
  body.innerHTML = keys.map((k) => fieldHTML(k, properties[k] || {})).join('');
  const footer = document.createElement('div');
  footer.setAttribute('slot', 'footer');
  footer.className = 'actions';
  footer.innerHTML = `<button class="btn btn-ghost" data-role="cancel" type="button">${esc(cancelText)}</button><button class="btn" data-role="submit" type="button">${esc(submitText)}</button>`;
  dialog.append(body, footer);
  document.body.appendChild(dialog);

  const fieldOf = (k) => body.querySelector(`af-field[data-key="${k}"]`);
  // 收集 + 校验：number 走 Number 归一，required 空串拦截；全部通过返回 values，否则 null
  const collect = () => {
    const values = {};
    for (const k of keys) {
      const p = properties[k] || {};
      const f = fieldOf(k);
      let v = p.enum ? f.querySelector('select')?.value ?? '' : f.value;
      if (v === '' && required.includes(k)) { f.setError(requiredText); return null; }
      if (p.type === 'number' && v !== '') {
        if (Number.isNaN(Number(v))) { f.setError(numberText); return null; }
        v = Number(v);
      }
      f.setError('');
      values[k] = v;
    }
    return values;
  };

  const close = (action) => dialog.close(action);
  footer.addEventListener('click', (e) => {
    const role = e.target.closest('[data-role]')?.dataset.role;
    if (role === 'cancel') close('cancel');
    if (role === 'submit') {
      const values = collect();
      if (!values) return;
      Promise.resolve(onSubmit ? onSubmit(values) : null).then((ret) => {
        if (ret !== false) close('submit');
      }).catch(() => { /* 提交异常保持打开，由消费端决定重试/提示 */ });
    }
  });
  dialog.addEventListener('af-dialog:close', () => dialog.remove());

  dialog.open();
  return dialog;
}
