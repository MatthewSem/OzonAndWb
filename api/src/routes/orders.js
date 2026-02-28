import { Router } from 'express';
import * as db from '../db/queries.js';
import { requireAdmin } from '../middleware/auth.js';
import { syncOzon, syncWB } from '../services/sync.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { search, marketplace, was_activated } = req.query;
    const orders = await db.getOrders({
      search,
      marketplace: marketplace || undefined,
      was_activated: was_activated === 'true' ? true : was_activated === 'false' ? false : undefined,
    });
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { order_number, product_id, marketplace, raw_data } = req.body;
    if (!order_number || !marketplace) return res.status(400).json({ error: 'order_number и marketplace обязательны' });
    const order = await db.createOrder({ order_number, product_id, marketplace, raw_data });
    res.status(201).json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Bulk add
router.post('/bulk', async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Нужен массив заказов' });
    const orders = await db.createOrdersBulk(items);
    res.status(201).json({ created: orders.length, orders });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// 🔄 Ручная синхронизация маркетплейсов
router.post('/sync', requireAdmin, async (req, res) => {
  try {
    const ozonAdded = await syncOzon();
    const wbAdded = await syncWB();
    res.json({
      ok: true,
      message: 'Синхронизация выполнена',
      ozon_new_orders: ozonAdded,
      wb_new_orders: wbAdded,
    });
  } catch (e) {
    console.error('Ошибка синхронизации:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
