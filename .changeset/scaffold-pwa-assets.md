---
'@af-mobile/ui': patch
---

脚手架补齐 PWA 配件（G1 消费端交付链 P0）：`create` 生成的工程开箱含 manifest.webmanifest、三张占位图标（192/512/maskable-512）与 favicon.ico，index.html 增加 theme-color / description / og 分享 meta；新增 `--desc` / `--theme` 参数控制插值。图标随包分发于 `assets/icons/`，配套 `npm run scaffold:check` 验证闸门。
