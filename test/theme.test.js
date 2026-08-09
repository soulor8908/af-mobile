import { describe, it, expect, beforeEach } from 'vitest';
import { getTheme, setTheme, toggleTheme, initTheme } from '../src/lib/theme.js';

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
});
