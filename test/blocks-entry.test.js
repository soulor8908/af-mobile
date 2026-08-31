// blocks 子库入口（src/blocks/index.js）：registerBlocks / BLOCK_TAGS / 导出完整性
import { describe, it, expect } from 'vitest';
import {
  registerBlocks, BLOCK_TAGS,
  AfProductCard, AfSettingGroup, AfProductGrid, AfOrderList, AfAuthForm,
} from '../src/blocks/index.js';

describe('blocks 入口', () => {
  it('导出全部组件类与 BLOCK_TAGS 映射', () => {
    expect(AfProductCard).toBeInstanceOf(Function);
    expect(AfSettingGroup).toBeInstanceOf(Function);
    expect(AfProductGrid).toBeInstanceOf(Function);
    expect(AfOrderList).toBeInstanceOf(Function);
    expect(AfAuthForm).toBeInstanceOf(Function);
    expect(BLOCK_TAGS).toEqual({
      'af-product-card': AfProductCard,
      'af-setting-group': AfSettingGroup,
      'af-product-grid': AfProductGrid,
      'af-order-list': AfOrderList,
      'af-auth-form': AfAuthForm,
    });
  });

  it('registerBlocks(tag) 只注册指定标签', () => {
    registerBlocks('af-setting-group');
    expect(customElements.get('af-setting-group')).toBe(AfSettingGroup);
    expect(customElements.get('af-product-card')).toBeUndefined();
  });

  it('registerBlocks() 全量注册全部标签（幂等）', () => {
    registerBlocks();
    registerBlocks(); // 重复调用安全
    expect(customElements.get('af-product-card')).toBe(AfProductCard);
    expect(customElements.get('af-product-grid')).toBe(AfProductGrid);
    expect(customElements.get('af-order-list')).toBe(AfOrderList);
    expect(customElements.get('af-auth-form')).toBe(AfAuthForm);
  });

  it('registerBlocks(未知标签) 抛错', () => {
    expect(() => registerBlocks('af-nope')).toThrow(/unknown component/);
  });
});
