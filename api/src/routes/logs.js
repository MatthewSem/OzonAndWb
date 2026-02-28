import { Router } from 'express';
import * as db from '../db/queries.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const logs = await db.getActivationLogs(limit);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
