// af-mobile UI —— af-countdown：倒计时
// Light DOM；time（秒）+ autostart；mm:ss 展示，start/pause/reset，结束派发 af-countdown:end
import { AfElement } from '../lib/af-element.js';

export class AfCountdown extends AfElement {
  static useShadow = false;

  mounted() {
    this._remaining = Math.max(0, Number(this.time) || 0);
    this._timer = null;
    this._render();
    if (this.autostart && this._remaining > 0) this.start();
  }

  _fmt(s) {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${m}:${sec}`;
  }

  _render() {
    this.innerHTML = `<span data-role="countdown" role="timer" aria-live="off">${this._fmt(this._remaining)}</span>`;
  }

  start() {
    this.pause();
    if (this._remaining <= 0) return;
    this._timer = setInterval(() => {
      this._remaining -= 1;
      this._render();
      this.emit('af-countdown:change', { remaining: this._remaining, total: Number(this.time) });
      if (this._remaining <= 0) {
        this.pause();
        this.emit('af-countdown:end', {});
      }
    }, 1000);
  }

  pause() {
    if (this._timer != null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  reset() {
    this.pause();
    this._remaining = Math.max(0, Number(this.time) || 0);
    this._render();
  }

  onAttributeChange(name) {
    if (name === 'time') this.reset();
  }

  unmounted() {
    this.pause();
    clearInterval(this._timer);
  }
}

AfElement.defineProp(AfCountdown.prototype, 'time', 60);
AfElement.defineProp(AfCountdown.prototype, 'autostart', true);