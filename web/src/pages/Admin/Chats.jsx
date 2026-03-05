import { useEffect, useRef, useState } from 'react';
import './Orders.css';

const API = '/api';

export default function Chats() {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const prevChatsRef = useRef([]);
  const [newFlags, setNewFlags] = useState({});
  const adminWsRef = useRef(null);

  const loadChats = async () => {
    setLoadingChats(true);
    try {
      const res = await fetch(`${API}/chat`, { credentials: 'include' });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      const prevList = prevChatsRef.current;
      const flags = { ...newFlags };

      for (const chat of list) {
        const prev = prevList.find((p) => p.id === chat.id);
        const prevCount = prev ? Number(prev.messages_count || 0) : 0;
        const currCount = Number(chat.messages_count || 0);
        if (
          prev &&
          currCount > prevCount &&
          chat.id !== selectedChatId
        ) {
          flags[chat.id] = true;
        }
      }

      prevChatsRef.current = list;
      setNewFlags(flags);
      setChats(list);
    } catch (e) {
      console.error('Failed to load chats', e);
    } finally {
      setLoadingChats(false);
    }
  };

  const loadMessages = async (chatId) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`${API}/chat/${chatId}/messages`, {
        credentials: 'include',
      });
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load messages', e);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    function connectAdminWs() {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host =
        window.location.hostname === 'localhost'
          ? 'localhost:3001'
          : window.location.host;

      const ws = new WebSocket(`${protocol}://${host}/ws-admin`);
      adminWsRef.current = ws;

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.type === 'chat_message' && data.chatId && data.message) {
            const { chatId, message } = data;

            // Обновляем список чатов (счётчик сообщений + метка "новые")
            setChats((prev) => {
              const updated = prev.map((c) =>
                c.id === chatId
                  ? {
                    ...c,
                    messages_count: Number(c.messages_count || 0) + 1,
                  }
                  : c
              );
              return updated;
            });

            // Обновляем метки новых сообщений
            setNewFlags((prev) => {
              if (chatId === selectedChatId) return prev;
              return { ...prev, [chatId]: true };
            });

            // Если этот чат открыт — докидываем сообщение в список
            setMessages((prev) => {
              if (chatId !== selectedChatId) return prev;
              if (prev.some((m) => m.id === message.id || m.pending)) return prev; // проверка уникальности
              return [...prev, message];
            });
          }
        } catch (e) {
          console.error('WS-ADMIN parse error', e);
        }
      };

      ws.onclose = () => {
        setTimeout(connectAdminWs, 3000);
      };

      ws.onerror = console.error;
    }

    connectAdminWs();
    return () => {
      adminWsRef.current?.close();
    };
  }, [selectedChatId]);

  // ------------------ Скролл вниз ------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const selectChat = (chatId) => {
    setSelectedChatId(chatId);
    setNewFlags((prev) => ({ ...prev, [chatId]: false }));
    setMessages([]);
    setMessageInput('');
    setImageFile(null);
    setImagePreview(null);
    setSidebarOpen(false);
    loadMessages(chatId);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Можно прикреплять только изображения');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!selectedChatId) return;

    const trimmed = messageInput.trim();
    const payloads = [];
    if (trimmed) payloads.push(trimmed);
    if (imagePreview) payloads.push(imagePreview);
    if (payloads.length === 0) return;

    setSending(true);
    try {
      for (const payload of payloads) {
        // Добавляем локальное pending сообщение
        const localMessage = {
          id: `pending-${Date.now()}`, // временный уникальный id
          message: payload,
          sender: "operator",
          created_at: new Date().toISOString(),
          pending: true,
        };
        setMessages((prev) => [...prev, localMessage]);

        const res = await fetch(`${API}/chat/${selectedChatId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message: payload }),
        });
        const saved = await res.json();
        if (res.ok && saved) {
          // Заменяем pending на реально сохранённое сообщение
          setMessages((prev) =>
            prev.map((m) => (m.id === localMessage.id ? saved : m))
          );
        }
      }
      setMessageInput("");
      setImageFile(null);
      setImagePreview(null);
      loadChats();
    } catch (e) {
      console.error("Failed to send message", e);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString('ru') : '—');

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <div className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Чаты</h2>
          <button className='exit-btn' onClick={() => setSidebarOpen(false)}>×</button>
        </div>
        <div className="chat-list">
          {loadingChats ? (
            <p className="muted">Загрузка…</p>
          ) : chats.length === 0 ? (
            <p className="muted">Чатов пока нет.</p>
          ) : (
            chats.map((c) => (
              <div
                key={c.id}
                className={`chat-item ${c.id === selectedChatId ? 'selected' : ''}`}
                onClick={() => selectChat(c.id)}
              >
                <div className="chat-item-title">{c.id.slice(0, 8)}</div>
                <div className="chat-item-info">
                  Сообщений: {c.messages_count || 0}{' '}
                  {newFlags[c.id] && <span className="badge-new">новые</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat */}
      <div className="chat-main">
        <div className="chat-header-admin">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>📓</button>
          <h2>{selectedChat ? `Чат ${selectedChat.id.slice(0, 8)}` : 'Выберите чат'}</h2>
        </div>

        <div className="chat-messages">
          {loadingMessages ? (
            <p className="muted">Загрузка сообщений…</p>
          ) : messages.length === 0 ? (
            <p className="muted">Сообщений пока нет</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`chat-view-message ${m.sender === 'operator' ? 'from-operator' : 'from-client'}`}
              >
                <div className="meta">
                  <span className="badge">{m.sender === 'operator' ? 'Оператор' : 'Клиент'}</span>
                  <span className="time">{formatDate(m.created_at)}</span>
                </div>
                <div className="text">
                  {typeof m.message === 'string' && m.message.startsWith('data:image/') ? (
                    <img src={m.message} alt="Вложение" className="chat-view-image" />
                  ) : (
                    m.message
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input" onSubmit={sendMessage}>
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            rows={2}
            placeholder="Ответ оператора…"
          />
          <div className="chat-input-actions">
            <label className="file-label">
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              📎
            </label>
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Превью" />
                <div className="remove-btn" onClick={() => { setImagePreview(null); setImageFile(null); }}>×</div>
              </div>
            )}
            <button type="submit" disabled={sending || (!messageInput.trim() && !imagePreview)}>Отправить</button>
          </div>
        </form>
      </div>
    </div>
  );
}

