import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import { requireAdmin } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import claimRouter from './routes/claim.js';
import logsRouter from './routes/logs.js';

import { syncOzon, syncWB } from './services/sync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 },
}));

app.use('/api/auth', authRouter);
app.use('/api/claim', claimRouter);
app.use('/api/products', requireAdmin, productsRouter);
app.use('/api/orders', requireAdmin, ordersRouter);
app.use('/api/activation-logs', requireAdmin, logsRouter);

// Статика для собранного фронта (в продакшене)
const webDist = path.join(__dirname, '../../web/dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

// ====== СИНХРОНИЗАЦИЯ МАРКЕТПЛЕЙСОВ ======
async function startSync() {
  try {
    await syncOzon();
    await syncWB();
    console.log('Синхронизация маркетплейсов выполнена');
  } catch (e) {
    console.error('Ошибка синхронизации:', e);
  }
}

// Раз в 5 минут
setInterval(startSync, 5 * 60 * 1000);

// Первый запуск сразу после старта сервера
startSync();

// app.listen(PORT, () => {
//   console.log(`API работает на http://localhost:${PORT}`);
// });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API работает на http://localhost:${PORT}`);
});



