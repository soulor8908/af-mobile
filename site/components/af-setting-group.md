# af-setting-group

> blocks 子库 · L3.5 设置分组列表块（五态 + 键盘导航 + 开关变体）

## 示例

### 基础用法

```js
import { registerBlocks } from '@af-mobile/ui/blocks';

registerBlocks('af-setting-group');
```

```html
<af-setting-group id="sg" title="通用"></af-setting-group>
```

```js
const sg = document.getElementById('sg');
sg.items = [
  { label: '消息通知', action: 'arrow' },
  { label: '仅 Wi-Fi 下载' },
];
sg.addEventListener('af-setting-group:itemclick', (e) => {
  const { index, item } = e.detail;
});
```

### with-switch 变体（开关行）

```js
sg.variant = 'with-switch';
sg.items = [
  { label: '消息通知', checked: true },
  { label: '仅 Wi-Fi 下载', disabled: true },
];
sg.addEventListener('af-setting-group:change', (e) => {
  const { index, checked, item } = e.detail; // 开关切换（内部 af-switch:change 转发）
});
```

### with-value 变体（右侧值 + 箭头）

```js
sg.variant = 'with-value';
sg.items = [
  { label: '字体大小', value: '标准' },
  { label: '清除缓存', value: '128 MB' },
];
```

### 五态驱动

```js
sg.loading = true;                  // 骨架屏（aria-busy）
sg.setError(new Error('network'));  // 错误态 + 重试按钮 → af-setting-group:retry
sg.items = [];                      // 空态
```

## API

### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| variant | `'default' \| 'with-switch' \| 'with-value'` | 'default' | 行形态：开关 / 右侧值+箭头 / 箭头 |
| title | `string` | '' | 分组标题（作 aria-label） |
| items | `SettingItem[]` | [] | `{ label, icon?, value?, action?, checked?, disabled? }` |
| loading | `boolean` | false | 骨架屏态（aria-busy） |

### 事件

| 事件名 | 说明 |
| --- | --- |
| `af-setting-group:itemclick` | 点击/Enter 选中行，detail: `{ index, item }` |
| `af-setting-group:change` | with-switch 变体开关切换，detail: `{ index, checked, item }` |
| `af-setting-group:retry` | 错误态点击「重试」 |

### 方法

| 签名 | 说明 |
| --- | --- |
| `setError(err: unknown): void` | 进入错误态（清空后 `_render` 回到正常态） |

## 无障碍

- 列表容器 `role="list"` + `aria-live="polite"`；行 `role="listitem"`
- 键盘导航：ArrowUp/Down 移动焦点，Enter 触发 `itemclick`
- disabled 行标 `aria-disabled`；开关继承 af-switch 的原生可访问性
- 空态/错误态文案走 i18n（`sg.*` 字典在主库核心 i18n，zh-CN / en-US）
