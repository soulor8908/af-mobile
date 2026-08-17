# af-navbar

> v1.5.0 · 顶部导航栏

## 在线调试

<iframe src="../demo/playground/?c=af-navbar" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 基础导航栏

```html
<af-navbar id="nb" title="商品详情" show-back back-text="返回"></af-navbar>
        <div class="card">
          <p class="body">导航栏 sticky 定位 · 顶部 safe-area 适配</p>
        </div>
        <p class="caption" id="nb-log">点击返回按钮触发 af-navbar:back</p>
```

### 右侧插槽

```html
<af-navbar id="nb2" title="个人中心" show-back back-text="返回">
          <button slot="right" class="btn btn-ghost btn-sm" id="nb-share">分享</button>
        </af-navbar>
        <div class="card">
          <p class="body">右侧可插入按钮等自定义内容（slot="right"）</p>
        </div>
        <p class="caption" id="nb-log2">点击右上角「分享」</p>
```

## API

<!-- gen:start:api -->
### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| title | `string` | '' | 标题 |
| showBack | `boolean` | false | 显示返回按钮 |
| backText | `string` | '←' | 返回按钮文案 |
| backAriaLabel | `string` | null | 返回按钮 aria-label |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-navbar:back` | 触发时：组件内 emit 调用 |

### 方法

| 签名 | 说明 |
| --- | --- |

<!-- gen:end:api -->
