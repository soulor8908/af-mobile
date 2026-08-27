# af-product-card

> blocks 子库 · L3.5 商品卡片列表块（五态 + 键盘导航）

## 在线调试

<iframe src="../demo/playground/index.html?c=af-product-card" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## 示例

### 基础用法

```js
import { registerBlocks } from '@af-mobile/ui/blocks';

registerBlocks('af-product-card');
```

```html
<af-product-card id="card" title="热销商品" price="¥129"></af-product-card>
```

```js
const card = document.getElementById('card');
card.items = [
  { label: '无线降噪耳机' },
  { label: '便携充电宝', action: 'arrow' },
  { label: '已下架商品', disabled: true },
];
card.addEventListener('af-product-card:itemclick', (e) => {
  const { index, item } = e.detail; // 点击/Enter 选中的行
});
```

### 五态驱动

```js
card.loading = true;          // 骨架屏（aria-busy）
// 拉取失败：
card.setError(new Error('network')); // 错误态 + 重试按钮 → af-product-card:retry
// 拉取成功：
card.loading = false;
card.items = data;            // 空数组 → 空态
```

## API

### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| title | `string` | '' | 分组标题（作 aria-label，空则不渲染标题行） |
| price | `string` | '' | 价格文案（标题行右侧） |
| items | `ProductItem[]` | [] | 列表数据：`{ label, action?: 'arrow', disabled? }` |
| loading | `boolean` | false | 骨架屏态（aria-busy） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-product-card:itemclick` | 点击/Enter 选中行，detail: `{ index, item }`（disabled 行不触发） |
| `af-product-card:retry` | 错误态点击「重试」 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `setError(err: unknown): void` | 进入错误态（清空后 `_render` 回到正常态） |

## 无障碍

- 列表容器 `role="list"` + `aria-live="polite"`；行 `role="listitem"`
- 键盘导航：列表聚焦后 ArrowUp/Down 移动焦点，Enter 触发 `itemclick`
- disabled 行标 `aria-disabled`，跳过点击与 Enter
- 空态/错误态文案走 i18n（`pc.*` 字典随本模块注册，支持 zh-CN / en-US）
