// @af-mobile/ui/blocks —— L3.5 Block 子库：业务积木（列表型五态块）
// 入口汇总导出：af-product-card / af-setting-group 组件
// 用法（原生 JS）：
//   import { registerBlocks } from '@af-mobile/ui/blocks';
//   registerBlocks();                   // 注册全部（af-product-card + af-setting-group）
//   registerBlocks('af-product-card');  // 或只注册单个
// pc.* 字典随 af-product-card 模块注册（sg.* 在主库核心 i18n），深路径导入时自行 import 对应组件模块

// ===== gen:entry:start（由 scripts/gen-entry.mjs 自动生成，勿手改；新增组件后跑 npm run entry）
import { AfAuthForm } from './af-auth-form.js';
import { AfOrderList } from './af-order-list.js';
import { AfProductCard } from './af-product-card.js';
import { AfProductGrid } from './af-product-grid.js';
import { AfSettingGroup } from './af-setting-group.js';

export { AfAuthForm, AfOrderList, AfProductCard, AfProductGrid, AfSettingGroup };
// ===== gen:entry:end

// ===== gen:tags:start（由 scripts/gen-entry.mjs 自动生成，勿手改；新增组件后跑 npm run entry）
// 标签 → 类映射（registerBlocks 用）
export const BLOCK_TAGS = {
  'af-auth-form': AfAuthForm,
  'af-order-list': AfOrderList,
  'af-product-card': AfProductCard,
  'af-product-grid': AfProductGrid,
  'af-setting-group': AfSettingGroup,
};
// ===== gen:tags:end

import { defineTags } from '../lib/register-error.js';

// 注册 blocks 组件（幂等，重复调用安全）
// 变参，与主库 register(...tags) 语义一致：registerBlocks('af-product-card', 'af-order-list')；
// 无参注册全部（旧签名 registerBlocks(tag) 单参形式向后兼容）
export function registerBlocks(...tags) {
  defineTags(BLOCK_TAGS, tags);
}
