import { describe, it, expect, beforeEach, vi } from 'vitest';
import { t, getLocale, setLocale, initLocale, addMessages, messages, _resetLoaders } from '../packages/ui/src/lib/i18n.js';

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

  describe('复数规则（CLDR plural）', () => {
    const enItems = { one: '{n} item', other: '{n} items' };

    it('en：n=1 用 one，其余用 other', () => {
      addMessages('en-US', { 'test.items': enItems });
      setLocale('en-US');
      expect(t('test.items', { n: 1 })).toBe('1 item');
      expect(t('test.items', { n: 0 })).toBe('0 items');
      expect(t('test.items', { n: 2 })).toBe('2 items');
    });

    it('zh：恒为 other（无复数）', () => {
      addMessages('zh-CN', { 'test.items': { one: '1 项', other: '{n} 项' } });
      expect(t('test.items', { n: 1 })).toBe('1 项');
      expect(t('test.items', { n: 3 })).toBe('3 项');
    });

    it('fr：n=0/1 用 one', () => {
      addMessages('fr-FR', { 'test.items': { one: '{n} élément', other: '{n} éléments' } });
      setLocale('fr-FR');
      expect(t('test.items', { n: 0 })).toBe('0 élément');
      expect(t('test.items', { n: 1 })).toBe('1 élément');
      expect(t('test.items', { n: 5 })).toBe('5 éléments');
    });

    it('ar：六形式（zero/one/two/few/many/other）', () => {
      addMessages('ar-SA', {
        'test.items': {
          zero: 'لا عناصر', one: 'عنصر واحد', two: 'عنصران',
          few: '{n} عناصر', many: '{n} عنصرًا', other: '{n} عنصر',
        },
      });
      setLocale('ar-SA');
      expect(t('test.items', { n: 0 })).toBe('لا عناصر');
      expect(t('test.items', { n: 1 })).toBe('عنصر واحد');
      expect(t('test.items', { n: 2 })).toBe('عنصران');
      expect(t('test.items', { n: 3 })).toBe('3 عناصر');
      expect(t('test.items', { n: 11 })).toBe('11 عنصرًا');
      expect(t('test.items', { n: 100 })).toBe('100 عنصر');
    });

    it('ru：one/few/many 三形式', () => {
      addMessages('ru-RU', {
        'test.items': { one: '{n} элемент', few: '{n} элемента', many: '{n} элементов' },
      });
      setLocale('ru-RU');
      expect(t('test.items', { n: 1 })).toBe('1 элемент');
      expect(t('test.items', { n: 2 })).toBe('2 элемента');
      expect(t('test.items', { n: 5 })).toBe('5 элементов');
      expect(t('test.items', { n: 21 })).toBe('21 элемент');
    });

    it('未知语言回退 en 规则', () => {
      addMessages('ko-KR', { 'test.items': enItems });
      setLocale('ko-KR');
      expect(t('test.items', { n: 1 })).toBe('1 item');
      expect(t('test.items', { n: 7 })).toBe('7 items');
    });

    it('复数条目选形与 other 均缺失时回退 key', () => {
      addMessages('en-US', { 'test.missing': { one: 'single' } });
      setLocale('en-US');
      expect(t('test.missing', { n: 2 })).toBe('test.missing');
    });

    it('复数条目无 n 时用 other 且不崩', () => {
      addMessages('en-US', { 'test.noarg': enItems });
      setLocale('en-US');
      expect(t('test.noarg')).toBe('{n} items');
    });

    it('复数条目不干扰普通字符串翻译', () => {
      addMessages('en-US', { 'test.mix': enItems });
      setLocale('en-US');
      expect(t('dg.cl')).toBe('Close');
      expect(t('dg.cl', { n: 3 })).toBe('Close');
    });
  });

  describe('messages 导出', () => {
    it('包含 zh-CN 和 en-US', () => {
      expect(messages['zh-CN']).toBeDefined();
      expect(messages['en-US']).toBeDefined();
    });
  });

  describe('addMessages() 懒加载', () => {
    beforeEach(() => {
      _resetLoaders();
      addMessages('zh-CN', { 'dg.cl': '关闭' });  // 还原 zh-CN，隔离前序用例对 messages 的覆盖污染
    });

    it('函数 loader 返回 Promise：加载后翻译生效', async () => {
      const p = addMessages('ja-JP', () => Promise.resolve({ 'dg.cl': '閉じる' }));
      expect(p).toBeInstanceOf(Promise);
      await p;
      setLocale('ja-JP');
      expect(t('dg.cl')).toBe('閉じる');
    });

    it('函数 loader 同步返回字典同样生效', async () => {
      await addMessages('ko-KR', () => ({ 'dg.cl': '닫기' }));
      setLocale('ko-KR');
      expect(t('dg.cl')).toBe('닫기');
    });

    it('重复调用同一 locale 的 loader 只执行一次', async () => {
      const loader = vi.fn(() => Promise.resolve({ 'dg.cl': '閉じる' }));
      const a = addMessages('ja-JP', loader);
      const b = addMessages('ja-JP', loader);
      expect(a).toBe(b);
      await a;
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('浅合并不影响其他 key', async () => {
      await addMessages('fr-FR', () => Promise.resolve({ 'custom.key': 'perso' }));
      setLocale('fr-FR');
      expect(t('custom.key')).toBe('perso');
      expect(t('dg.cl')).toBe('关闭');  // 未提供 key 回退 zh-CN
    });

    it('loader 加载成功后仍可用普通字典覆盖', async () => {
      await addMessages('ja-JP', () => Promise.resolve({ 'dg.cl': '閉じる' }));
      addMessages('ja-JP', { 'dg.cl': '閉じる（改）' });
      setLocale('ja-JP');
      expect(t('dg.cl')).toBe('閉じる（改）');
    });

    it('loader 失败后可重试', async () => {
      const loader = vi.fn()
        .mockRejectedValueOnce(new Error('load failed'))
        .mockResolvedValueOnce({ 'dg.cl': '閉じる' });
      await expect(addMessages('ja-JP', loader)).rejects.toThrow('load failed');
      await addMessages('ja-JP', loader);
      setLocale('ja-JP');
      expect(t('dg.cl')).toBe('閉じる');
      expect(loader).toHaveBeenCalledTimes(2);
    });

    it('加载完成前翻译回退 zh-CN 不抛错', () => {
      addMessages('de-DE', () => new Promise(() => {}));  // 永不 resolve
      setLocale('de-DE');
      expect(t('dg.cl')).toBe('关闭');
    });
  });
});
