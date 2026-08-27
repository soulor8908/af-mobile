// af-mobile UI —— af-number-keyboard Playground 场景（单一真相源：playground / gen-docs / AI 直读）
// 契约：{ tag, name, scenarios: [{ name, html, main?, props[], events[], styleTokens[], init? }] }
// 属性/事件名以 src/index.d.ts 为准；random=true 时每次 open 重新洗牌（支付防肩窥）。
export default {
  tag: 'af-number-keyboard',
  name: '数字键盘',
  scenarios: [
    {
      name: '安全键盘（随机布局 + maxlength）',
      html: `
        <div class="actions">
          <button class="btn" id="nk-open">打开安全键盘</button>
        </div>
        <p class="caption" id="nk-log">数字随机排列 · 输满 6 位自动提示完成</p>
        <af-number-keyboard id="kb" title="安全键盘" maxlength="6" random></af-number-keyboard>
      `,
      main: { selector: 'af-number-keyboard' },
      props: [
        { prop: 'title', label: '标题', type: 'string' },
        { prop: 'maxlength', label: '最大长度', type: 'number', min: 0, max: 8, step: 1 },
        { prop: 'random', label: '随机布局', type: 'boolean' },
      ],
      events: ['af-number-keyboard:input', 'af-number-keyboard:delete', 'af-number-keyboard:complete', 'af-number-keyboard:close'],
      styleTokens: [
        { token: '--c-brand', label: '主色', type: 'color' },
      ],
      init: () => {
        const kb = document.getElementById('kb');
        document.getElementById('nk-open')?.addEventListener('click', () => kb.open());
        kb.addEventListener('af-number-keyboard:input', (e) => {
          const log = document.getElementById('nk-log');
          if (log) log.textContent = `输入 ${e.detail.key} → ${e.detail.value}`;
        });
        kb.addEventListener('af-number-keyboard:complete', (e) => {
          const log = document.getElementById('nk-log');
          if (log) log.textContent = `完成：${e.detail.value}`;
        });
      },
    },
    {
      name: '交易密码输入（删除与关闭来源）',
      html: `
        <div class="actions">
          <button class="btn" data-act="nk2-open">打开键盘</button>
        </div>
        <p class="caption" id="nk2-log">顺序布局（非 random）输满 6 位自动关闭；close 事件带来源</p>
        <af-number-keyboard id="kb2" title="输入交易密码" maxlength="6"></af-number-keyboard>
      `,
      main: { selector: '#kb2' },
      props: [
        { prop: 'title', label: '标题', type: 'string' },
        { prop: 'maxlength', label: '最大长度', type: 'number', min: 0, max: 8, step: 1 },
        { prop: 'random', label: '随机布局', type: 'boolean' },
      ],
      events: ['af-number-keyboard:input', 'af-number-keyboard:delete', 'af-number-keyboard:complete', 'af-number-keyboard:close'],
      styleTokens: [
        { token: '--c-brand', label: '主色', type: 'color' },
      ],
      init: () => {
        const kb = document.getElementById('kb2');
        const log = document.getElementById('nk2-log');
        const show = (t) => { if (log) log.textContent = t; };
        document.querySelector('[data-act="nk2-open"]').addEventListener('click', () => kb.open());
        kb.addEventListener('af-number-keyboard:input', (e) => show(`输入 ${e.detail.key} → ${e.detail.value}`));
        kb.addEventListener('af-number-keyboard:delete', (e) => show(`删除 → ${e.detail.value}`));
        // 输满后调用 close(source)：source 进入 af-number-keyboard:close 的 detail.source
        kb.addEventListener('af-number-keyboard:complete', (e) => {
          show(`完成：${e.detail.value}`);
          kb.close('complete');
        });
        kb.addEventListener('af-number-keyboard:close', (e) => show(`键盘关闭（来源 ${e.detail.source}）`));
      },
    },
  ],
};
