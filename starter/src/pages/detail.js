// detail —— :param 路由 + 单资源获取模板（设计 §4.2）
import { fetchPage, escapeHtml as esc } from '@af-mobile/ui';

export default async function detailPage(params, ctx) {
  const { data } = await fetchPage(
    `supabase://products?select=id,title,price,image_url&order=id.desc&id=eq.${encodeURIComponent(params.id)}`,
    { signal: ctx.signal },
  );
  const item = data[0];

  ctx.outlet.innerHTML = `
    <main class="page">
      <af-navbar title="商品详情"></af-navbar>
      ${item ? `
        <section class="card">
          <h2 class="title">${esc(item.title)}</h2>
          <p class="caption">¥${Number(item.price).toFixed(2)}</p>
          ${item.image_url ? `<af-img src="${esc(item.image_url)}" alt="${esc(item.title)}"></af-img>` : ''}
        </section>` : `
        <p class="caption">未找到该商品（id=${esc(params.id)}）</p>`}
    </main>`;
}
