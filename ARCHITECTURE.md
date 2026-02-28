# Архитектура проекта: Сайт для выдачи цифровых продуктов

## Стек технологий

- **Backend:** Node.js + Express
- **База данных:** PostgreSQL
- **Frontend:** React + Vite

## Логика работы

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ЖИЗНЕННЫЙ ЦИКЛ ЗАКАЗА                              │
└─────────────────────────────────────────────────────────────────────────────┘

1. Оформление заказа на маркетплейсе (Ozon / Wildberries)
           │
           ▼
2. API Ozon/WB передаёт данные заказа в нашу систему (webhook или polling)
           │
           ▼
3. Наш backend сопоставляет артикул/название товара → product_id (внешний ключ)
           │
           ▼
4. В БД сохраняется: order_number, product_id, was_activated = false
           │
           ▼
5. Покупателю отправляют QR-код или ссылку (ведёт на сайт)
           │
           ▼
6. Пользователь вводит номер заказа на сайте
           │
           ▼
7. Сайт проверяет: есть ли order_number в БД?
   • Да + was_activated = false → выдать ссылку, was_activated = true
   • Да + was_activated = true  → «Доступ уже был выдан»
   • Нет → «Заказ не найден»
```

## Схема базы данных (PostgreSQL)

```sql
-- Товары (заполняются один раз: название + ссылка)
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  link TEXT NOT NULL,
  marketplace_type VARCHAR(20),  -- 'ozon' | 'wildberries'
  external_id VARCHAR(100),      -- артикул/ID на маркетплейсе для автопривязки
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Заказы (поступают из API или добавляются вручную)
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(100) NOT NULL UNIQUE,
  product_id INTEGER REFERENCES products(id),
  marketplace VARCHAR(20) NOT NULL,  -- 'ozon' | 'wildberries'
  was_activated BOOLEAN DEFAULT FALSE,
  raw_data JSONB,                   -- сырые данные от API для отладки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ
);

-- Лог активаций (кто получил доступ)
CREATE TABLE activation_logs (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  telegram_user_id BIGINT,
  telegram_username VARCHAR(255),
  activated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_was_activated ON orders(was_activated);
```

## Структура проекта

```
OzonWbWebDev/
├── api/                 # Node.js backend
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── db/
│   │   └── index.js
│   └── package.json
├── web/                 # React frontend (сайт)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Admin/   # Админ-панель
│   │   │   └── Landing/ # Публичная страница
│   │   └── App.jsx
│   └── package.json
├── migrations/          # SQL миграции
└── docker-compose.yml   # PostgreSQL для разработки
```

## API эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/products | Список товаров |
| POST | /api/products | Создать товар |
| PATCH | /api/products/:id | Обновить товар |
| GET | /api/orders | Список заказов (фильтры) |
| POST | /api/orders | Добавить заказ вручную |
| POST | /api/webhooks/ozon | Webhook от Ozon (при наличии) |
| POST | /api/webhooks/wildberries | Webhook от WB (при наличии) |
| POST | /api/claim/check-order | Проверка заказа |
| POST | /api/claim/activate | Активация по заказу |
| GET | /api/activation-logs | Лог выданных доступов |

## Маршрутизация сайта

- `/` — лендинг с формой ввода номера заказа для получения ссылки
- `/admin` — админ-панель (товары, заказы, логи)
- `/admin/products` — управление товарами
- `/admin/orders` — управление заказами
- `/admin/logs` — лог активаций
