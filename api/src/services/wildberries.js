/**
 * Интеграция с API Wildberries
 * Документация: https://openapi.wildberries.ru/
 *
 * Для MVP — заглушка. В перспективе:
 * - API ключ в заголовке Authorization
 * - GET /api/v3/orders/new — новые заказы
 * - GET /api/v3/orders — заказы по датам
 * - Сопоставление nmId / supplierArticle с external_id товара
 */

export async function fetchOrders({ apiKey, baseUrl }) {
  if (!apiKey || !baseUrl) throw new Error('Wildberries: нужны apiKey и baseUrl');

  const res = await fetch(`${baseUrl}/api/v3/orders/new`, {
    headers: { Authorization: apiKey },
  });

  const data = await res.json();
  return data.orders ?? [];
}

