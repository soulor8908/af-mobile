// L2-9 af-mobile/no-af-pierce（error，OPT-5）
// 禁止消费端代码穿透 af-* 组件内部节点——"写了也不生效"的静默错误：
//   Shadow DOM 组件（af-dialog 等）：内部节点不可达，选择器纯死代码且不报错；
//   Light DOM 组件（af-tabbar 等）：内部 class/结构是实现细节，无稳定性承诺，升级即碎。
// 检测点（选择器语境字符串）：
//   字符串字面量 / 模板串中的穿透选择器（覆盖 querySelector 参数与页面 innerHTML 内嵌 <style> 段）
// 修正：Shadow 组件用 ::part() 官方扩展点或 CSS 变量（var(--*)）；Light 组件用白名单 class 组合
// 官方扩展点现状：af-dialog 暴露 part="dialog/header/close/content/footer"；其余组件用 var(--*) 定制
// 允许（不报）：af-xxx[attr] / af-xxx:hover / af-xxx::part(x)（宿主自身层，非穿透）
// 穿透段限定为选择器起始符（. # [ * :），避免把 HTML 标签的换行属性（<af-dialog\n title="x">）误判为后代选择器
const PIERCE_RE = /(?:^|[\s,>+~(])af-[a-z0-9-]+(?:\[[^\]]*\]|:[a-zA-Z-]+(?:\([^)]*\))?|::[a-zA-Z-]+(?:\([^)]*\))?|\.[-\w]+)*[ \t]+[.#[*:]/;

function checkString(str, node, report) {
  const m = PIERCE_RE.exec(str);
  if (m) report(node, m[0].trim());
}

export default {
  meta: {
    type: 'problem',
    docs: { description: '禁止穿透 af-* 组件内部节点（Shadow 内不可达 = 死代码，Light 内部无稳定性承诺）' },
    schema: [],
    messages: {
      pierce: "Selector '{{sel}}' pierces af-* internals — Shadow DOM makes it dead code, Light DOM internals have no stability promise. Use ::part() / CSS variables for Shadow components, whitelist classes for Light DOM",
    },
  },
  create(context) {
    const report = (node, sel) => context.report({ node, messageId: 'pierce', data: { sel } });
    return {
      // 字符串字面量与模板串统一扫描（querySelector 参数、innerHTML 内嵌 style 段一并覆盖）
      Literal(node) {
        if (typeof node.value === 'string') checkString(node.value, node, report);
      },
      TemplateElement(node) {
        if (node.value?.raw) checkString(node.value.raw, node, report);
      },
    };
  },
};
