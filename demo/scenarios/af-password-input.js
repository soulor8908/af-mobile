// af-mobile UI —— af-password-input Playground 场景（单一真相源：playground / gen-docs / AI 直读）
// 契约：{ tag, name, scenarios: [{ name, html, main?, props[], events[], styleTokens[], init? }] }
// 属性/事件名以 src/index.d.ts 为准；输入由 af-number-keyboard 驱动（页面接线 value 同步）。
export default {
  tag: 'af-password-input',
  name: '密码/验证码格子输入',
  scenarios: [
    {
      name: '支付密码（配对 af-number-keyboard）',
      fewshot: {
        html: '<af-password-input id="pi" length="6" mask focused></af-password-input>',
        js: `const pi = document.getElementById('pi');
pi.addEventListener('af-password-input:complete', () => console.log('输入完成，可发起校验'));
pi.addEventListener('af-password-input:change', (e) => console.log(e.detail.value));`,
        note: 'length/mask/focused 属性；输满 length 触发 complete；值经 e.detail.value 外发；配 af-number-keyboard 使用',
      },
      html: `
        <div class="card fc g-3 center p-3">
          <af-password-input id="pi" length="6" mask></af-password-input>
          <p class="caption" id="pi-log">点击格子唤起数字键盘 · 输满自动收起</p>
        </div>
        <af-number-keyboard id="pi-kb" title="安全键盘" maxlength="6"></af-number-keyboard>
      `,
      main: { selector: '#pi' },
      props: [
        { prop: 'length', label: '格子数', type: 'number', min: 4, max: 8, step: 1 },
        { prop: 'mask', label: '掩码', type: 'boolean' },
        { prop: 'focused', label: '聚焦光标', type: 'boolean' },
      ],
      events: ['af-password-input:complete'],
      styleTokens: [
        { token: '--c-brand', label: '光标色', type: 'color' },
      ],
      init: () => {
        const pi = document.getElementById('pi');
        const kb = document.getElementById('pi-kb');
        const log = document.getElementById('pi-log');
        pi.addEventListener('click', () => {
          kb.maxlength = pi.length;
          kb.value = pi.value;
          pi.focused = true;
          kb.open();
        });
        kb.addEventListener('af-number-keyboard:input', (e) => { pi.value = e.detail.value; });
        kb.addEventListener('af-number-keyboard:delete', (e) => { pi.value = e.detail.value; });
        kb.addEventListener('af-number-keyboard:close', () => { pi.focused = false; });
        pi.addEventListener('af-password-input:complete', (e) => {
          if (log) log.textContent = `输入完成：${e.detail.value}`;
          kb.close('complete');
        });
      },
    },
    {
      name: '短信验证码（明文）',
      html: `
        <div class="card fc g-3 center p-3">
          <af-password-input id="pi2" length="4" mask="false"></af-password-input>
          <p class="caption" id="pi-log2">mask="false" 明文展示数字</p>
        </div>
        <af-number-keyboard id="pi-kb2" title="验证码" maxlength="4"></af-number-keyboard>
      `,
      main: { selector: '#pi2' },
      props: [
        { prop: 'length', label: '格子数', type: 'number', min: 4, max: 8, step: 1 },
        { prop: 'focused', label: '聚焦光标', type: 'boolean' },
      ],
      events: ['af-password-input:complete'],
      styleTokens: [
        { token: '--c-brand', label: '光标色', type: 'color' },
      ],
      init: () => {
        const pi = document.getElementById('pi2');
        const kb = document.getElementById('pi-kb2');
        const log = document.getElementById('pi-log2');
        pi.addEventListener('click', () => {
          kb.maxlength = pi.length;
          kb.value = pi.value;
          pi.focused = true;
          kb.open();
        });
        kb.addEventListener('af-number-keyboard:input', (e) => { pi.value = e.detail.value; });
        kb.addEventListener('af-number-keyboard:delete', (e) => { pi.value = e.detail.value; });
        kb.addEventListener('af-number-keyboard:close', () => { pi.focused = false; });
        pi.addEventListener('af-password-input:complete', (e) => {
          if (log) log.textContent = `输入完成：${e.detail.value}`;
          kb.close('complete');
        });
      },
    },
  ],
};
