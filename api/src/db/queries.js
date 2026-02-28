import pool from './pool.js';

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
     ON CONFLICT (order_number) DO UPDATE SET product_id = EXCLUDED.product_id, raw_data = EXCLUDED.raw_data
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
