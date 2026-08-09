(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var danger = style.getPropertyValue('--danger').trim();

  // --- 图 4: v2.0 vs v3.0 首屏体积对比（堆叠柱状） ---
  var sizeChart = echarts.init(document.getElementById('chart-size'), null, { renderer: 'svg' });
  sizeChart.setOption({
    animation: false,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true },
    legend: { data: ['框架运行时', 'CSS (token+配方)', '真组件 JS', '核心运行时 (router/state/i18n)'], top: 0, textStyle: { color: muted, fontSize: 11 } },
    grid: { left: '8%', right: '5%', top: 60, bottom: 30 },
    xAxis: {
      type: 'category', data: ['v2.0 (Vue)', 'v3.0 (原生+WC)'],
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: ink, fontSize: 13, fontWeight: 600 }
    },
    yAxis: {
      type: 'value', name: 'KB (gzip)', nameTextStyle: { color: muted, fontSize: 11 },
      axisLine: { show: false }, splitLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted }
    },
    series: [
      { name: '框架运行时', type: 'bar', stack: 'a', data: [13, 0], itemStyle: { color: danger }, barWidth: 90 },
      { name: 'CSS (token+配方)', type: 'bar', stack: 'a', data: [1.5, 2], itemStyle: { color: accent2 } },
      { name: '真组件 JS', type: 'bar', stack: 'a', data: [5, 3], itemStyle: { color: accent } },
      { name: '核心运行时 (router/state/i18n)', type: 'bar', stack: 'a', data: [0, 1], itemStyle: { color: muted }, label: { show: true, formatter: function(p) { var total = p.value; return ''; } } },
      { name: '合计标签', type: 'bar', stack: 'a', data: [0, 0], label: { show: true, position: 'top', formatter: function(p) { var idx = p.dataIndex; return idx === 0 ? '~21KB' : '~6KB (-71%)'; }, color: ink, fontSize: 14, fontWeight: 700 } }
    ]
  });
  window.addEventListener('resize', function() { sizeChart.resize(); });

  // --- 图 5: v3.0 对 Vant 高频组件覆盖率（横向条形） ---
  var covChart = echarts.init(document.getElementById('chart-coverage'), null, { renderer: 'svg' });
  covChart.setOption({
    animation: false,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true, formatter: function(p) { return p[0].name + ': ' + p[0].value + '%'; } },
    grid: { left: '22%', right: '8%', top: 20, bottom: 30 },
    xAxis: {
      type: 'value', max: 100, axisLabel: { color: muted, formatter: '{value}%' },
      axisLine: { show: false }, splitLine: { lineStyle: { color: rule } }
    },
    yAxis: {
      type: 'category', inverse: true,
      data: ['基础组件', '弹层组件', '导航组件', '表单组件', '展示组件', '复杂交互(picker等)'],
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: ink, fontSize: 12 }
    },
    series: [{
      type: 'bar', barWidth: 22,
      data: [
        { value: 100, itemStyle: { color: accent } },
        { value: 100, itemStyle: { color: accent } },
        { value: 95, itemStyle: { color: accent } },
        { value: 90, itemStyle: { color: accent } },
        { value: 85, itemStyle: { color: accent2 } },
        { value: 70, itemStyle: { color: '#d97706' } }
      ],
      label: { show: true, position: 'right', formatter: '{c}%', color: ink, fontSize: 12, fontWeight: 600 }
    }]
  });
  window.addEventListener('resize', function() { covChart.resize(); });
})();
