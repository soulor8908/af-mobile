---
'@af-mobile/ui': patch
---

deploy 新增 IGA provider（D-016）：`af-mobile deploy --provider iga`（首次指定后持久化到 .af-mobile/deploy.json），doctor 增加 iga CLI/登录态检查、国内引导与 env 提示差异化；supabase target 可落 IGA Pages，Workers 全栈仍仅 Cloudflare
