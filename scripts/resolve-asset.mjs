// af-mobile —— 包资产双候选解析器（pkg-publish 设计 §3.1）
// 同一份逻辑两种环境：开发态（仓库源码）命中仓库布局；发布态（esbuild 打包进 <pkg>/dist）命中包内 assets 快照。
// repoRel: 仓库根相对路径（如 'src/recipes.css'）
// 快照落盘规则：basename 平铺（'a/utils/x.json' → '<pkg>/assets/x.json'），目录保留层级（'prompt/models' → '<pkg>/assets/models'）
import { existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const UP = resolve(SELF_DIR, '..'); // 开发态：scripts/ → 仓库根；打包态：<pkg>/dist → <pkg>/

export function resolveAsset(repoRel) {
  const flat = repoRel.includes('/') && !/\.(css|json|md|mjs|js)$/.test(repoRel)
    ? repoRel.split('/').pop() // 无扩展名的目录路径（如 'prompt/models'）→ 取末段
    : basename(repoRel);
  const candidates = [
    process.env.AFMOBILE_ASSETS_DIR ? join(process.env.AFMOBILE_ASSETS_DIR, flat) : null,
    join(UP, repoRel),                    // ① 仓库布局（开发态）
    join(UP, 'assets', flat),             // ② 包内快照（发布态）
  ].filter(Boolean);
  return candidates.find(c => existsSync(c)) || candidates[1]; // 全 miss 返回 ① 保持原报错行为
}
