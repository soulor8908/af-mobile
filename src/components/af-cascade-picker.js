// af-mobile UI —— af-cascade-picker：级联选择器
// 复用 af-picker 滚轮内核（scroll-snap + 键盘 + 焦点管理 + 确认/取消）
// 职责：tree 树形数据 + 列间级联重建（某列变更后重置其下各列，失效值回退首项）
import { AfElement } from '../lib/af-element.js';
import { AfPicker } from './af-picker.js';

// 纯函数：从 tree + values 构建级联列；缺失/失效层回退到首项
function cascade(tree, values) {
  const columns = [];
  const vals = [];
  let opts = tree;
  for (let c = 0; opts && opts.length; c++) {
    columns.push(opts);
    const node = opts.find(o => o.value === values?.[c]) || opts[0];
    vals.push(node.value);
    opts = node.children;
  }
  return { columns, values: vals };
}

export class AfCascadePicker extends AfPicker {
  mounted() {
    super.mounted();
    this._onChange = (e) => {
      if (e.detail?.column == null) return;
      this._rebuild();
    };
    this._listen(this, 'af-picker:change', this._onChange);
    this._rebuild();
  }

  _rebuild() {
    if (!this.tree || !this.tree.length) return;
    const { columns, values } = cascade(this.tree, this.values);
    // 先更新 values 再更新 columns：columns 触发 _renderColumns 重渲染时，active 类按新 values 计算
    this.values = values;
    this.columns = columns;
  }

  onAttributeChange(name, oldVal, newVal) {
    if (name === 'tree') { this._rebuild(); return; }
    super.onAttributeChange(name, oldVal, newVal);
  }
}

AfElement.defineProp(AfCascadePicker.prototype, 'tree', []);
