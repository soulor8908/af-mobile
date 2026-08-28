// eval/steps.mjs —— 交互断言 steps DSL 纯函数（执行器在 visual.mjs，本文件只做校验与错误格式化，便于单测）
export const STEP_ACTIONS = ['click', 'fill', 'pressKey', 'scroll', 'waitFor'];

// 每个 action 的必填字段
const REQUIRED = {
  click: ['sel'],
  fill: ['sel', 'value'],
  pressKey: ['sel', 'key'],
  scroll: [],            // sel/top 均可选：缺省滚 window
  waitFor: ['sel'],
};

export function validateSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) throw new Error('steps 必须是非空数组');
  steps.forEach((s) => {
    if (!s || !STEP_ACTIONS.includes(s.action)) throw new Error(`未知 action: ${s && s.action}`);
    for (const f of REQUIRED[s.action]) {
      if (s[f] === undefined) throw new Error(`action=${s.action} 缺少必填字段 ${f}`);
    }
  });
}

export function formatStepError(index, step, err) {
  const sel = step.sel ? ` "${step.sel}"` : '';
  const reason = String(err && err.message ? err.message : err).split('\n')[0];
  return `step#${index + 1} ${step.action}${sel} → ${reason}`;
}
