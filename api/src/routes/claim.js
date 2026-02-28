import { Router } from 'express';
import * as db from '../db/queries.js';

const router = Router();

router.post('/check-order', async (req, res) => {
  try {
    const { order_number } = req.body;
    if (!order_number) return res.status(400).json({ error: 'order_number обязателен' });

    const order = await db.getOrderByNumber(String(order_number).trim());
    if (!order) return res.json({ found: false, message: 'Заказ не найден' });
    if (order.was_activated) return res.json({ found: true, activated: true, message: 'Доступ по этому заказу уже был выдан' });

    res.json({
      found: true,
      activated: false,
      order_id: order.id,
      product_name: order.product_name,
      has_link: !!order.link,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/activate', async (req, res) => {
  try {
    const { order_id, source } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id обязателен' });

    const result = await db.activateOrder(parseInt(order_id), {
      telegram_user_id: null,
      telegram_username: source || 'web',
    });

    if (!result.activated) {
      return res.json({ success: false, message: 'Доступ по этому заказу уже был выдан' });
    }

    res.json({
      success: true,
      link: result.order?.link,
      product_name: result.order?.product_name,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
