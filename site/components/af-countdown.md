# af-countdown 倒计时
<!-- gen:start:scenarios -->
## 示例

<!-- 无 Playground 场景（可补充 demo/scenarios/af-<tag>.js） -->
<!-- gen:end:scenarios -->
<!-- gen:start:props -->
## API

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| time | `number` | 总时长（秒） |
| autostart | `boolean` | 挂载后自动开始 |
| status *(readonly)* | `number` | HTTP 状态码错误（非 2xx） |
| url *(readonly)* | `string` |  |
| body *(readonly)* | `string \| null` |  |
| outlet | `HTMLElement` | 路由 handler 上下文 |
| signal | `AbortSignal` |  |
| go | `(path: string, options?: { replace?: boolean` |  |
| default | `RouteHandler` | 路由懒加载模块：default 为渲染函数，可选 meta 并入路由 |
| to | `{ path: string` | 滚动位置：{x,y} 坐标 \| {el,top} 元素 \| false 禁止滚动（仿 Vue Router） |
| from | `{ path: string` |  |
| savedPosition | `{ x: number` |  |
| state | `Record<string, unknown>` | createPage 返回的页面实例 |
| derived | `Record<string, unknown>` |  |
| refs | `Record<string, unknown>` | setup 返回值 |
| transition | `unknown` |  |
| keepAlive | `boolean` |  |
<!-- gen:end:props -->
<!-- gen:start:events -->
| 事件名 | 说明 |
| --- | --- |
| `af-countdown:change` |  |
| `af-countdown:end` |  |
<!-- gen:end:events -->
<!-- gen:start:methods -->
| 方法 | 签名 |
| --- | --- |
| `start` | `start(): void` |
| `pause` | `pause(): void` |
| `reset` | `reset(): void` |
| `get` | `get(url: string): { data: unknown; expiry: number } \| undefined` |
| `set` | `set(url: string, entry: { data: unknown; expiry: number }): void` |
| `delete` | `delete(url: string): void` |
| `clear` | `clear(): void` |
| `mount` | `mount(root: HTMLElement): void` |
| `unmount` | `unmount(): void` |
<!-- gen:end:methods -->
