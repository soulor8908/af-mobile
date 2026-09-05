// af-mobile UI —— af-calendar：日历（T0.12 形态级：内联卡片默认 + popup 弹层变体）
// Shadow DOM，原生 Date/Intl.DateTimeFormat（无 i18n 字典依赖）
// 职责：单日期选择 + 月份导航 + min/max 约束 + 今天高亮
// popup 变体：popup attr 时渲染 <dialog class="cal-pop">（80% 高、16px 圆角、slide-up、
// confirm bar + 右上 close），open()/close() API，对齐 af-picker 的 dialog 模式
import { AfElement, escapeHtml as esc } from '../lib/af-element.js';

const CSS = `
  :host { display: block; background: var(--c-card); border-radius: var(--r-m); box-shadow: var(--shadow-sm); padding: var(--s-3); }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--s-2); }
  .nav { background: none; border: none; font-size: var(--t-lg); line-height: 1; color: var(--c-muted); cursor: pointer; padding: var(--s-1) var(--s-2); border-radius: var(--r-s); transition: background var(--dur-fast) var(--ease-out); }
  .nav:hover { background: var(--c-muted-bg); }
  .month { font-size: var(--t-md); font-weight: var(--fw-medium); }
  .weekdays, .grid { display: grid; grid-template-columns: repeat(7, 1fr); }
  .weekdays { color: var(--c-muted); font-size: var(--t-xs); text-align: center; padding: var(--s-1) 0 var(--s-2); }
  .blank { height: var(--af-day-h); }
  /* T0.12 Vant 对齐：64px 大格子（数字 + 底部文案位），列 flex */
  .day {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s-1);
    height: var(--af-day-h); font-size: var(--af-day-fs, 16px); color: var(--c-text);
    background: none; border: none; border-radius: var(--r-s); cursor: pointer;
    transition: background var(--dur-fast) var(--ease-out);
  }
  .day:hover:not(:disabled) { background: var(--c-muted-bg); }
  .day:disabled { color: var(--c-border); cursor: default; }
  .day-txt { font-size: var(--af-day-txt-fs, 10px); line-height: 1; }
  .day-today { outline: 1px solid var(--c-brand); outline-offset: -1px; }
  .day-inrange { background: var(--c-brand-soft); border-radius: 0; }
  .day-inrange:hover { background: var(--c-brand-soft); }
  .day-selected { background: var(--c-brand); color: var(--c-onbrand); font-weight: var(--fw-medium); }
  .day-selected .day-txt { color: var(--c-onbrand); }
  .day-selected:hover { background: var(--c-brand); }
  /* popup 变体（T0.12）：80% 高底部弹层，结构与 af-picker 的 dialog 模式对称 */
  :host([popup]) { display: contents; }
  .cal-pop {
    border: none; padding: 0; margin: auto 0 0 0;
    width: 100%; max-width: 100vw; height: 80%;
    background: var(--c-card);
    border-radius: var(--af-calendar-radius, 16px) var(--af-calendar-radius, 16px) 0 0;
    box-shadow: var(--shadow-lg);
    animation: cal-up var(--dur-base) var(--ease-out);
  }
  .cal-pop[open] { display: flex; flex-direction: column; }
  .cal-pop::backdrop { background: rgba(0, 0, 0, .7); }
  @keyframes cal-up { from { transform: translateY(100%); } }
  .cal-head {
    position: relative; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    padding: var(--s-3); border-bottom: 1px solid var(--c-border);
  }
  .cal-title { font-size: var(--t-md); font-weight: var(--fw-medium); color: var(--c-text); }
  .cal-close {
    position: absolute; right: var(--s-2); top: 50%; transform: translateY(-50%);
    background: none; border: none; color: var(--c-muted);
    font-size: var(--t-lg); line-height: 1; cursor: pointer; padding: var(--s-1);
  }
  .cal-body { flex: 1; overflow: auto; }
  .cal-pop .calendar { padding: var(--s-3); }
  .cal-confirm {
    flex-shrink: 0; height: var(--af-confirm-h, 44px);
    margin: var(--s-2) var(--s-3) calc(var(--s-2) + env(safe-area-inset-bottom));
    border: none; border-radius: var(--r-f);
    background: var(--c-brand); color: var(--c-onbrand);
    font: inherit; font-size: var(--t-md); cursor: pointer;
  }
  .cal-confirm:active { opacity: .8; }
  @media (prefers-reduced-motion: reduce) { .nav, .day { transition: none; } }
`;

const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export class AfCalendar extends AfElement {
  static useShadow = true;

  mounted() {
    // T0.12 Vant 对齐：64px 大格子（底部文案位承载 开始/结束/今天）
    this.style.setProperty('--af-day-h', '64px');
    // DSD 已在解析阶段挂载 shadow root 时不再覆盖初始渲染
    if (!this._dsdPrepopulated()) this._render();
    this._onClick = (e) => {
      // popup 形态：confirm / close 按钮（事件委托，重渲染后仍有效）
      if (e.target.closest('[data-cal-close]')) { this.close(); return; }
      if (e.target.closest('[data-cal-confirm]')) {
        this.emit('af-calendar:confirm', { value: this.value });
        this.close();
        return;
      }
      const nav = e.target.closest('[data-nav]');
      if (nav) { this._shiftMonth(Number(nav.dataset.nav)); return; }
      const day = e.target.closest('.day');
      if (day && !day.disabled && day.dataset.date) this._select(day.dataset.date);
    };
    this._listen(this.shadowRoot, 'click', this._onClick);
    // popup 形态：dialog light dismiss（Esc cancel / backdrop 点击），与 af-picker 对称
    const dlg = this.$('.cal-pop');
    if (dlg) {
      this._listen(dlg, 'cancel', (e) => { e.preventDefault(); this.close(); });
      this._listen(dlg, 'click', (e) => { if (e.target === dlg) this.close(); });
    }
  }

  // popup 变体 API（对齐 af-picker 的 open/close + 滚动锁/焦点存取）
  open() {
    if (!this.popup) return;
    const dlg = this.$('.cal-pop');
    if (!dlg || dlg.open) return;
    dlg.showModal();
    this._lockScroll();
    this.saveFocus();
  }

  close() {
    const dlg = this.$('.cal-pop');
    if (!dlg) return;
    if (dlg.open) dlg.close();
    this._unlockScroll();
    this.restoreFocus();
  }

  _ym() {
    if (this.month && /^\d{4}-\d{2}$/.test(this.month)) {
      const [y, m] = this.month.split('-').map(Number);
      return { y, m: m - 1 };
    }
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  }

  _fmtMonth({ y, m }) { return `${y}-${pad(m + 1)}`; }

  _shiftMonth(delta) {
    const { y, m } = this._ym();
    const nm = m + delta;
    this.month = this._fmtMonth({ y: nm < 0 ? y - 1 : nm > 11 ? y + 1 : y, m: ((nm % 12) + 12) % 12 });
    this.emit('af-calendar:monthchange', { month: this.month });
  }

  _select(date) {
    // T0.12：range 模式两态状态机（无起点/已有完整区间 → 重设起点；有起点 → 补终点或早于起点重开）
    if (this.type === 'range') {
      const v = Array.isArray(this.value) ? this.value : [];
      let next;
      if (!v[0] || v[1]) next = [date];
      else if (date >= v[0]) next = [v[0], date];
      else next = [date];
      this.value = next;
      this.emit('af-calendar:select', { value: next });
      return;
    }
    if (date === this.value) return;
    this.value = date;
    this.emit('af-calendar:select', { date });
  }

  _render() {
    if (!this.shadowRoot) return;
    const { y, m } = this._ym();
    const monthLabel = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long' }).format(new Date(y, m, 1));
    const weekdays = Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(new Date(2023, 0, 1 + i)));
    const firstDay = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const minD = this.min ? new Date(this.min) : null;
    const maxD = this.max ? new Date(this.max) : null;
    const today = fmtDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    let cells = '';
    for (let i = 0; i < firstDay; i++) cells += '<span class="blank"></span>';
    // T0.12 range 模式选中态：起止实心 + 中间日浅 brand；文案位 开始/结束/今天
    const isRange = this.type === 'range';
    const sel = isRange ? (Array.isArray(this.value) ? this.value : []) : [this.value];
    const start = sel[0];
    const end = sel[1];
    for (let d = 1; d <= dim; d++) {
      const dateStr = fmtDate(y, m, d);
      const dt = new Date(y, m, d);
      const disabled = (minD && dt < minD) || (maxD && dt > maxD);
      const isStart = dateStr === start;
      const isEnd = dateStr === end && end != null;
      const inRange = isRange && start && end && dateStr > start && dateStr < end;
      const isToday = dateStr === today;
      const cls = ['day',
        (isStart || isEnd) ? 'day-selected' : '',
        inRange ? 'day-inrange' : '',
        isToday ? 'day-today' : '',
      ].filter(Boolean).join(' ');
      const txt = (isStart && isEnd) ? '开始/结束' : isStart ? '开始' : isEnd ? '结束' : isToday ? '今天' : '';
      cells += `<button type="button" class="${cls}" data-date="${dateStr}"${disabled ? ' disabled' : ''}${(isStart || isEnd) ? ' aria-current="date"' : ''}><span class="day-num">${d}</span>${txt ? `<span class="day-txt">${txt}</span>` : '<span class="day-txt"></span>'}</button>`;
    }
    const trailing = (7 - ((firstDay + dim) % 7)) % 7;
    for (let i = 0; i < trailing; i++) cells += '<span class="blank"></span>';

    const inner = `
      <div class="calendar">
        <div class="header">
          <button class="nav" data-nav="-1" type="button" aria-label="上一月">‹</button>
          <div class="month">${esc(monthLabel)}</div>
          <button class="nav" data-nav="1" type="button" aria-label="下一月">›</button>
        </div>
        <div class="weekdays">${weekdays.map(w => `<span>${esc(w)}</span>`).join('')}</div>
        <div class="grid">${cells}</div>
      </div>
    `;
    this.shadowRoot.innerHTML = `
      ${AfElement.cssTag(CSS, 'af-calendar')}
      ${this.popup ? `
        <dialog class="cal-pop">
          <div class="cal-head">
            <div class="cal-title">${esc(this.title || '')}</div>
            <button class="cal-close" type="button" data-cal-close aria-label="关闭">×</button>
          </div>
          <div class="cal-body">${inner}</div>
          <button class="cal-confirm" type="button" data-cal-confirm>${esc(this.confirmText || '确定')}</button>
        </dialog>` : inner}
    `;
  }

  onAttributeChange(name) {
    if (name === 'popup' || name === 'type') { this._render(); return; }
    if (name === 'month' || name === 'value' || name === 'min' || name === 'max'
      || name === 'title' || name === 'confirm-text') {
      this._render();
    }
  }
}

AfElement.defineProp(AfCalendar.prototype, 'value', null);
AfElement.defineProp(AfCalendar.prototype, 'type', 'single');
AfElement.defineProp(AfCalendar.prototype, 'month', null);
AfElement.defineProp(AfCalendar.prototype, 'min', null);
AfElement.defineProp(AfCalendar.prototype, 'max', null);
AfElement.defineProp(AfCalendar.prototype, 'popup', false);
AfElement.defineProp(AfCalendar.prototype, 'title', null);
AfElement.defineProp(AfCalendar.prototype, 'confirmText', { attr: 'confirm-text', default: null });
