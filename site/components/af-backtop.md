# af-backtop

> P2 · 回到顶部

## 在线调试

<iframe src="../demo/playground/index.html?c=af-backtop" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 滚动出现

```html
<style>
          #bt-wrap { position: relative; }
          #bt-wrap af-backtop { position: absolute; right: 8px; bottom: 8px; }
        </style>
        <div class="card">
          <p class="caption">向下滚动下方区域，右下角出现回到顶部按钮。</p>
        </div>
        <div id="bt-wrap">
          <div id="scroller" style="height:320px;overflow:auto;border:1px solid var(--c-border);border-radius:var(--r-m)">
            <div style="padding:12px">
              <p class="body" style="margin:12px 0">占位内容 1</p><p class="body" style="margin:12px 0">占位内容 2</p><p class="body" style="margin:12px 0">占位内容 3</p><p class="body" style="margin:12px 0">占位内容 4</p><p class="body" style="margin:12px 0">占位内容 5</p><p class="body" style="margin:12px 0">占位内容 6</p><p class="body" style="margin:12px 0">占位内容 7</p><p class="body" style="margin:12px 0">占位内容 8</p><p class="body" style="margin:12px 0">占位内容 9</p><p class="body" style="margin:12px 0">占位内容 10</p><p class="body" style="margin:12px 0">占位内容 11</p><p class="body" style="margin:12px 0">占位内容 12</p><p class="body" style="margin:12px 0">占位内容 13</p><p class="body" style="margin:12px 0">占位内容 14</p><p class="body" style="margin:12px 0">占位内容 15</p><p class="body" style="margin:12px 0">占位内容 16</p><p class="body" style="margin:12px 0">占位内容 17</p><p class="body" style="margin:12px 0">占位内容 18</p><p class="body" style="margin:12px 0">占位内容 19</p><p class="body" style="margin:12px 0">占位内容 20</p><p class="body" style="margin:12px 0">占位内容 21</p><p class="body" style="margin:12px 0">占位内容 22</p><p class="body" style="margin:12px 0">占位内容 23</p><p class="body" style="margin:12px 0">占位内容 24</p>
            </div>
          </div>
          <af-backtop id="bt" target="#scroller" threshold="120" text="↑"></af-backtop>
        </div>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| threshold | `number` | 200 | 出现阈值（scroll 距离 px） |
| target | `string` | '' | 滚动目标选择器（默认 window） |
| text | `string` | '↑' | 按钮文案 |
| ariaLabelText | `string` | null | aria-label 文案 |
| position | `'left-bottom' \| 'right-bottom'` | 'right-bottom' | 位置（left-bottom/right-bottom） |
| visible *(readonly)* | `boolean` |  | 是否可见（只读） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-backtop:click` | 触发时：组件内 emit 调用 |
| `af-backtop:show` | 触发时：组件内 emit 调用 |
| `af-backtop:hide` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `scrollToTop(): void` | 平滑滚动到顶部 |
<!-- gen:end:api -->
