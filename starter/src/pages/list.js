// list —— 分页模板：supabase:// 契约 + af-list loadmore 判停 + 搜索过滤（设计 §4.2）
import { fetchPage, go } from '@af-mobile/ui';

const PAGE_SIZE = 20;

export default async function listPage(params, ctx) {
  ctx.outlet.innerHTML = `
    <main class="page">
      <section class="hero">
        <p class="eyebrow">AIFlow Starter</p>
        <h1 class="display">商品列表</h1>
        <p class="subtitle">分页加载 · 搜索过滤 · 点击进详情</p>
      </section>
      <af-search-bar placeholder="搜索商品"></af-search-bar>
      <af-list data-role="list" page-size="${PAGE_SIZE}"></af-list>
    </main>`;

  const list = ctx.outlet.querySelector('[data-role="list"]');
  const search = ctx.outlet.querySelector('af-search-bar');
  let keyword = '';
  let page = 1;

  async function load(reset) {
    if (reset) { page = 1; list.data = []; }
    const like = keyword ? `&title=ilike.*${encodeURIComponent(keyword)}*` : '';
    const { data, total } = await fetchPage(`supabase://products?select=id,title,price&order=created_at.desc${like}`, {
      page, pageSize: PAGE_SIZE, signal: ctx.signal,
    });
    list.data = [...(reset ? [] : list.data), ...data];
    if (total != null && list.data.length >= total) list.endLoadMore(false);   // 已到底：停 loadmore
  }

  list.addEventListener('af-list:loadmore', async () => {
    page += 1;
    await load(false);
    list.endLoadMore(true);
  });
  list.addEventListener('af-list:itemclick', (e) => {
    go(`/detail/${e.detail.item.id}`);
  });
  search?.addEventListener('af-search-bar:search', async (e) => {
    keyword = e.detail?.value ?? '';
    await load(true);
  });

  await load(true);
}
