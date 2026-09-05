// af-mobile UI —— af-countdown：倒计时
// Light DOM；time（秒）+ autostart + format（DD 天 HH 时 mm 分 ss 秒，默认 mm:ss）；
// start/pause/reset，结束派发 af-countdown:end
// T2.5 Vant 对齐：超时自动升粒度（>59 分出 HH、>99 时出 DD，即使 format 未声明）
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
    const f0 = this.format || 'mm:ss';
    // 自动升粒度：mm:ss 下 >1 时出 HH、>1 天出 DD（显式高位 format 不干预）
    let f = f0;
    if (f0 === 'mm:ss') {
      if (Math.floor(s / 86400) > 0) f = 'DD天HH:mm:ss';
      else if (Math.floor(s / 3600) > 0) f = 'HH:mm:ss';
    }
    // 高位 token 缺席时低位承载总量（无 DD 的 HH=总小时，无 HH 的 mm=总分钟），与旧版 mm:ss 行为兼容
    const useD = /DD/.test(f);
    const useH = /HH/.test(f);
    const d = Math.floor(s / 86400);
    const h = useD ? Math.floor((s % 86400) / 3600) : Math.floor(s / 3600);
    const m = useH ? Math.floor((s % 3600) / 60) : Math.floor(s / 60);
    const sec = s % 60;
    const p = (n) => String(n).padStart(2, '0');
    return f
      .replace(/DD/g, p(d))
      .replace(/HH/g, p(h))
      .replace(/mm/g, p(m))
      .replace(/ss/g, p(sec));
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
    if (name === 'time' || name === 'format') this.reset();
  }

  unmounted() {
    this.pause();
    clearInterval(this._timer);
  }
}

AfElement.defineProp(AfCountdown.prototype, 'time', 60);
AfElement.defineProp(AfCountdown.prototype, 'autostart', true);
AfElement.defineProp(AfCountdown.prototype, 'format', null);