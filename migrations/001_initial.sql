-- Товары (заполняются один раз: название + ссылка)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  link TEXT NOT NULL,
  marketplace_type VARCHAR(20),
  external_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(external_id, marketplace_type)
);

-- Заказы (поступают из API или добавляются вручную)
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(100) NOT NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  marketplace VARCHAR(20) NOT NULL,
  was_activated BOOLEAN DEFAULT FALSE,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE(order_number, marketplace)
);

-- Лог активаций (кто получил доступ)
CREATE TABLE IF NOT EXISTS activation_logs (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  telegram_user_id BIGINT,
  telegram_username VARCHAR(255),
  activated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_state (
  marketplace TEXT PRIMARY KEY,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_was_activated ON orders(was_activated);

-- Чаты (онлайн-виджет «Задать вопрос»)
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- История сообщений чата
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender TEXT NOT NULL, -- 'client' или 'operator'
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);