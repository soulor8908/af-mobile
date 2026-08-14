import { describe, it, expect, beforeEach } from 'vitest';
import { getTheme, setTheme, toggleTheme, initTheme } from '../packages/ui/src/lib/theme.js';

describe('theme.js', () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = '';
    localStorage.clear();
  });

  it('getTheme：无显式设置时回退到 prefers-color-scheme', () => {
    // matchMedia polyfill 返回 matches=false → light
    expect(getTheme()).toBe('light');
  });

  it('getTheme：显式设置优先', () => {
    document.documentElement.dataset.theme = 'dark';
    expect(getTheme()).toBe('dark');
  });

  it('setTheme：写入 data-theme + localStorage + 派发事件', () => {
    let received = null;
    document.documentElement.addEventListener('themechange', (e) => { received = e.detail; });
    setTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(received).toBe('dark');
  });

  it('toggleTheme：dark ↔ light 来回切换', () => {
    setTheme('dark');
    toggleTheme();
    expect(getTheme()).toBe('light');
    toggleTheme();
    expect(getTheme()).toBe('dark');
  });

  it('initTheme：从 localStorage 恢复主题', () => {
    localStorage.setItem('theme', 'dark');
    expect(document.documentElement.dataset.theme).toBe('');
    initTheme();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('initTheme：无 localStorage 时不改变当前主题', () => {
    document.documentElement.dataset.theme = 'light';
    initTheme();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('initTheme：localStorage 非法值不应用', () => {
    localStorage.setItem('theme', 'hacker');
    initTheme();
    expect(document.documentElement.dataset.theme).toBe('');
  });

  it('initTheme：系统主题变化且未显式设定时派发 themechange', () => {
    let changeCb = null;
    const origMM = window.matchMedia;
    window.matchMedia = (query) => ({
      matches: false, media: query,
      addEventListener: (type, cb) => { if (type === 'change') changeCb = cb; },
    });
    const received = [];
    document.documentElement.addEventListener('themechange', (e) => received.push(e.detail));
    try {
      initTheme();
      changeCb({ matches: true });   // 系统切到 dark
      changeCb({ matches: false });  // 系统切回 light
      expect(received).toEqual(['dark', 'light']);
    } finally {
      window.matchMedia = origMM;
    }
  });

  it('initTheme：显式设定主题后系统变化不派发', () => {
    let changeCb = null;
    const origMM = window.matchMedia;
    window.matchMedia = (query) => ({
      matches: false, media: query,
      addEventListener: (type, cb) => { if (type === 'change') changeCb = cb; },
    });
    localStorage.setItem('theme', 'dark');
    document.documentElement.dataset.theme = 'dark';
    const received = [];
    document.documentElement.addEventListener('themechange', (e) => received.push(e.detail));
    try {
      initTheme();
      changeCb({ matches: true });
      expect(received).toEqual([]);
    } finally {
      window.matchMedia = origMM;
    }
  });

  it('SSR 守卫：无 document/localStorage 时不抛错', () => {
    // 临时移除全局对象模拟 SSR/Node 环境
    const origDoc = globalThis.document;
    const origLS = globalThis.localStorage;
    const origMM = globalThis.matchMedia;
    delete globalThis.document;
    delete globalThis.localStorage;
    delete globalThis.matchMedia;
    try {
      expect(() => getTheme()).not.toThrow();
      expect(() => setTheme('dark')).not.toThrow();
      expect(() => toggleTheme()).not.toThrow();
      expect(() => initTheme()).not.toThrow();
      expect(getTheme()).toBe('light');
    } finally {
      globalThis.document = origDoc;
      globalThis.localStorage = origLS;
      globalThis.matchMedia = origMM;
    }
  });
});
