# af-order-list

> blocks 子库 · L3.5 订单列表块（simple / detailed 含缩略图，五态 + 键盘导航）

## 示例

### 基础用法

```js
import { registerBlocks } from '@af-mobile/ui/blocks';

registerBlocks('af-order-list');
```

```html
<af-order-list title="我的订单" items='[
  {"no":"NO-2024-001","time":"05-01 10:00","status":"待付款","tone":"warn","amount":"¥199.00"},
  {"no":"NO-2024-002","time":"05-03 18:30","status":"已完成","tone":"ok","amount":"¥59.00"}
]'></af-order-list>
```

```js
const list = document.querySelector('af-order-list');
list.addEventListener('af-order-list:itemclick', (e) => {
  const { index, item } = e.detail; // 查看详情
});
```

### detailed 变体（含商品缩略图行）

```js
list.variant = 'detailed';
list.items = [{ no: 'NO-2024-003', status: '已发货', tone: 'ok', amount: '¥299.00', thumbs: ['/a.jpg', '/b.jpg'] }];
```

### 五态驱动

```js
list.loading = true;                  // 骨架屏（aria-busy）
list.setError(new Error('network'));  // 错误态 + 重试 → af-order-list:retry
list.items = [];                      // 空态
```

## API

### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| variant | `'simple' \| 'detailed'` | 'simple' | detailed 附带商品缩略图行 |
| title | `string` | '' | 分组标题（作 aria-label） |
| items | `OrderItem[]` | [] | `{ no, time?, status?, tone?('ok'/'warn'/'danger'), amount?, thumbs?, disabled? }` |
| loading | `boolean` | false | 骨架屏态（aria-busy） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-order-list:itemclick` | 点击/Enter 选中行，detail: `{ index, item }` |
| `af-order-list:retry` | 错误态点击「重试」 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `setError(err: unknown): void` | 进入错误态 |

## 无障碍

- 容器 `role="list"` + `aria-live="polite"`；行 `role="listitem"`
- 键盘导航：ArrowUp/Down 移动焦点，Enter 触发 `itemclick`
- 状态标签 tone 限定 ok/warn/danger 枚举（非法值回退普通 tag，不注入任意 class）
- 文案走 i18n（`ol.*` 字典随模块注册，zh-CN / en-US）
