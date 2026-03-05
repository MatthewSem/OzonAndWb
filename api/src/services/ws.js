import { WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';
import { createChat, getChatBySession, createMessageForChat } from '../db/queries.js';
import { notifyClientMessage } from '../services/telegram_notify.js';

// sessionId -> websocket (клиенты сайта)
export const sessions = new Map();
// Подключения админ-панели
export const adminSockets = new Set();

// Простая защита от спама: максимум N сообщений за окно времени
const MESSAGE_WINDOW_MS = 10_000; // 10 секунд
const MESSAGE_LIMIT = 5; // не более 5 сообщений
const messageRate = new Map(); // sessionId -> number[] (timestamps)

export function initWebSocket(server) {
  // Один WebSocketServer на весь HTTP-сервер, маршрутизируем по пути
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const path = req.url || '/';

    // Подключение админ-панели
    if (path.startsWith('/ws-admin')) {
      adminSockets.add(ws);
      console.log('WS-ADMIN: admin connected');

      ws.on('close', () => {
        adminSockets.delete(ws);
        console.log('WS-ADMIN: admin disconnected');
      });

      return;
    }

    // Подключение клиентского виджета (/ws)
    if (path.startsWith('/ws')) {
      console.log('WS: new client connected');

      ws.on('message', async (msg) => {
        try {
          const data = JSON.parse(msg.toString());

          // Инициализация сессии
          if (data.type === 'init') {
            const incomingSessionId = data.sessionId || null;

            let sessionId = incomingSessionId || null;
            let chat;

            if (sessionId) {
              chat = await getChatBySession(sessionId);
            }

            // Если чата нет или sessionId не передан — создаем новый
            if (!chat) {
              if (!sessionId) {
                sessionId = randomUUID();
              }
              chat = await createChat(sessionId);
            }

            ws.sessionId = chat.session_id;
            ws.chatId = chat.id;
            sessions.set(ws.sessionId, ws);

            console.log('WS: init', { sessionId: ws.sessionId, chatId: ws.chatId });

            ws.send(JSON.stringify({
              type: 'init',
              sessionId: ws.sessionId,
              chatId: ws.chatId,
            }));

            return;
          }

          // Сообщение от клиента
          if (data.type === 'message') {
            if (!ws.chatId || !ws.sessionId) {
              console.warn('WS: message without initialized chat/session');
              return;
            }

            // Защита от спама по sessionId
            const now = Date.now();
            let timestamps = messageRate.get(ws.sessionId) || [];
            timestamps = timestamps.filter((t) => now - t < MESSAGE_WINDOW_MS);
            if (timestamps.length >= MESSAGE_LIMIT) {
              console.warn('WS: rate limit hit for session', ws.sessionId);
              ws.send(JSON.stringify({ type: 'error', reason: 'rate_limited' }));
              messageRate.set(ws.sessionId, timestamps);
              return;
            }
            timestamps.push(now);
            messageRate.set(ws.sessionId, timestamps);

            const saved = await createMessageForChat({
              chatId: ws.chatId,
              sender: 'client',
              message: data.message,
            });

            console.log('WS: client message saved', {
              chatId: ws.chatId,
              sessionId: ws.sessionId,
            });

            // Уведомление в Telegram для оператора
            notifyClientMessage({
              chatId: ws.chatId,
              message: typeof data.message === 'string' ? data.message : '',
            }).catch(() => {});

            const payload = {
              type: 'chat_message',
              chatId: saved.chat_id,
              message: {
                id: saved.id,
                chat_id: saved.chat_id,
                sender: saved.sender,
                message: saved.message,
                created_at: saved.created_at,
              },
            };

            // Отправляем обратно клиенту подтверждение/эхо
            ws.send(JSON.stringify(payload.message));

            // Разсылаем всем админам
            for (const adminWs of adminSockets) {
              if (adminWs.readyState === 1) {
                adminWs.send(JSON.stringify(payload));
              }
            }
          }
        } catch (e) {
          console.error('WS: error handling message', e);
        }
      });

      ws.on('close', () => {
        if (ws.sessionId) sessions.delete(ws.sessionId);
        console.log('WS: client disconnected', ws.sessionId);
      });

      return;
    }

    // Неизвестный путь — сразу закрываем соединение
    console.warn('WS: unknown path', path);
    ws.close();
  });

  return wss;
}