// af-mobile UI —— 注册 API 的统一错误构造（零依赖）
// 四个注册入口（主库 register / chat / charts / blocks）共用同一文案与错误前缀，
// 避免「同一个错误四种说法」—— AI 与用户只需认一条：`unknown component` + 可用标签清单。

/**
 * 未知组件标签的统一错误
 * @param {string} tag 传入的错误标签
 * @param {string[]} validTags 该入口支持的标签清单
 * @returns {Error}
 */
export function unknownTagError(tag, validTags) {
  return new Error(`[@af-mobile/ui] unknown component: ${tag}（可用标签：${validTags.join(', ')}）`);
}

/**
 * 变参注册的统一实现：无参 = 该入口全量注册，有参 = 只注册指定标签
 * （与主库 register(...tags) 同语义；主库另需保留动态 import 分包能力，故不共用此实现）
 * @param {Record<string, CustomElementConstructor>} map 标签 → 构造器映射
 * @param {string[]} tags 调用方传入的标签
 */
export function defineTags(map, tags) {
  const list = tags.length ? tags : Object.keys(map);
  for (const tag of list) {
    const C = map[tag];
    if (!C) throw unknownTagError(tag, Object.keys(map));
    if (!customElements.get(tag)) customElements.define(tag, C);
  }
}
