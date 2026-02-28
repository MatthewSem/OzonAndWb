import * as db from '../db/queries.js';
import { fetchOrders as fetchOzonOrders } from './ozon.js';
import { fetchOrders as fetchWBOrders } from './wildberries.js';


function isOzonOrderPaid(posting) {
  if (!posting) return false;

  if (posting.status === 'cancelled') return false;
  if (posting.cancellation?.cancel_reason_id > 0) return false;

  const allowedStatuses = [
    'awaiting_packaging',
    'awaiting_deliver',
    'delivering',
    'delivered',
  ];

  return allowedStatuses.includes(posting.status);
}


export async function syncOzon() {
  const productMapping = await db.getProductMapping('ozon'); // id по external_id
  const postings = await fetchOzonOrders({
    clientId: process.env.OZON_CLIENT_ID,
    apiKey: process.env.OZON_API_KEY,
    baseUrl: process.env.OZON_API_BASE,
  });

  let newOrders = 0;

  for (const p of postings) {
    if (!isOzonOrderPaid(p)) continue;

    const orderNumber = p.posting_number;
    if (!orderNumber || !p.products?.length) continue;

    for (const product of p.products) {
      const offerId = product.offer_id;
      if (!offerId) continue;

      const productId = productMapping[offerId];

      if (!productId) {
        console.warn('Ozon: не найден товар для offer_id:', offerId);
        continue;
      }

      const exists = await db.getOrderByNumber(orderNumber);

      if (!exists) {
        await db.createOrder({
          order_number: orderNumber,
          product_id: productId,
          marketplace: 'ozon',
          raw_data: p,
        });

        newOrders++;
      }
    }
  }

  console.log(`Ozon: добавлено новых заказов — ${newOrders}`);
  return newOrders;
}

export async function syncWB() {
  const productMapping = await db.getProductMapping('wildberries');
  const orders = await fetchWBOrders({ apiKey: process.env.WB_API_KEY, baseUrl: process.env.WB_API_BASE });

  let newOrders = 0;

  for (const o of orders) {

    const orderNumber = o.id?.toString(); // уникальный id WB
    const nmId = o.nm_id;

    if (!orderNumber || !nmId) continue;

    const productId = productMapping[nmId];

    if (!productId) {
      console.warn('WB: не найден товар для nm_id:', nmId);
      continue;
    }

    const exists = await db.getOrderByNumber(orderNumber);

    if (!exists) {
      await db.createOrder({
        order_number: orderNumber,
        product_id: productId,
        marketplace: 'wildberries',
        raw_data: o,
      });

      newOrders++;
    }
  }

  console.log(`Wildberries: добавлено новых заказов — ${newOrders}`);
  return newOrders;
}