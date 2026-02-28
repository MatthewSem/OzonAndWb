import { Router } from 'express';
import * as db from '../db/queries.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, link, marketplace_type, external_id } = req.body;
    if (!name || !link) return res.status(400).json({ error: 'name и link обязательны' });
    const product = await db.createProduct({ name, link, marketplace_type, external_id });
    res.status(201).json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const product = await db.updateProduct(id, req.body);
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
