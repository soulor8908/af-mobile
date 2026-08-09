// AIFlow UI —— demo 站简易 props 调节面板（IP-9）
// 用法：createPropsPanel(container, schema, target)
//   schema: [{ prop, label, type: 'boolean'|'number'|'string'|'select', options?, min?, max?, step? }]
//   target: 组件实例，面板修改 target[prop] 触发重渲染
export function createPropsPanel(container, schema, target, onChange) {
  container.innerHTML = '<h2 class="subtitle">Props 调节</h2>';
  for (const item of schema) {
    const row = document.createElement('div');
    row.className = 'form-row';
    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = item.label;
    row.appendChild(label);

    let input;
    if (item.type === 'boolean') {
      input = document.createElement('button');
      input.className = 'btn btn-sm ' + (target[item.prop] ? 'btn-success' : 'btn-ghost');
      input.textContent = String(target[item.prop]);
      input.addEventListener('click', () => {
        target[item.prop] = !target[item.prop];
        input.textContent = String(target[item.prop]);
        input.className = 'btn btn-sm ' + (target[item.prop] ? 'btn-success' : 'btn-ghost');
        onChange?.(item.prop, target[item.prop]);
      });
    } else if (item.type === 'select') {
      input = document.createElement('select');
      input.className = 'input';
      for (const opt of item.options) {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        if (String(target[item.prop]) === opt) o.selected = true;
        input.appendChild(o);
      }
      input.addEventListener('change', () => {
        target[item.prop] = input.value;
        onChange?.(item.prop, input.value);
      });
    } else {
      input = document.createElement('input');
      input.className = 'input';
      input.type = item.type === 'number' ? 'number' : 'text';
      input.value = target[item.prop] ?? '';
      if (item.min != null) input.min = item.min;
      if (item.max != null) input.max = item.max;
      if (item.step != null) input.step = item.step;
      input.addEventListener('input', () => {
        const v = item.type === 'number' ? Number(input.value) : input.value;
        target[item.prop] = v;
        onChange?.(item.prop, v);
      });
    }
    row.appendChild(input);
    container.appendChild(row);
  }
}
