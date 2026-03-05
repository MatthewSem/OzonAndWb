import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import {
  getChats,
  getChatById,
  getMessagesByChat,
  createMessageForChat,
} from '../db/queries.js';
import { sessions, adminSockets } from '../services/ws.js';

const router = express.Router();

// Список чатов для админ-панели
router.get('/', requireAdmin, async (req, res) => {
  try {
    const chats = await getChats();
    res.json(chats);
  } catch (e) {
    console.error('GET /api/chat error', e);
    res.status(500).json({ error: 'Failed to load chats' });
  }
});

// Сообщения конкретного чата (используется и админкой, и виджетом)
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const chat = await getChatById(id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const messages = await getMessagesByChat(id);
    res.json(messages);
  } catch (e) {
    console.error('GET /api/chat/:id/messages error', e);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// Отправить сообщение от оператора
router.post('/:id/message', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const chat = await getChatById(id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const saved = await createMessageForChat({
      chatId: chat.id,
      sender: 'operator',
      message,
    });

    // Пытаемся отправить клиенту через WebSocket
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

    // Клиенту
    const ws = sessions.get(chat.session_id);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(payload.message));
    }

    // Всем админам (например, если открыто несколько вкладок)
    for (const adminWs of adminSockets) {
      if (adminWs.readyState === 1) {
        adminWs.send(JSON.stringify(payload));
      }
    }

    res.json(saved);
  } catch (e) {
    console.error('POST /api/chat/:id/message error', e);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;