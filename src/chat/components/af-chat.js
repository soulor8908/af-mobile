// af-mobile UI —— af-chat：AI 对话容器（chat 子库，Shadow DOM 外壳 + 白名单卡片投影）
// 双模式：session（绑定 createSession 实例）/ messages（受控）；统一 _sync 增量渲染（按 data-id 复用节点）
// 卡片：card 内容块 → host light DOM 子节点（slot=card-{msgId} 投影），白名单 class 构建
// 体积口径：① CSS 字符串紧凑单行（esbuild minify 不压缩 JS 模板字符串内空白）
//           ② shadow 私有 class 用 1-2 字符缩写（.lg 日志区/.ms 气泡列/.cs 快捷回复/.cp 输入区/
//              .in 输入框/.sd 发送钮/.cb 回复钮/.pl 回底钮/.eb 错误条/.rt 重试钮/.ey 空态）
import { AfElement, escapeHtml as esc } from '../../lib/af-element.js';
import { withI18n } from '../../lib/with-i18n.js';
import { bubbleHTML, updateBubble, cardNode, chipsHTML, toolCallMap } from '../lib/render.js';

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
.in{flex:1;resize:none;border:1px solid var(--c-border);border-radius:var(--r-m);padding:var(--s-2);font:inherit;font-size:var(--t-input);background:var(--c-bg);color:var(--c-text)}
.in:focus-visible{outline:2px solid var(--c-brand);outline-offset:-1px}
.sd{border:none;border-radius:var(--r-m);background:var(--c-brand);color:var(--c-onbrand);font-size:var(--t-sm);padding:var(--s-2) var(--s-3);min-height:36px;cursor:pointer}
.eb{display:flex;align-items:center;gap:var(--s-2);margin:var(--s-2) 0;padding:var(--s-2) var(--s-3);background:var(--c-card);border:1px solid var(--c-danger);border-radius:var(--r-m);font-size:var(--t-sm)}
.eb .rt{margin-left:auto;border:none;background:none;color:var(--c-danger);font-size:var(--t-sm);cursor:pointer;padding:var(--s-1)}
@media(prefers-reduced-motion:reduce){.cu{animation:none}}`;

export class AfChat extends withI18n(AfElement) {
  static useShadow = true;
  static i18n = {
    'textarea.in':    ['placeholder', 'ct.ph', 'placeholder'],
    '.pl':            ['aria-label', 'ct.tl'],
    '.ey':            ['', 'ct.em'],
  };

  shadowHTML() {
    return `${AfElement.cssTag(CSS, 'af-chat')}<div class="lg" role="log" aria-live="polite" tabindex="0"><div class="ms"></div><button class="pl" hidden>↓</button></div><div class="cs" hidden></div><div class="cp"><textarea class="in" rows="1"></textarea><button class="sd"></button></div>`;
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
    this._listen(this.$('.in'), 'keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!this.busy) this._send(); }
    });
    this._listen(this.$('.lg'), 'scroll', () => this._scroll());
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
  scrollToBottom() {
    this._atBottom = true;
    this.$('.pl').hidden = true;
    this._follow();
  }

  // === 渲染管线（受控/绑定统一：按 data-id 复用节点增量同步） ===
  _sync(streaming = false) {
    const msgs = this._session ? this._session.messages : this.messages;
    const box = this.$('.ms');
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
        if (m.role === 'assistant') updateBubble(el, m, cm, streaming && m === last);
      }
    }
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
    this.emit('af-chat:send', { text: value });
    this._retryText = value;
    ta.value = '';
    if (!this._session) return;
    try {
      await this._session.send(value);
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

  _err(err) {
    const log = this.$('.lg');
    log.insertAdjacentHTML('beforeend',
      `<div class="eb"><span>${esc(String(err?.message ?? err))}</span><button class="rt"></button></div>`);
    const bar = log.lastElementChild;
    const btn = bar?.querySelector('.rt');
    if (btn) {
      btn.textContent = this.t('ct.rt');
      this._listen(btn, 'click', () => {
        bar.remove();
        if (this._session && this._retryText) this._send(this._retryText);
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
