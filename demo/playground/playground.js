// af-mobile UI —— Playground 沙盒宿主页逻辑
// 场景文件契约：{ tag, name, scenarios: [{ name, html, main?, props[], events[], styleTokens[], init? }] }
// main: { selector } 用于定位组件实例（缺省回退 html 首元素）；init: 渲染后调用（注入数据/绑定按钮）
// props 控件：boolean=开关按钮 / select=下拉 / number=数字 / string=文本，赋值 el[prop] 实时生效
// styleTokens 控件：color=取色器 / range=滑杆，以 CSS 变量覆盖到 #pg-screen，并展示覆盖代码
// 注意：不用 src/index.js 的 register() —— 其 LAZY 表把动态导入包进函数（import(e) 变量化），
// Rollup 无法静态分析，产物保留裸相对路径 ./components/xxx.js 导致运行时 MIME 报错。
// 此处改用 import.meta.glob 构建期展开组件源码，按需加载 + 自行 define。
const $ = (s, el = document) => el.querySelector(s);
const screen = $('#pg-screen');
// 场景自动发现：构建期展开 glob，每个场景文件独立 chunk。
// 替代硬编码白名单，新增 demo/scenarios/af-*.js 即进沙盒；
// 构建产物中变量模板 import() 无法静态分析（正是「场景尚未建立」误报的根因）。
const scenarioModules = import.meta.glob('../scenarios/af-*.js');
// 主库组件自动发现：tag → 动态加载器（仅包含场景用到的 tag，Tree Shaking 保持）
// 含 L3 组件与 L3.5 blocks 子库
const componentModules = import.meta.glob(['../../src/components/af-*.js', '../../src/blocks/af-*.js']);
const componentLoaders = new Map(
  Object.keys(componentModules).map((p) => [p.match(/af-[\w-]+(?=\.js$)/)[0], componentModules[p]]),
);
// 导出命名约定：af-action-sheet → AfActionSheet（scripts/gen-entry.mjs 同款转换）
const toCtorName = (tag) => 'Af' + tag.replace(/^af-/, '').replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
const COMPONENTS = Object.keys(scenarioModules)
  .map((p) => p.replace(/^.*\//, '').replace(/\.js$/, ''))
  .sort();
const DEFAULT_TAG = 'af-dialog';

async function loadComponent(tag) {
  const load = scenarioModules[`../scenarios/${tag}.js`];
  if (!load) {
    screen.innerHTML = `<p class="pg-empty">「${tag}」场景尚未建立</p>`;
    return null;
  }
  try {
    return (await load()).default;
  } catch (e) {
    console.error(e);
    screen.innerHTML = `<p class="pg-empty">「${tag}」场景加载失败</p>`;
    return null;
  }
}

// 主库组件按需加载并 define（glob 构建期展开，产物可分析）；子库场景（charts/chat）不在
// src/components 下，无 loader 时由场景模块内自行 define，静默跳过
async function ensureRegistered(tag) {
  const load = componentLoaders.get(tag);
  if (!load || customElements.get(tag)) return;
  const mod = await load();
  const Ctor = mod[toCtorName(tag)];
  if (Ctor && !customElements.get(tag)) customElements.define(tag, Ctor);
}

function renderScenario(spec, scenario) {
  screen.innerHTML = scenario.html;
  scenario.init?.();
  const el = scenario.main ? screen.querySelector(scenario.main.selector) : screen.firstElementChild;
  buildProps(scenario, el);
  buildEvents(scenario, el);
  buildStyles(scenario);
  // 重建场景切换 Tab
  const tabs = $('#pg-scenario-tabs');
  tabs.innerHTML = '';
  spec.scenarios.forEach((s) => {
    const b = document.createElement('button');
    b.className = 'pg-btn' + (s === scenario ? ' is-active' : '');
    b.textContent = s.name;
    b.addEventListener('click', () => renderScenario(spec, s));
    tabs.appendChild(b);
  });
}

function buildProps(scenario, el) {
  const box = $('#pg-props');
  box.innerHTML = '';
  if (!el) return; // 场景未定位到组件实例（如 main.selector 无匹配）时容错
  for (const item of scenario.props || []) {
    const row = document.createElement('div');
    row.className = 'pg-row';
    const label = document.createElement('label');
    label.textContent = item.label;
    let input;
    if (item.type === 'boolean') { // 开关按钮，点击取反并回显布尔值
      input = document.createElement('button');
      input.className = 'pg-btn';
      input.textContent = String(!!el[item.prop]);
      input.addEventListener('click', () => {
        el[item.prop] = !el[item.prop];
        input.textContent = String(el[item.prop]);
      });
    } else if (item.type === 'select') {
      input = document.createElement('select');
      for (const opt of item.options) {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        if (String(el[item.prop]) === opt) o.selected = true;
        input.appendChild(o);
      }
      input.addEventListener('change', () => { el[item.prop] = input.value; });
    } else {
      input = document.createElement('input');
      input.type = item.type === 'number' ? 'number' : 'text';
      input.value = el[item.prop] ?? '';
      if (item.type === 'number') {
        if (item.min != null) input.min = item.min;
        if (item.max != null) input.max = item.max;
        if (item.step != null) input.step = item.step;
      }
      input.addEventListener('input', () => {
        el[item.prop] = item.type === 'number' ? Number(input.value) : input.value;
      });
    }
    row.append(label, input);
    box.appendChild(row);
  }
}

function buildEvents(scenario, el) {
  const log = $('#pg-event-log');
  log.textContent = '（等待事件触发…）';
  $('#pg-event-clear').onclick = () => { log.textContent = ''; }; // 覆盖式绑定，避免重复监听
  if (!el) return; // 场景未定位到组件实例时容错
  for (const name of scenario.events || []) {
    el.addEventListener(name, (e) => {
      log.textContent += `[${new Date().toLocaleTimeString()}] ${e.type} ${JSON.stringify(e.detail ?? {})}\n`;
      log.scrollTop = log.scrollHeight; // 滚动到底部
    });
  }
}

function buildStyles(scenario) {
  const box = $('#pg-styles');
  box.innerHTML = '';
  const overrides = new Map();
  const code = document.createElement('pre');
  code.className = 'pg-log'; code.id = 'pg-style-code';
  const sync = () => { code.textContent = overrides.size ? [...overrides].map(([k, v]) => `${k}: ${v};`).join('\n') : '（暂无样式覆盖，拖动控件后显示）'; };
  for (const t of scenario.styleTokens || []) {
    const cur = getComputedStyle(document.documentElement).getPropertyValue(t.token).trim();
    const row = document.createElement('div');
    row.className = 'pg-row';
    const label = document.createElement('label');
    label.textContent = `${t.token} (${t.label || ''})`;
    const input = document.createElement('input');
    const apply = (v) => { screen.style.setProperty(t.token, v); overrides.set(t.token, v); sync(); };
    if (t.type === 'color') {
      input.type = 'color';
      input.value = /^#[0-9a-f]{6}$/i.test(cur) ? cur : '#2563eb';
      input.addEventListener('input', () => apply(input.value));
    } else {
      input.type = 'range';
      input.min = t.min ?? 0; input.max = t.max ?? 24; input.step = t.step ?? 1;
      const n = Number.parseInt(cur);
      input.value = t.default ?? (Number.isFinite(n) ? n : 12);
      input.addEventListener('input', () => apply(`${input.value}px`));
    }
    row.append(label, input);
    box.appendChild(row);
  }
  box.appendChild(code);
  sync();
}

// —— 初始化：URL ?c= 指定组件（默认 af-dialog），渲染首个场景 ——
const sel = $('#pg-component');
COMPONENTS.forEach((tag) => {
  const o = document.createElement('option');
  o.value = tag; o.textContent = tag;
  sel.appendChild(o);
});
const asked = new URLSearchParams(location.search).get('c') || DEFAULT_TAG;
const initial = COMPONENTS.includes(asked) ? asked : DEFAULT_TAG;
sel.value = initial;
ensureRegistered(initial)
  .then(() => loadComponent(initial))
  .then((spec) => { if (spec) renderScenario(spec, spec.scenarios[0]); });

// 组件下拉切换
sel.addEventListener('change', async () => {
  await ensureRegistered(sel.value);
  const spec = await loadComponent(sel.value);
  if (spec) renderScenario(spec, spec.scenarios[0]);
});

// 手机框宽度切换（事件委托）
$('#pg-device').addEventListener('click', (e) => {
  const w = e.target.dataset?.w;
  if (!w) return;
  $('#pg-device').style.width = w === 'auto' ? 'auto' : `${w}px`;
  $('#pg-device-label').textContent = w === 'auto' ? '自适应' : `${w}px`;
});

// 右侧面板 Tab 切换
document.querySelectorAll('.pg-tab').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('.pg-tab').forEach((x) => x.classList.toggle('is-active', x === b));
    document.querySelectorAll('.pg-tabpanel').forEach((p) => p.classList.toggle('is-active', p.dataset.panel === b.dataset.tab));
  }));

// 移动端 预览/调试 视图切换（窄屏下预览与调试面板二选一，避免双栏挤压）
document.querySelectorAll('.pg-mobile-switch button').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('.pg-mobile-switch button').forEach((x) => x.classList.toggle('is-active', x === b));
    document.body.classList.remove('pg-view-stage', 'pg-view-panel');
    document.body.classList.add(`pg-view-${b.dataset.view}`);
  }));
