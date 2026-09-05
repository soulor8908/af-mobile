#!/usr/bin/env bash
# af-mobile UI —— System Prompt 构建器（wrapper，实际逻辑见 build-prompt.mjs）
# 用法：bash scripts/build-prompt.sh [--project PATH] [-o OUT]
set -euo pipefail
# pwd -W：Git Bash 返回 Windows 风格路径（D:/...），原生 node 无法解析 POSIX 的 /d/... 前缀
ROOT="$(cd "$(dirname "$0")/.." && { pwd -W 2>/dev/null || pwd; })"
exec node "$ROOT/scripts/build-prompt.mjs" "$@"
