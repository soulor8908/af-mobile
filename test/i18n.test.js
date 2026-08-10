import { describe, it, expect, beforeEach, vi } from 'vitest';
import { t, getLocale, setLocale, initLocale, addMessages, messages } from '../src/lib/i18n.js';

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
    // 每个测试前重置为默认 zh-CN（避免 addMessages 测试的覆盖污染后续测试）
    setLocale('zh-CN');
  });

  describe('t()', () => {
    it('基本翻译：zh-CN', () => {
      expect(t('dg.cl')).toBe('关闭');
      expect(t('as.cn')).toBe('取消');
    });

    it('占位符替换', () => {
      expect(t('ls.al', { n: 5 })).toBe('列表，共 5 项');
      expect(t('pk.col', { n: 2 })).toBe('第 2 列');
    });

    it('多占位符替换', () => {
      expect(t('sw.dot', { current: 2, total: 5 })).toBe('第 2 张，共 5 张');
    });

    it('未声明占位符保留原样', () => {
      expect(t('ls.al')).toBe('列表，共 {n} 项');
    });

    it('key 不存在回退到 key 自身', () => {
      expect(t('xx.yy')).toBe('xx.yy');
    });

    it('locale 不存在回退到 zh-CN', () => {
      setLocale('ja-JP');
      expect(t('dg.cl')).toBe('关闭');
    });

    it('en-US 翻译', () => {
      setLocale('en-US');
      expect(t('dg.cl')).toBe('Close');
      expect(t('ls.al', { n: 5 })).toBe('List, 5 items');
    });

    it('vars 中含 0 / false / 空串时正确替换', () => {
      expect(t('ls.al', { n: 0 })).toBe('列表，共 0 项');
      expect(t('ls.al', { n: false })).toBe('列表，共 false 项');
      expect(t('ls.al', { n: '' })).toBe('列表，共  项');
    });
  });

  describe('getLocale()', () => {
    it('默认 zh-CN', () => {
      expect(getLocale()).toBe('zh-CN');
    });
  });

  describe('setLocale()', () => {
    it('切换语言', () => {
      setLocale('en-US');
      expect(getLocale()).toBe('en-US');
    });

    it('持久化到 localStorage', () => {
      setLocale('en-US');
      expect(localStorage.getItem('locale')).toBe('en-US');
    });

    it('设置 documentElement.lang', () => {
      setLocale('en-US');
      expect(document.documentElement.lang).toBe('en-US');
    });

    it('触发 localechange 事件', () => {
      const handler = vi.fn();
      document.documentElement.addEventListener('localechange', handler);
      setLocale('en-US');
      document.documentElement.removeEventListener('localechange', handler);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: 'en-US' }));
    });

    it('相同语言不触发事件', () => {
      const handler = vi.fn();
      document.documentElement.addEventListener('localechange', handler);
      setLocale('zh-CN');
      document.documentElement.removeEventListener('localechange', handler);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('initLocale()', () => {
    it('从 localStorage 恢复', () => {
      localStorage.setItem('locale', 'en-US');
      initLocale();
      expect(getLocale()).toBe('en-US');
    });

    it('localStorage 无值时保持默认', () => {
      initLocale();
      expect(getLocale()).toBe('zh-CN');
    });
  });

  describe('addMessages()', () => {
    it('注册新语言', () => {
      addMessages('ja-JP', { 'dg.cl': '閉じる' });
      setLocale('ja-JP');
      expect(t('dg.cl')).toBe('閉じる');
    });

    it('覆盖已有 key', () => {
      addMessages('zh-CN', { 'dg.cl': '关闭窗口' });
      expect(t('dg.cl')).toBe('关闭窗口');
    });

    it('浅合并不影响其他 key', () => {
      addMessages('zh-CN', { 'custom.key': '自定义' });
      expect(t('custom.key')).toBe('自定义');
      expect(t('as.cn')).toBe('取消');
    });
  });

  describe('messages 导出', () => {
    it('包含 zh-CN 和 en-US', () => {
      expect(messages['zh-CN']).toBeDefined();
      expect(messages['en-US']).toBeDefined();
    });
  });
});
