---
'@af-mobile/ui': minor
---

新增 `@af-mobile/ui/test` 测试环境预设（Issue 4，P1）

一个 import 注入 jsdom 缺失的全部浏览器 API 桩，不用每个项目手抄一遍：

```js
// test/setup.js
import '@af-mobile/ui/test';
```

覆盖：matchMedia / `<dialog>` showModal·close / popover API + ToggleEvent / IntersectionObserver
（带 `trigger()` 供主动触发）/ ResizeObserver / requestAnimationFrame / slot assignedElements /
`URL.createObjectURL` / TouchEvent·Touch。

脚手架生成的 `test/setup.js` 现在就是这一行 + 用例间清理；仓库自身的测试环境也改为复用同一份预设，
避免「脚手架模板 / 库内预设 / 仓库自用」三份桩各自漂移。

> 非脚手架项目：把上面那行放进你的 setup 文件，并在 vite.config.js 配
> `test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.js'] }`。
