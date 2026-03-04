/**
 * Интеграция с API Ozon Seller
 * Документация: https://docs.ozon.ru/api/seller/
 *
 * Для MVP — заглушка. В перспективе:
 * - OAuth / Client-ID + API Key
 * - POST /v3/posting/fbs/list — список отправлений
 * - POST /v2/posting/fbo/list — FBO заказы
 * - Сопоставление external_id товара с артикулом на Ozon
 */


export async function fetchOrders(filter) {
  let offset = 0;
  const limit = 100;
  const all = [];

  while (true) {
    const res = await fetch(`${process.env.OZON_API_BASE}/v3/posting/fbs/list`, {
      method: 'POST',
      headers: {
        'Client-Id': process.env.OZON_CLIENT_ID,
        'Api-Key': process.env.OZON_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dir: 'ASC',
        filter,
        limit,
        offset,
      }),
    });

    const data = await res.json();
    const items = data.result?.postings ?? [];

    all.push(...items);

    if (items.length < limit) break;
    offset += limit;
  }

  return all;
}
