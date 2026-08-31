// af-mobile UI —— af-chat：AI 对话容器（chat 子库，Shadow DOM 外壳 + 白名单卡片投影）
// 双模式：session（绑定 createSession 实例）/ messages（受控）；统一 _sync 增量渲染（按 data-id 复用节点）
// 卡片：card 内容块 → host light DOM 子节点（slot=card-{msgId} 投影），白名单 class 构建
// 体积口径：① CSS 字符串紧凑单行（esbuild minify 不压缩 JS 模板字符串内空白）
//           ② shadow 私有 class 用 1-2 字符缩写（.lg 日志区/.ms 气泡列/.cs 快捷回复/.cp 输入区/
//              .in 输入框/.sd 发送钮/.cb 回复钮/.pl 回底钮/.eb 错误条/.rt 重试钮/.ey 空态/
//              .cd 代码块/.cc 复制码钮/.kt 思考折叠/.ma 操作行）
import { AfElement, escapeHtml as esc } from '../../lib/af-element.js';
import { withI18n } from '../../lib/with-i18n.js';
import { bubbleHTML, updateBubble, cardNode, chipsHTML, toolCallMap, textOf } from '../lib/render.js';

const CSS = `
:host{display:flex;flex-direction:column;height:100%}
.lg{flex:1;min-height:0;overflow-y:auto;padding:var(--s-3)}
.ms{display:flex;flex-direction:column;gap:var(--s-2)}
.ey{color:var(--c-muted);font-size:var(--t-sm);text-align:center;padding:var(--s-5) 0}
.m{font-size:var(--t-md);line-height:1.5;white-space:pre-wrap}
.u,.a{padding:var(--s-2) var(--s-3)}
.u{align-self:flex-end;max-width:86%;background:var(--c-brand);color:var(--c-onbrand);border-radius:var(--r-m) var(--r-m) var(--r-s) var(--r-m)}
.a{background:var(--c-card);border:1px solid var(--c-border);border-radius:var(--r-m) var(--r-m) var(--r-m) var(--r-s)}
.t{align-self:flex-start}
.tw{display:flex;flex-wrap:wrap;gap:var(--s-1)}
.c{font-size:var(--t-xs);color:var(--c-muted);background:var(--c-muted-bg);border-radius:var(--r-f);padding:2px var(--s-2)}
.cu{display:inline-block;width:2px;height:1em;background:var(--c-brand);vertical-align:text-bottom;animation:blink 1s steps(2) infinite}
@keyframes blink{50%{opacity:0}}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
::slotted([slot^=card-]){margin-top:var(--s-2)}
.pl,.cb{border-radius:var(--r-f);font-size:var(--t-sm);cursor:pointer}
.pl{position:sticky;bottom:var(--s-2);margin:var(--s-2) auto 0;display:block;border:1px solid var(--c-border);background:var(--c-card);color:var(--c-muted);padding:var(--s-2) var(--s-3)}
.cs{display:flex;flex-wrap:wrap;gap:var(--s-2);padding:var(--s-2) var(--s-3) 0}
.cb{border:1px solid var(--c-brand);color:var(--c-brand);background:var(--c-card);padding:var(--s-1) var(--s-3)}
.cp{display:flex;align-items:flex-end;gap:var(--s-2);padding:var(--s-2) var(--s-3) calc(var(--s-2) + env(safe-area-inset-bottom));border-top:1px solid var(--c-border);background:var(--c-card)}
.in{flex:1;resize:none;border:1px solid var(--c-border);border-radius:var(--r-m);padding:var(--s-2);font:inherit;font-size:var(--t-input);background:var(--c-bg);color:var(--c-text);max-height:calc(var(--t-input) * 7.5);overflow-y:auto}
.in:focus-visible{outline:2px solid var(--c-brand);outline-offset:-1px}
.sd{border:none;border-radius:var(--r-m);background:var(--c-brand);color:var(--c-onbrand);font-size:var(--t-sm);padding:var(--s-2) var(--s-3);min-height:36px;cursor:pointer}
.eb{display:flex;align-items:center;gap:var(--s-2);margin:var(--s-2) 0;padding:var(--s-2) var(--s-3);background:var(--c-card);border:1px solid var(--c-danger);border-radius:var(--r-m);font-size:var(--t-sm)}
.tk{display:flex;gap:var(--s-1);align-items:center}
.tk i{width:6px;height:6px;border-radius:var(--r-f);background:var(--c-muted);animation:blink 1.2s infinite}
.tk i:nth-child(2){animation-delay:.2s}
.tk i:nth-child(3){animation-delay:.4s}
.x>:last-child{margin:0}.x :is(h1,h2,h3){font-weight:600;margin:var(--s-1) 0}.x ul,.x ol{margin:var(--s-1) 0;padding-left:1.4em}.x a{color:var(--c-brand)}.x code{font-family:ui-monospace,monospace;font-size:.92em;background:var(--c-muted-bg);border-radius:var(--r-f);padding:1px 4px}.cd{position:relative;border:1px solid var(--c-border);border-radius:var(--r-m);margin:var(--s-1) 0}.cd pre{margin:0;padding:var(--s-2);overflow-x:auto;font-family:ui-monospace,monospace;font-size:.92em}.cc{position:absolute;top:0;right:0;border:none;background:none;color:var(--c-brand);font-size:var(--t-xs);cursor:pointer;padding:var(--s-1) var(--s-2)}.cc::after{content:attr(aria-label)}.kt{border:1px solid var(--c-border);border-radius:var(--r-m);margin:0 0 var(--s-1)}.tb{color:var(--c-muted);font-size:var(--t-xs);cursor:pointer;padding:var(--s-1) var(--s-2)}.tx{max-height:9em;overflow-y:auto;padding:0 var(--s-2) var(--s-1);color:var(--c-muted);white-space:pre-wrap}.ma{display:flex;gap:var(--s-2);margin-top:var(--s-1)}.ma button{border:none;background:none;color:var(--c-muted);font-size:var(--t-xs);cursor:pointer;padding:0}
.eb .rt{margin-left:auto;border:none;background:none;color:var(--c-danger);font-size:var(--t-sm);cursor:pointer;padding:var(--s-1)}
@media(prefers-reduced-motion:reduce){.cu{animation:none}.tk span{animation:none}}`;

export class AfChat extends withI18n(AfElement) {
  static useShadow = true;
  static i18n = {
    'textarea.in':    ['placeholder', 'ct.ph', 'placeholder'],
    '.pl':            ['aria-label', 'ct.tl'],
    '.ey':            ['', 'ct.em'],
  };

  shadowHTML() {
    // data-role 为稳定测试契约（log/bubbles/chips/input/send/scroll-bottom/error/retry），
    // 自动化测试不必依赖 shadow 私有缩写 class（.lg/.ms/.in… 仅作样式钩子）
    return `${AfElement.cssTag(CSS, 'af-chat')}<div class="lg" data-role="log" role="log" aria-live="polite" tabindex="0"><div class="ms" data-role="bubbles"></div><button class="pl" data-role="scroll-bottom" hidden>↓</button></div><div class="cs" data-role="chips" hidden></div><div class="cp"><textarea class="in" data-role="input" rows="1"></textarea><button class="sd" data-role="send"></button></div>`;
  }

  // messages/session 手写 getter/setter（defineProp 的 Object 序列化到 attribute 不可接受）
  get messages() { return this._messages ?? []; }
  set messages(v) {
    if (this._session) return; // 绑定模式：session 为真相源
    this._messages = Array.isArray(v) ? v : [];
    if (this._mounted) { this._rmCards(); this._sync(); }
  }

  get session() { return this._session ?? null; }
  set session(s) {
    this._unsub?.();
    this._unsub = null;
    this._session = s ?? null;
    if (s) {
      this._unsub = s.subscribe(() => this._sync(s.state === 'streaming'));
      if (this._mounted) { this._rmCards(); this._sync(); }
    }
  }

  mounted() {
    this.shadowRoot.innerHTML ||= this.shadowHTML();
    this._listen(this.$('.sd'), 'click', () => (this.busy ? this._abort() : this._send()));
    // busy 时 Enter 不再吞掉：绑定模式入队（_send 内分流），受控模式维持忽略
    this._listen(this.$('.in'), 'keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._send(); }
    });
    this._listen(this.$('.in'), 'input', (e) => { this._grow(); this.emit('af-chat:draft', { text: e.target.value }); });
    this._listen(this.$('.lg'), 'scroll', () => this._scroll());
    this._listen(this.$('.lg'), 'click', (e) => this._bubbleAction(e)); // 代码块复制 / 操作行委托
    this._listen(this.$('.pl'), 'click', () => this.scrollToBottom());
    this._listen(this.$('.cs'), 'click', (e) => this._chip(e));
    this._listen(this, 'click', (e) => this._card(e)); // 卡片 light DOM 冒泡
    this._atBottom = true;
    this._sync();
  }

  unmounted() {
    this._unsub?.();
    this._unsub = null;
  }

  focus() { this.$('.in')?.focus(); }

  /**
   * 公开发送入口（宿主/自动化测试编程调用）：等价于在输入框输入 text 后触发发送。
   * 空文本静默忽略；busy 时绑定模式入队、受控模式忽略（与 UI 发送路径行为一致）。
   * @param {string} text
   * @returns {Promise<void>}
   */
  send(text) { return this._send(text); }

  // 清空会话（新建对话）：清 light DOM 卡片 → 绑定模式交内核 clear（通知后重渲染回空态）
  clear() {
    this._retryText = null;
    this._queued = null;
    this._rmCards();
    if (this._session) this._session.clear();
    else { this._messages = []; this._sync(); }
  }

  // 输入自动增高：贴合内容高度；上限由 CSS max-height 接管（超出则内部滚动，见 .in）
  _grow() {
    const ta = this.$('.in');
    if (!ta.scrollHeight) return;   // jsdom 无布局：保持 rows=1 初始高度
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }
  scrollToBottom() {
    this._atBottom = true;
    this.$('.pl').hidden = true;
    this._follow();
  }

  // === 渲染管线（受控/绑定统一：按 data-id 复用节点增量同步） ===
  _sync(streaming = false) {
    const msgs = this._session ? this._session.messages : this.messages;
    this._msgs = msgs;   // 操作行"复制全文"按 id 反查
    const box = this.$('.ms');
    box.querySelector('.tk')?.remove();
    if (!msgs.length) {
      box.innerHTML = `<div class="ey">${esc(this.t('ct.em'))}</div>`;
    } else {
      box.querySelector('.ey')?.remove();
      const ids = new Set(msgs.map((m) => m.id));
      for (const n of [...box.children]) if (n.dataset.id && !ids.has(n.dataset.id)) n.remove();
      const cm = toolCallMap(msgs);
      const last = msgs.at(-1);
      const byId = new Map([...box.children].map((n) => [n.dataset.id, n]));
      for (const m of msgs) {
        let el = byId.get(m.id);
        if (!el) {
          box.insertAdjacentHTML('beforeend', bubbleHTML(m, cm));
          el = box.lastElementChild;
          this._cards(m);
        }
        if (m.role === 'assistant') updateBubble(el, m, cm, streaming && m === last, (k) => this.t(k));
      }
    }
    // 首 token 未到达（streaming 且最后一条是 user）：三点占位（复用 blink 动画）；工具执行期已有 run 芯片，不重复
    if (streaming && msgs.at(-1)?.role === 'user')
      box.insertAdjacentHTML('beforeend', '<div class="m a tk"><i></i><i></i><i></i></div>');
    this._chips(msgs);
    this._busy();
    this._follow();
  }

  _cards(m) {
    for (const b of m.content)
      if (b.type === 'card' && b.card?.kind !== 'actions')
        this.appendChild(cardNode(m.id, b, (k) => this.t(k)));
  }

  _rmCards() { for (const n of [...this.querySelectorAll('[data-card-id]')]) n.remove(); }

  _chips(msgs) {
    const last = msgs.at(-1);
    const b = last?.role === 'assistant'
      ? last.content.find((x) => x.type === 'card' && x.card?.kind === 'actions') : null;
    const box = this.$('.cs');
    box.innerHTML = b ? chipsHTML(b.card) : '';
    box.hidden = !b;
    this._actionsId = b?.id ?? null;
  }

  _busy() {
    // 绑定模式：busy 跟随 session 状态机；受控模式：busy 由外部设置
    if (this._session) {
      const on = this._session.state === 'streaming';
      if (on !== this.busy) this.busy = on;
      // 忙碌排队消化：回空闲且有排队消息时自动发送（abort 后保留队列——用户敲过 Enter 即发送意图）
      if (!on && this._queued) { const q = this._queued; this._queued = null; this._send(q); }
    }
    this.$('.sd').textContent = this.busy ? this.t('ct.stop') : this.t('ct.send');
  }

  // === 滚动跟随 ===
  _scroll() {
    const log = this.$('.lg');
    this._atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
    this.$('.pl').hidden = this._atBottom;
  }

  _follow() {
    if (this._atBottom) { const log = this.$('.lg'); log.scrollTop = log.scrollHeight; }
  }

  // === 交互 ===
  async _send(text) {
    const ta = this.$('.in');
    const value = (text ?? ta.value).trim();
    if (!value) return;
    if (this.busy) {
      // 绑定模式忙碌排队：清空输入回落单行 + af-chat:queued 事件（宿主可 toast 提示）；受控模式维持忽略
      if (this._session) {
        this._queued = value;
        ta.value = '';
        this._grow();
        this.emit('af-chat:queued', { text: value });
      }
      return;
    }
    this.emit('af-chat:send', { text: value });
    this._retryText = value;
    ta.value = '';
    this._grow();   // 清空后回落到单行
    if (!this._session) return;   // 受控模式：由外部监听 af-chat:send 处理
    await this._run(this._session.send(value));
  }

  // 统一错误通道：中止静默，其余渲染错误条并派发 af-chat:error
  async _run(p) {
    try {
      await p;
    } catch (err) {
      if (err?.name === 'AbortError') return;
      this._err(err);
      this.emit('af-chat:error', { message: String(err?.message ?? err) });
    }
  }

  _abort() {
    this._session?.abort();
    this.emit('af-chat:abort', {});
  }

  // 重试：复用内核里已存在的 user 消息（不重新 push），失败可再次进入错误态
  _retry() {
    return this._run(this._session.retry());
  }

  // 气泡内委托：代码块复制（copy pre 纯文本）/ 操作行（复制全文 / 重新生成）；思考折叠由原生 details 处理
  _bubbleAction(e) {
    const cp = e.target.closest('[data-copy]');
    if (cp) {
      const pre = cp.closest('.cd')?.querySelector('pre');
      if (pre) navigator.clipboard?.writeText(pre.textContent);
      return;
    }
    const act = e.target.closest('.ma [data-act]');
    if (!act) return;
    if (act.dataset.act === 'cp') {
      const m = (this._msgs ?? []).find((x) => x.id === act.closest('.m')?.dataset.id);
      if (m) navigator.clipboard?.writeText(textOf(m));
    } else {
      this._run(this._session?.regenerate?.());
    }
  }

  _err(err) {
    const log = this.$('.lg');
    log.insertAdjacentHTML('beforeend',
      `<div class="eb" data-role="error"><span>${esc(String(err?.message ?? err))}</span><button class="rt" data-role="retry"></button></div>`);
    const bar = log.lastElementChild;
    const btn = bar?.querySelector('.rt');
    if (btn) {
      btn.textContent = this.t('ct.rt');
      this._listen(btn, 'click', () => {
        bar.remove();
        // 绑定模式走内核 retry（沿用原 user 消息，不重复 push）；受控模式无内核，退化为重发文本
        if (this._session) this._retry();
        else if (this._retryText) this._send(this._retryText);
      });
    }
  }

  _chip(e) {
    const btn = e.target.closest('.cb');
    if (!btn) return;
    this.emit('af-chat:action', { cardId: this._actionsId, value: btn.dataset.value });
    if (this._session) this._send(btn.dataset.value);
  }

  _card(e) {
    const host = e.target.closest('[data-card-id]');
    if (!host || !this.contains(host)) return;
    const ok = e.target.closest('[data-confirm]');
    if (ok || e.target.closest('[data-cancel]'))
      this.emit('af-chat:confirm', { cardId: host.dataset.cardId, accepted: !!ok });
  }
}

// 属性定义（必须在 customElements.define 之前）
AfElement.defineProp(AfChat.prototype, 'placeholder', null);
AfElement.defineProp(AfChat.prototype, 'busy', false);
