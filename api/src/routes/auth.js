import { Router } from 'express';

const router = Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

router.get('/check', (req, res) => {
  if (req.session?.admin) return res.json({ ok: true });
  res.status(401).json({ ok: false });
});

router.post('/login', (req, res) => {
  const { password } = req.body || {};
  if (!ADMIN_PASSWORD) return res.status(500).json({ error: 'Админ-пароль не настроен' });
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Неверный пароль' });
  req.session.admin = true;
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

export default router;
