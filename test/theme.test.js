import { describe, it, expect, beforeEach } from 'vitest';
import { getTheme, setTheme, toggleTheme } from '../src/lib/theme.js';

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
});
