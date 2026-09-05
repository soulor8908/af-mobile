# af-mobile ↔ Vant 4 组件样式差距审计

> 基准：Vant 4 官方 CSS（`--van-*` 797 个变量，完整 index.css 逐组件拆解比对）。
> 范围：af-mobile 全部 31 个 af-* 组件/配方。品牌色差异（oklch 靛紫 vs #1989fa）不计入。
> 结论：**大差异 12 个、中差异 16 个、基本一致 3 个**。

## 一、总表

| 组件 | 等级 | 核心差距 |
|---|---|---|
| af-upload | 大 | 按钮触发式 vs 宫格式；缺删除角标、上传占位块、loading/失败遮罩 |
| af-stepper | 大 | ghost 文字按钮 + 盒式输入 vs 28px 灰底连体方块；缺 round 变体 |
| af-field | 大 | 盒式输入 vs Vant 无框 cell 范式；缺 word-limit/必填星号/右侧插槽/clear |
| af-progress | 大 | 8px `<progress>` vs Vant 4px div + pivot 文字气泡；无 inactive |
| af-steps | 大 | 24px 数字圆盘 vs Vant 5px 小圆点+1px 连线；缺垂直模式 |
| af-cascade-picker | 大 | 滚轮级联 vs Vant 平铺列表（header+Tab+选项行）；形态级差异 |
| af-calendar | 大 | 内联卡片 vs 80% 高底部弹层；日期格 40px/12px vs 64px/16px；无范围选择 |
| af-action-sheet | 大 | 卡片内嵌列表 vs 全宽贴边面板；缺 header/description/subname/关闭钮；无 max-height 滚动 |
| af-dropdown | 大 | input 描边触发器 + 静态箭头 vs 菜单条 + 旋转箭头 + 展开着色 |
| af-tabs | 大 | 复用底部 tabbar 配方；缺底部滑块（40px×3px）；条高 50 vs 44 |
| af-backtop | 大 | 44px 方角 ghost 文字按钮 vs 40px 全圆实心图标按钮 + 缩放过渡 |
| af-notice-bar | 大 | 实心黄底深棕字（强警告观感）vs 浅奶油底橙字（弱提示）；缺左图标/关闭钮/wrapable |
| af-navbar | 中 | 标题 22px vs 16px；左右区无 padding；高度 48 vs 46 |
| af-tabbar | 中 | 图标字号未定义（11px）vs 22px；文字 11 vs 12px；badge 占流式布局致跳动 |
| af-list / .cell | 中 | 行高 48 vs 44；分隔线全宽 vs inset 16px；缺 value 右对齐灰字、右箭头、large 变体 |
| af-pull-refresh | 中 | height 驱动 vs transform 驱动（性能+手感）；阈值 60/120px vs 50px；缺 success 态 |
| af-picker | 中 | 选项行高 36 vs 44px；字号 14 vs 16px；标题 14 vs 16px；缺 loading 遮罩、禁用选项 |
| af-dialog | 中 | 圆角 12 vs 16px；标题左对齐 18px vs 居中 16px；footer 有 gap vs 通栏等分 48px 按钮 |
| af-toast | 中 | 纯文字单布局 vs 文字/图标双布局；字号 12 vs 14px；彩底 vs 黑底+图标 |
| af-search-bar | 中 | 缺 action 取消区与外层 bar；圆角胶囊 vs 2px；高 36 vs 34px |
| af-number-keyboard | 中 | 键/容器底色反了（应白键灰容器）；键字 22 vs 28px；容器缺 padding-bottom |
| af-password-input | 中 | 分离格 vs 连体分隔线；光标 2px vs 1px；缺 info/error 文本行 |
| af-badge | 中 | 18px vs 16px；dot 10 vs 8px；缺四角定位/独立展示描边 |
| .tag | 中 | padding 4×8 vs 0×4；圆角 6 vs 2px；字号 11 vs 12px；缺 mark/round 变体 |
| af-rate | 中 | 星 18px vs 20px；间距 2 vs 4px；缺半星 |
| af-img | 中 | 错误态无图标；无 fit 属性；无加载完成淡入 |
| af-skeleton-page | 中 | 行高 14 vs 16px；avatar 64 vs 32px；shimmer 1.5s vs 1.2s |
| af-countdown | 中 | 无时/天粒度、无 format；缺 tabular-nums 等宽数字 |
| af-switch | 小 | 过渡 250ms ease-out vs 300ms 回弹曲线；尺寸近似 |
| af-swipe-cell | 小 | 回弹 150ms vs 300ms；按钮 6px 圆角 vs 通栏直角 |
| af-swiper | 小 | 圆点 8 vs 6px；文档流 vs bottom:12px 悬浮；时长 250 vs 500ms |

## 二、四个系统性根因（改一处，多组件受益）

1. **遮罩与弹层语言**：`tokens.css:28-29` 的 backdrop 是 `rgba(0,0,0,.4)+blur(8px)`，Vant 是 `rgba(0,0,0,.7)` 无模糊；底部弹层圆角我们 12px vs Vant 16px；我们所有 dialog/popover **无进出场动画**（Vant 统一 300ms transform）。→ 改 tokens.css 一处 + 加 @starting-style 滑入，7 个弹层组件同时受益。
2. **字号系统性偏小一档**：正文我们 11/12/14px，Vant 12/14/16px。受影响：toast(12→14)、picker 选项(14→16)、action-sheet(14→16)、notice-bar(12→14)、tabbar 文字(11→12)、list 状态文案(11→14)、badge/tag(11→12)。唯一反向偏大的是 navbar 标题 22px（Vant 16px）。
3. **「卡片化/按钮化」倾向 vs Vant 通栏贴边**：action-sheet 内嵌带边框圆角的 .list、swipe-cell 按钮 6px 圆角+间距、stepper 三段分离带 gap、dialog footer 有 gap——Vant 全是通栏、无缝、直角/等分。这是与 Vant 观感差异的语义根源：我们把「浮层」当卡片做，Vant 把浮层当系统面板做。
4. **状态覆盖薄**：disabled/loading/active 普遍缺——stepper 禁用无底色、picker 无禁用选项、upload 无删除、af-list 无 error 态、af-list loading 无 spinner、notice-bar 无 closeable、rate 无禁用变色。Vant 每个组件都有完整的状态矩阵。

## 三、P0 改造清单（一眼不是一个东西 / 功能硬伤）

| # | 项 | 关键改法 |
|---|---|---|
| 1 | af-upload | 宫格化：80×80 占位块（muted-bg+24px 加号）进网格首项；每项右上 14px 黑角标（rgba(0,0,0,.7)、左下圆角 12px）派发 af-upload:delete |
| 2 | 系统性弹层 | backdrop→rgba(0,0,0,.7)；弹层圆角 12→16px；dialog/popover 补 300ms 滑入/淡入 |
| 3 | af-tabs | 独立导航结构：条高 44px、激活加粗、底部 40×3px 品牌色滑块 + 位移过渡；先止血 `af-tabs .tabbar{border-top:none}` |
| 4 | af-backtop | 改 40×40 全圆实心（brand 底白图标 20px/600）+ 阴影 + scale(0)→scale(1) 显隐过渡；弃用 hidden 硬切 |
| 5 | af-notice-bar | 配色反转为浅奶油底+橙字（新增 --c-notice-bg/--c-notice-text）；高 40px、字 14px；补 icon/closeable/wrapable |
| 6 | af-stepper | 连体化：28×28 灰底方块按钮 + 32px 无边框输入同底，gap 2px、圆角 4px 外圈；补 round 变体 |
| 7 | af-progress | 8px→4px；div 结构 + portion/pivot（文字气泡 min-width 3.6em）；补 inactive 置灰 |
| 8 | af-steps | 24px 数字圆盘→5px 实心小圆点 + 1px 连线；done 染线、active 染标题；标签 12px |
| 9 | af-action-sheet | 去卡片边框改全宽贴边；项 16px 字居中；取消项上方 8px 灰色实底间隔块；max-height 80% 内滚动 |
| 10 | af-field / af-search-bar | field 补 word-limit/必填星号/clear/右侧插槽；search 补 action 取消区与外层 bar |

## 四、P1 清单（数值校准，成本低收益高）

- **字号一档校准**（§二.2 全部条目）：toast 14px/行高 20/min-width 96px/max-width 70%；picker 选项 16px+行高 44；tabbar 文字 12px+图标 22px+gap 4px。
- **cell/list 对齐**：行高 48→44px、padding 12→10px 16px、行高 24px；分隔线改 inset 16px（::after + scaleY(.5)）；补 value 右对齐灰字、右箭头 16px；`.list` 默认去边框圆角（inset 变体单列）。
- **af-navbar**：标题 22→16px/600、左右区 padding 0 16px、高 46px、返回箭头 16px。
- **af-dialog**：圆角 16px；标题居中 16px；body max-height 60vh；footer 按钮通栏等分 48px + 0.5px 分隔线；补 round-button 变体。
- **af-picker**：行高 44px、标题 16px/600 绝对居中、工具栏按钮整高热区、遮罩去边线 inset 16px。
- **af-tabbar**：badge 移入 icon 内 absolute 定位（消除整栏跳动）；未激活色 muted→text。
- **af-badge/.tag**：badge 16px/dot 8px/恒 1px 白边；tag padding 0 4px、圆角 2px、字 12px，补 mark/round。
- **af-number-keyboard**：键白底容器灰底（反色）、键字 28px、圆角 8px、gap 6px、容器 padding-bottom 22px。

## 五、P2 清单（打磨）

- af-switch：过渡改 300ms `cubic-bezier(.3,1.05,.4,1.05)` 回弹（一行）。
- af-swipe-cell：回弹 150→250-300ms；按钮去圆角改通栏 65px 直角；补全局点击关闭。
- af-swiper：圆点 6px + opacity .3/1 方案 + bottom:12px 悬浮；时长 500ms、autoplay 3000ms。
- af-skeleton：行高 16px、行距 12px、avatar 32px、动画 1.2s。
- af-countdown：补时/天粒度 + format + `font-variant-numeric: tabular-nums`。
- af-img：错误态 32px 图标；fit 属性；加载完成 opacity 淡入 300ms。
- af-pull-refresh：height 驱动改 transform 驱动（长列表性能）；阈值 50px；补 success 态。
- af-password-input：光标 1px/高 40%；补 info/error 文本行。
- af-rate：星 20px、间距 4px；补半星与禁用变色。
- af-dropdown：触发器改菜单条（48px+投影）；箭头 border 伪元素 + rotate(-45°↔135°) 过渡；展开标题变品牌色；面板 max-height 80%。

## 六、方法论备注

- 本次对比基于 vant@4 lib/index.css（199KB 完整样式），拆分为按组件文件后逐项比对，数值均出自源码，非文档转述。
- af-cascade-picker 与 af-calendar 属形态级差异（滚轮 vs 平铺、内联 vs 弹层），改造成本最高，建议单独立项评估是否值得跟随 Vant 形态，还是保持差异化定位。
- af-switch / af-swiper / af-swipe-cell 已基本对齐，说明「对齐 Vant」不是推倒重来，而是把 P0 的 12 个组件拉齐到这三者的水准。
