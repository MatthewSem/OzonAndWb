import * as db from '../db/queries.js';
import { fetchOrders as fetchOzonOrders } from './ozon.js';
import { fetchOrders as fetchWBOrders } from './wildberries.js';

function subtractDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

export async function syncOzon() {
  const START_DATE = new Date('2026-03-04T00:00:00Z');

  let lastSync = await db.getLastSync('ozon');
  if (!lastSync) lastSync = START_DATE;

  const safeSince = subtractDays(new Date(lastSync), 2);
  const now = new Date();

  const postings = await fetchOzonOrders({
    since: safeSince.toISOString(),
    to: now.toISOString(),
  });

  const productMapping = await db.getProductMapping('ozon');
  let newOrders = 0;

  for (const p of postings) {
    const orderNumber = p.posting_number;
    if (!orderNumber) continue;

    for (const product of p.products ?? []) {
      const productId = productMapping[product.sku];
      if (!productId) continue;
      
      const exists = await db.getOrderByNumberAndProduct(orderNumber, productId, 'ozon');
      if (exists) continue;

      await db.createOrder({
        order_number: orderNumber,
        product_id: productId,
        marketplace: 'ozon',
        raw_data: p,
      });

      newOrders++;
    }
  }

  await db.setLastSync('ozon', now);

  console.log(`Ozon: +${newOrders}`);
  return newOrders;
}


export async function syncWB() {
  const START_DATE = new Date('2026-03-04T00:00:00Z');

  let lastSync = await db.getLastSync('wildberries');
  if (!lastSync) lastSync = START_DATE;

  const safeSince = new Date(lastSync);
  safeSince.setDate(safeSince.getDate() - 2);

  const orders = await fetchWBOrders(
    safeSince.toISOString()
  );

  const productMapping = await db.getProductMapping('wildberries');
  let newOrders = 0;

  for (const o of orders) {
    const orderNumber = o.id?.toString();

    const nmId = o.nmId;

    if (!orderNumber || !nmId) continue;

    const productId = productMapping[nmId];
    if (!productId) continue;

    const exists = await db.getOrderByNumberAndProduct(
      orderNumber,
      productId,
      'wildberries'
    );

    if (exists) continue;

    await db.createOrder({
      order_number: orderNumber,
      product_id: productId,
      marketplace: 'wildberries',
      raw_data: o,
    });

    newOrders++;
  }

  await db.setLastSync('wildberries', new Date());

  console.log(`WB: +${newOrders}`);
  return newOrders;
}