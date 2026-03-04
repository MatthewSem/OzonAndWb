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

export async function fetchOrders(dateFrom) {
  const unixFrom = Math.floor(new Date(dateFrom).getTime() / 1000);

  const limit = 100;
  let next = 0;
  let all = [];
  let previousNext = null;
  let safetyCounter = 0;

  while (true) {
    const res = await fetch(
      `${process.env.WB_API_BASE}/api/v3/orders?limit=${limit}&next=${next}&dateFrom=${unixFrom}`,
      {
        headers: {
          Authorization: process.env.WB_API_KEY,
        },
      }
    );

    const data = await res.json();

    if (!data.orders) {
      console.log("WB ERROR:", data);
      break;
    }

    all.push(...data.orders);

    console.log("WB batch:", data.orders.length, "next:", data.next);

    // 🔴 Условие выхода №1 — данных меньше лимита
    if (data.orders.length < limit) break;

    // 🔴 Условие выхода №2 — next не меняется
    if (!data.next || data.next === previousNext) break;

    previousNext = next;
    next = data.next;

    // 🔴 Условие выхода №3 — защита от бесконечного цикла
    safetyCounter++;
    if (safetyCounter > 50) {
      console.log("WB safety break");
      break;
    }
  }
  return all;
}