# B3 实验任务卡（两条件共用，每卡 ≤300 字符）

接口契约（两条件相同）：每个任务导出 `mount(el, opts)`，el 为容器元素；opts.loadData 仅任务 3 使用（window.__loadData 备选）。禁止使用 af-* 组件，仅用原生元素。

输出要求：每个任务一个独立 ES Module 文件（t1.mjs ~ t5.mjs），只输出代码，不要额外解释。

## T1 计数器
计数器。#c 显示当前值（初始 0），#sq 显示平方。#inc 点击 +1，#dec 点击 -1。

## T2 待办
输入框 #new 回车添加待办（忽略空输入）；#list 渲染条目（li 含待办文本）；点击 li 删除该项；全部删空时 #empty 显示"暂无待办"。

## T3 异步五态
点击 #load 调 opts.loadData()（Promise<string[]>）：pending 时 #status 显示"加载中"；成功渲染 #list 条目并清空 #status；失败 #status 显示"加载失败"并出现 #retry，点击重试重新走流程；成功但空数组时 #status 显示"空"。

## T4 搜索过滤
内置数组（"手机壳","数据线","手机膜","充电器","手机支架"）；#kw 输入关键词实时过滤；#count 显示"共N条"；#list 渲染命中项。

## T5 表单预览
#name/#email 输入实时更新 #preview 为"姓名：X 邮箱：Y"；#email 非法（不含@）时 #err 显示"邮箱格式错误"且 #err 隐藏时无此文本。
