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


export async function fetchOrders({ clientId, apiKey, baseUrl }) {
  if (!clientId || !apiKey || !baseUrl) {
    throw new Error('Ozon: нужны clientId, apiKey и baseUrl');
  }

  const res = await fetch(`${baseUrl}/v3/posting/fbs/list`, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dir: 'ASC',
      filter: { status: 'delivering' }, // пример фильтра
      limit: 100,
      offset: 0
    }),
  });

  const data = await res.json();
  return data.result?.postings ?? [];
}

