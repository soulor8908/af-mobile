// @af-mobile/prompt —— Prompt 即 API 薄入口
// 实现打包自 scripts/build-prompt.mjs（单一真相源，esbuild bundle → dist/index.mjs，pkg-publish 设计 §3.6）
// 资产（whitelist/css/template/models）经双候选解析读包内 assets/ 快照
export {
  buildPrompt,
  pickCategories,
  filterFewshots,
  buildComponentTableSection,
  buildWhitelistSection,
  buildProjectExtensionSection,
  extractGroupsFromCss,
  extractProjectExtensions,
} from './dist/index.mjs';
