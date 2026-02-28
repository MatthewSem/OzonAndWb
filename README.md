# Сайт для выдачи цифровых продуктов (Ozon / Wildberries)

Система для выдачи доступа к цифровым продуктам по номеру заказа с маркетплейсов. Включает:

- **Сайт** — лендинг с формой ввода номера заказа + админ-панель (товары, заказы, лог активаций)
- **API** — Node.js + Express + PostgreSQL

## Логика работы

1. Заказ формируется на Ozon или Wildberries
2. API маркетплейса (webhook или polling) передаёт данные в нашу БД
3. В БД сохраняется: `order_number`, `product_id` (внешний ключ на товар), `was_activated = false`
4. Покупателю отправляют QR-код или ссылку → переход на сайт
5. Пользователь вводит номер заказа на сайте
6. Сайт сверяет с БД и выдаёт ссылку (или сообщение «уже выдан»)

## Быстрый старт

### 1. PostgreSQL

```bash
docker-compose up -d
```

### 2. Миграция

```bash
npm install
npm run db:migrate
```

### 3. Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

- `DATABASE_URL` — подключение к PostgreSQL
- `ADMIN_PASSWORD` — пароль для входа в админ-панель
- `SESSION_SECRET` — секрет для подписи сессии (любая случайная строка)

### 4. Запуск

```bash
# API (порт 3001)
npm run dev:api

# Сайт (порт 5173) — в отдельном терминале
npm run dev:web
```

Либо `npm run dev` — одновременно API + фронт.

### 5. Открыть

- Сайт: http://localhost:5173
- Админка: http://localhost:5173/admin
- API: http://localhost:3001/api/products

## Структура проекта

```
OzonWbWebDev/
├── api/           # Backend (Express, PostgreSQL)
├── web/           # Frontend (React + Vite) — лендинг с формой + админка
├── migrations/    # SQL миграции
└── scripts/       # Скрипты (миграция и т.д.)
```

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/products | Список товаров |
| POST | /api/products | Создать товар |
| PATCH | /api/products/:id | Обновить товар |
| GET | /api/orders | Список заказов |
| POST | /api/orders | Добавить заказ |
| POST | /api/orders/bulk | Массовое добавление заказов |
| POST | /api/webhooks/ozon | Webhook Ozon |
| POST | /api/webhooks/wildberries | Webhook Wildberries |
| POST | /api/claim/check-order | Проверка заказа |
| POST | /api/claim/activate | Активация по заказу |
| GET | /api/activation-logs | Лог активаций |

## Интеграция с маркетплейсами

Сейчас webhook-и — заглушки. Для реальной интеграции:

- **Ozon**: [Seller API]() — Client-Id + API Key, методы `/v3/posting/fbs/list` и т.п.
- **Wildberries**: [Open API]() — Authorization, `/api/v3/orders/new` и т.п.

В товарах укажите `external_id` (артикул/offer_id) — при получении заказа из API он будет автоматически сопоставляться с товаром.

## Продакшен

```bash
cd web && npm run build
cd .. && npm start
```

Собранный фронт раздаётся из `api` на том же порту.
