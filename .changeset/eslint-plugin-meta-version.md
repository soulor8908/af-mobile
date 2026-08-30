---
'@af-mobile/eslint-plugin': patch
---

修正 `meta.version` 与 package.json 漂移（2.1.0 → 2.2.0）

changesets 只 bump package.json，插件入口里硬编码的 `meta.version` 需手工跟随。
漂移导致 `test/eslint-plugin/package-validate.test.js` 断言失败。
