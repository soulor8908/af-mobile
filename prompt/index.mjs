// @aiflow-ui/prompt —— Prompt 即 API 薄入口
// 核心实现位于 scripts/build-prompt.mjs（避免双份代码漂移）
export {
  buildPrompt,
  pickCategories,
  filterFewshots,
  buildComponentTableSection,
  buildWhitelistSection,
  buildProjectExtensionSection,
  extractGroupsFromCss,
  extractProjectExtensions,
} from '../scripts/build-prompt.mjs';
