import pool from './pool.js';
import { randomUUID } from 'crypto';

// Products
export const getProducts = async () => {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY id');
  return rows;
};

export const createProduct = async ({ name, link, marketplace_type, external_id }) => {
  const { rows } = await pool.query(
    `INSERT INTO products (name, link, marketplace_type, external_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, link, marketplace_type || null, external_id || null]
  );
  return rows[0];
};

export const updateProduct = async (id, { name, link, marketplace_type, external_id }) => {
  const { rows } = await pool.query(
    `UPDATE products SET name = COALESCE($2, name), link = COALESCE($3, link),
      marketplace_type = COALESCE($4, marketplace_type), external_id = COALESCE($5, external_id)
     WHERE id = $1 RETURNING *`,
    [id, name, link, marketplace_type, external_id]
  );
  return rows[0];
};

export const getProductById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  return rows[0];
};

// Orders
export const getOrders = async ({ search, marketplace, was_activated } = {}) => {
  let query = 'SELECT o.*, p.name as product_name, p.link FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE 1=1';
  const params = [];
  let i = 1;

  if (search) {
    query += ` AND o.order_number ILIKE $${i}`;
    params.push(`%${search}%`);
    i++;
  }
  if (marketplace) {
    query += ` AND o.marketplace = $${i}`;
    params.push(marketplace);
    i++;
  }
  if (was_activated !== undefined) {
    query += ` AND o.was_activated = $${i}`;
    params.push(was_activated);
    i++;
  }

  query += ' ORDER BY o.created_at DESC';
  const { rows } = await pool.query(query, params);
  return rows;
};

export const getOrderByNumber = async (orderNumber) => {
  const { rows } = await pool.query(
    'SELECT o.*, p.name as product_name, p.link FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.order_number = $1',
    [orderNumber]
  );
  return rows[0];
};

export const getOrderByNumberAndProduct = async (orderNumber, productId, marketplace) => {
  const { rows } = await pool.query(
    `
    SELECT 1
    FROM orders
    WHERE order_number = $1
      AND product_id = $2
      AND marketplace = $3
    LIMIT 1
    `,
    [orderNumber, productId, marketplace]
  );

  return rows[0] ?? null;
};

// Получение маппинга external_id -> product_id
export async function getProductMapping(marketplace) {
  const res = await pool.query(
    'SELECT id, external_id FROM products WHERE marketplace_type = $1',
    [marketplace]
  );
  const map = {};
  for (const row of res.rows) {
    if (row.external_id) map[row.external_id] = row.id;
  }
  return map;
}

export const createOrder = async ({ order_number, product_id, marketplace, raw_data }) => {
  const { rows } = await pool.query(
    `INSERT INTO orders (order_number, product_id, marketplace, raw_data)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (order_number, marketplace) DO UPDATE SET product_id = EXCLUDED.product_id, raw_data = EXCLUDED.raw_data
     RETURNING *`,
    [order_number, product_id, marketplace, raw_data ? JSON.stringify(raw_data) : null]
  );
  return rows[0];
};

export const createOrdersBulk = async (items) => {
  const client = await pool.connect();
  try {
    const results = [];
    for (const item of items) {
      const { rows } = await client.query(
        `INSERT INTO orders (order_number, product_id, marketplace, raw_data)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (order_number) DO UPDATE SET product_id = EXCLUDED.product_id
         RETURNING *`,
        [item.order_number, item.product_id, item.marketplace, item.raw_data ? JSON.stringify(item.raw_data) : null]
      );
      results.push(rows[0]);
    }
    return results;
  } finally {
    client.release();
  }
};

export const activateOrder = async (orderId, { telegram_user_id, telegram_username }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: order } = await client.query(
      'UPDATE orders SET was_activated = TRUE, activated_at = NOW() WHERE id = $1 AND was_activated = FALSE RETURNING *',
      [orderId]
    );
    if (order.length === 0) return { activated: false, order: null };

    await client.query(
      'INSERT INTO activation_logs (order_id, telegram_user_id, telegram_username) VALUES ($1, $2, $3)',
      [orderId, telegram_user_id, telegram_username]
    );
    await client.query('COMMIT');

    const { rows: full } = await pool.query(
      'SELECT o.*, p.name as product_name, p.link FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.id = $1',
      [orderId]
    );
    return { activated: true, order: full[0] || order[0] };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

// Activation logs
export const getActivationLogs = async (limit = 100) => {
  const { rows } = await pool.query(
    `SELECT l.*, o.order_number, p.name as product_name FROM activation_logs l
     JOIN orders o ON l.order_id = o.id
     LEFT JOIN products p ON o.product_id = p.id
     ORDER BY l.activated_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
};

export async function getLastSync(marketplace) {
  const row = await pool.query(
    `SELECT last_synced_at FROM sync_state WHERE marketplace = $1`,
    [marketplace]
  );

  if (!row.rows.length) return null;
  return row.rows[0].last_synced_at;
}

export async function setLastSync(marketplace, date) {
  await pool.query(
    `
    INSERT INTO sync_state (marketplace, last_synced_at)
    VALUES ($1, $2)
    ON CONFLICT (marketplace)
    DO UPDATE SET last_synced_at = EXCLUDED.last_synced_at
    `,
    [marketplace, date]
  );
}

// ===== Чаты (онлайн-чат «Задать вопрос») =====

// Создать новый чат для сессии
export const createChat = async (sessionId) => {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO chats (id, session_id, status)
     VALUES ($1, $2, 'open')
     RETURNING *`,
    [id, sessionId]
  );
  return rows[0];
};

// Найти последний открытый чат по session_id
export const getChatBySession = async (sessionId) => {
  const { rows } = await pool.query(
    `SELECT * FROM chats
     WHERE session_id = $1
       AND status = 'open'
     ORDER BY created_at DESC
     LIMIT 1`,
    [sessionId]
  );
  return rows[0] || null;
};

export const getChatById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM chats WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

// Список чатов для админ-панели
export const getChats = async () => {
  const { rows } = await pool.query(
    `SELECT c.id,
            c.status,
            c.created_at,
            COUNT(m.id) AS messages_count
     FROM chats c
     LEFT JOIN messages m ON m.chat_id = c.id
     GROUP BY c.id
     HAVING COUNT(m.id) > 0
     ORDER BY c.created_at DESC`
  );
  return rows;
};

// Сообщения конкретного чата
export const getMessagesByChat = async (chatId) => {
  const { rows } = await pool.query(
    `SELECT * FROM messages
     WHERE chat_id = $1
     ORDER BY created_at`,
    [chatId]
  );
  return rows;
};

// Сохранение сообщения
export const createMessageForChat = async ({ chatId, sender, message }) => {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO messages (id, chat_id, sender, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, chatId, sender, message]
  );
  return rows[0];
};