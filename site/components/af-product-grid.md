# af-product-grid

> blocks 子库 · L3.5 商品网格块（one-column 横排卡片 / two-column 两列网格，五态 + 键盘导航）

## 示例

### 基础用法

```js
import { registerBlocks } from '@af-mobile/ui/blocks';

registerBlocks('af-product-grid');
```

```html
<af-product-grid title="热销商品" items='[
  {"img":"/a.jpg","title":"无线耳机","subtitle":"主动降噪","price":"¥199","priceDel":"¥299"},
  {"img":"/b.jpg","title":"充电宝","price":"¥99"}
]'></af-product-grid>
```

```js
const grid = document.querySelector('af-product-grid');
grid.addEventListener('af-product-grid:itemclick', (e) => {
  const { index, item } = e.detail; // 跳详情等
});
```

### 两列网格（紧凑模式）

```js
grid.variant = 'two-column'; // 图 + 标题 + 价格，不含副标题
```

### 五态驱动

```js
grid.loading = true;                   // 骨架屏（aria-busy）
grid.setError(new Error('network'));   // 错误态 + 重试 → af-product-grid:retry
grid.items = [];                       // 空态
```

## API

### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| variant | `'one-column' \| 'two-column'` | 'one-column' | 横排卡片（图左文右+加购按钮）/ 两列紧凑网格 |
| title | `string` | '' | 区块标题（作 aria-label） |
| items | `ProductGridItem[]` | [] | `{ img?, title, subtitle?, price?, priceDel?, disabled? }` |
| loading | `boolean` | false | 骨架屏态（aria-busy） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-product-grid:itemclick` | 点击/Enter 选中卡片，detail: `{ index, item }`（disabled 项不触发） |
| `af-product-grid:retry` | 错误态点击「重试」 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `setError(err: unknown): void` | 进入错误态 |

## 无障碍

- 容器 `role="list"` + `aria-live="polite"`；卡片 `role="listitem"`
- 键盘导航：ArrowUp/Down 移动焦点，Enter 触发 `itemclick`
- disabled 项标 `aria-disabled`
- 文案走 i18n（`pg.*` 字典随模块注册，zh-CN / en-US）
