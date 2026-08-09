#!/usr/bin/env bash
# AIFlow UI —— System Prompt 构建器（wrapper，实际逻辑见 build-prompt.mjs）
# 用法：bash scripts/build-prompt.sh [--project PATH] [-o OUT]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/scripts/build-prompt.mjs" "$@"
