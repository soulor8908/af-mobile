// AIFlow UI —— af-calendar：日历
// Shadow DOM，原生 Date/Intl.DateTimeFormat（无 i18n 字典依赖）
// 职责：单日期选择 + 月份导航 + min/max 约束 + 今天高亮
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
  .day {
    display: flex; align-items: center; justify-content: center;
    height: var(--af-day-h); font-size: var(--t-sm); color: var(--c-text);
    background: none; border: none; border-radius: var(--r-s); cursor: pointer;
    transition: background var(--dur-fast) var(--ease-out);
  }
  .day:hover:not(:disabled) { background: var(--c-muted-bg); }
  .day:disabled { color: var(--c-border); cursor: default; }
  .day-today { outline: 1px solid var(--c-brand); outline-offset: -1px; }
  .day-selected { background: var(--c-brand); color: var(--c-onbrand); font-weight: var(--fw-medium); }
  .day-selected:hover { background: var(--c-brand); }
  @media (prefers-reduced-motion: reduce) { .nav, .day { transition: none; } }
`;

const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export class AfCalendar extends AfElement {
  static useShadow = true;

  mounted() {
    this.style.setProperty('--af-day-h', '40px');
    // DSD 已在解析阶段挂载 shadow root 时不再覆盖初始渲染
    if (!this._dsdPrepopulated()) this._render();
    this._onClick = (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) { this._shiftMonth(Number(nav.dataset.nav)); return; }
      const day = e.target.closest('.day');
      if (day && !day.disabled && day.dataset.date) this._select(day.dataset.date);
    };
    this._listen(this.shadowRoot, 'click', this._onClick);
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
    if (date === this.value) return;
    this.value = date;
    this.emit('af-calendar:select', { date });
  }

  _render() {
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
    for (let d = 1; d <= dim; d++) {
      const dateStr = fmtDate(y, m, d);
      const dt = new Date(y, m, d);
      const disabled = (minD && dt < minD) || (maxD && dt > maxD);
      const cls = ['day', dateStr === this.value ? 'day-selected' : '', dateStr === today ? 'day-today' : ''].filter(Boolean).join(' ');
      cells += `<button type="button" class="${cls}" data-date="${dateStr}"${disabled ? ' disabled' : ''}${dateStr === this.value ? ' aria-current="date"' : ''}>${d}</button>`;
    }
    const trailing = (7 - ((firstDay + dim) % 7)) % 7;
    for (let i = 0; i < trailing; i++) cells += '<span class="blank"></span>';

    this.shadowRoot.innerHTML = `
      ${AfElement.cssTag(CSS, 'af-calendar')}
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
  }

  onAttributeChange(name) {
    if (this.$('.calendar') && (name === 'month' || name === 'value' || name === 'min' || name === 'max')) {
      this._render();
    }
  }
}

AfElement.defineProp(AfCalendar.prototype, 'value', null);
AfElement.defineProp(AfCalendar.prototype, 'month', null);
AfElement.defineProp(AfCalendar.prototype, 'min', null);
AfElement.defineProp(AfCalendar.prototype, 'max', null);
