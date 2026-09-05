# Vant 对齐改造待办（vant-style-gap TODO）

> 依据：[vant-style-gap-audit.md](./vant-style-gap-audit.md)（2026-09-05 审计）。
> 原则：每完成一批跑门禁（eslint / vitest / size / whitelist / types / aria / prompt:check）。
> 勾选进度直接更新本文件。

## P0（一眼不是一个东西 / 功能硬伤）

- [x] T0.1 系统性弹层：backdrop→rgba(0,0,0,.7) 全同步（tokens.css + af-dialog + af-picker shadow 内）；blur 移除；底部弹层圆角 16px 全量完成（af-dialog --af-dialog-radius / .sheet --af-sheet-radius / af-picker --af-picker-radius；af-calendar 为内联卡片形态，圆角归 T0.12 形态级处理）；进场动画 sheet-up/picker-up slide-up 0.3s（reduced-motion 由 tokens 全局降级兜底）
- [x] T0.2 af-upload 宫格化：80×80 占位块进网格首项；右上 14px 黑角标删除（af-upload:delete + revoke）；loading/失败遮罩；disabled 态
- [x] T0.3 af-tabs：止血去 .tabbar 的 border-top；条高 44px、激活加粗（600）、未激活 gray-7；底部 40×3px 品牌色滑块（CSS ::after 实现，--af-line-x 驱动，:has(.tab-item) 控制显隐）+ transform 位移过渡；disabled 态（预算代价：滑块位移由 setActive 内联计算，无 resize 重算，下次切换自愈）
- [x] T0.4 af-backtop：40×40 全圆实心（brand 底 + 白色 20px/600 图标）+ 阴影 + scale 显隐过渡（弃 hidden 硬切）；active opacity .6
- [x] T0.5 af-notice-bar：配色反转为浅奶油底+橙字（新增 --c-notice-bg / --c-notice-text，双主题）；高 40px、字 14px/行高 24；补 icon / closeable / wrapable；滚动时长按文本宽/60px·s 动态计算
- [x] T0.6 af-stepper 连体化：28×28 灰底方块按钮 + 32px 无边框输入同底（gap 2px、各段 4px 独立圆角）；disabled 底色 --c-bg/文字 muted；round 变体（af-stepper[round] ± 圆形 brand 底白字，disabled 回灰阶）
- [x] T0.7 af-progress：高 8→4px；div 结构（portion/pivot 文字气泡 min-width 3.6em、字 12px）；inactive 置灰；双引擎 width 过渡
- [x] T0.8 af-steps：24px 数字圆盘→5px 实心小圆点 + 1px 连线；done 染线/圆点、active 染标题；标签 12px；补过渡
- [x] T0.9 af-action-sheet：去卡片边框改全宽贴边；项 16px 字居中、:active muted-bg；取消项同款 + 8px 灰色实底间隔块；max-height 80% 内滚动；补 subname / danger / loading
- [x] T0.10 af-field：补 word-limit 字数统计、必填星号、clear 图标、右侧插槽；error-message 12px；disabled 文字色
- [x] T0.11 af-search-bar：补外层 bar（padding 10px 12px、card 底）与 action 取消区（af-search-bar:cancel）；输入高 34px
- [ ] T0.12 af-cascade-picker / af-calendar 形态级改造：**单独立项评估**（滚轮 vs 平铺级联、内联卡片 vs 80% 弹层），本清单先不动

## P1（数值校准，成本低收益高）

- [x] T1.1 字号一档校准：toast 14px/行高20/min-width 96/max-width 70%/padding 8px 12px（recipes.css + recipes-feedback.css）
- [x] T1.2 tabbar：文字 12px、图标 22px、gap 4px、行高 1、未激活色 text
- [x] T1.3 navbar：标题 16px/600、左右区 padding 0 16px、min-height 46px、返回键 16px/44px 触点；disabled 态未做（组件无此逻辑，待需求）
- [x] T1.4 tabbar badge 移入 icon 内 absolute 定位（消除整栏跳动）
- [x] T1.5 cell/list（部分）：行高 44px、padding 10px 16px、行高 24px、分隔线 inset 16px（::after + scaleY(.5)）；value 右对齐灰字（.cell-value）+ 右箭头槽位（.cell-arrow 纯 CSS 边框 chevron，.cell-value + .cell-arrow 联动）已完成；.list 默认去边框未做（涉及 JS 渲染层）
- [x] T1.6 af-list 状态文案：14px/行高 50px；loading 加 spinner（spin-dot 复用）；补 error 态（setError API + _renderError danger 文案 + 重试按钮 af-list:retry）
- [x] T1.7 af-dialog（部分）：圆角 16px（--af-dialog-radius）、标题居中 16px、body max-height 60vh、footer 通栏等分 48px；按钮间分隔线（box-shadow 穿透 slotted，文档样式不可覆盖）+ round-button 变体（:host([round-button]) footer padding/gap + slotted 圆角）已完成
- [x] T1.8 af-picker（部分）：选项行高 44px（默认 itemHeight 36→44）、字 16px（--af-item-fs）；标题绝对居中 max-width 50%（ellipsis）；禁用选项 opacity .3（.item-disabled + 滚轮停禁用项弹开 + 键盘跳过）；工具栏按钮整高热区、指示框去边线未做
- [x] T1.9 badge/tag 数值：badge 16px/dot 8px/恒 1px 白描边 + tag padding/圆角/字号/tag-round/tag-mark 全部完成
- [x] T1.10 af-number-keyboard（部分）：键白底 + 容器灰底（反色）、键字 28px（--af-key-fs）、圆角 8px（--r-m）、close 改主题色文字按钮已完成；gap 6px（现 8px）、容器 padding-bottom 22px、标题 16px normal 未做
- [x] T1.11 af-toast 图标布局：icon 选项 / type=loading 切图标态（toast-ico-box 88×88 flex column、图标 36px、间距 8px、toast-loading-ico 白色 spinner）；进场淡入 200ms
- [x] T1.12 af-password-input（部分）：光标 1px/高 40%、cell 高 50px、info/error-info 文本行（error 红色优先、:empty 隐藏）已完成；明文 20px 未做（现 t-xl 22px）

## P2（打磨）

- [x] T2.1 af-switch 过渡 300ms cubic-bezier(.3,1.05,.4,1.05) 回弹
- [x] T2.2 af-swipe-cell：回弹 250ms（--dur-base）；按钮去圆角改通栏 65px 直角（去 padding/gap）；全局点击关闭（document 委托，多实例各自监听）
- [x] T2.3 af-swiper：圆点 6px 白色 opacity .3/1 + bottom:12px 悬浮（--af-dot-* fallback 变量）；时长 500ms、autoplay 3000ms（默认值变更，禁自动轮播需显式 autoplay=0）
- [x] T2.4 af-skeleton：行高 16px、行距 12px、avatar 32px、动画 1.2s
- [x] T2.5 af-countdown：format 属性（DD/HH/mm/ss token）+ 自动升粒度（>1 时出 HH、>1 天出 DD天）+ tabular-nums（宿主样式）
- [x] T2.6 af-img：错误态 32px inline SVG 裂图图标；fit 属性（--af-img-fit 通道）；加载完成 opacity 淡入 300ms（data-loaded 态，rAF 触发过渡）
- [x] T2.7 af-pull-refresh（af-list 内置）：height→transform 驱动（head 悬浮藏于上方 + body 同步下移，拖拽 data-dragging 关过渡）；阈值 50px、max 80px；success 态（endRefresh(text) 停留 500ms 收起）
- [x] T2.8 af-rate：星 20px、间距 4px；半星（rate-half 半宽溢出裁切，value 含 .5 时高位星半亮）；disabled 变灰不可点（rate-dis + defineProp）
- [x] T2.9 af-dropdown：菜单条触发器（48px 无描边，默认 triggerClass 改空）；箭头边框 chevron 45°↔-135° 旋转过渡（data-role=arrow）；展开标题染品牌色；面板 max-height 80vh 内滚
- [x] T2.10 af-field/af-search-bar 圆角对齐（输入/textarea 8→4px、search 全圆→4px、clear 无底色 18px 已达标）
