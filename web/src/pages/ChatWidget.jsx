import { useEffect, useRef, useState } from "react";
import "./ChatWidget.css";

const API = "/api";

export default function ChatWidget() {
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const [unread, setUnread] = useState(0);

  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem("chat_session") || null;
  });
  const [chatId, setChatId] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const host =
        window.location.hostname === "localhost"
          ? "localhost:3001"
          : window.location.host;

      const ws = new WebSocket(`${protocol}://${host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({ type: "init", sessionId }));
      };

      ws.onmessage = async (evt) => {
        const data = JSON.parse(evt.data);

        // Инициализация от сервера
        if (data.type === "init") {
          if (data.sessionId) {
            setSessionId(data.sessionId);
            localStorage.setItem("chat_session", data.sessionId);
          }
          if (data.chatId) {
            setChatId(data.chatId);
            try {
              const res = await fetch(`${API}/chat/${data.chatId}/messages`);
              const history = await res.json();
              if (Array.isArray(history)) {
                setMessages(history);
              }
            } catch (e) {
              console.error("Failed to load chat history", e);
            }
          }
          return;
        }

        // Обычное сообщение
        setMessages((prev) => {
          // Если это эхо нашего клиентского сообщения — заменяем pending
          if (data.sender === "client" && typeof data.message === "string") {
            const updated = [...prev];
            for (let i = updated.length - 1; i >= 0; i -= 1) {
              const m = updated[i];
              if (
                m.pending &&
                (m.sender === "client" || m.sender === "user") &&
                m.message === data.message
              ) {
                updated[i] = data;
                return updated;
              }
            }
          }
          return [...prev, data];
        });

        // Если оператор ответил, а окно свернуто — увеличиваем счётчик непрочитанных
        if (
          data.sender === "operator" &&
          !open
        ) {
          setUnread((prev) => prev + 1);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000);
      };

      ws.onerror = console.error;
    }

    connect();
    return () => wsRef.current?.close();
  }, [sessionId]);

  const sendMessage = () => {
    if (!input.trim() || !canSend) return;

    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.log("WS not connected");
      return;
    }

    const localMessage = {
      sender: "client",
      message: input,
      pending: true,
    };

    setMessages((prev) => [...prev, localMessage]);

    wsRef.current.send(
      JSON.stringify({
        type: "message",
        message: input,
      })
    );

    setInput("");
    setCanSend(false);
    setTimeout(() => setCanSend(true), 1000);
  };

  return (
    <div className="chat-widget">
      {!open && (
        <div
          className="chat-button"
          onClick={() => {
            setOpen(true);
            setUnread(0);
          }}
        >
          <span>💬</span>
          {unread > 0 && (
            <span className="chat-unread">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
      )}
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-head">
              <span>Задать вопрос</span>
              <div
                className={`chat-status ${connected ? "online" : "offline"}`}
              ></div>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div
                key={m.id || i}
                className={`chat-message ${m.sender === "operator"
                    ? "operator"
                    : m.sender === "client"
                      ? "client"
                      : m.sender || ""
                  } ${m.pending ? "pending" : ""}`}
              >
                {typeof m.message === "string" &&
                  m.message.startsWith("data:image/") ? (
                  <img
                    src={m.message}
                    alt="Вложение"
                    className="chat-image"
                  />
                ) : (
                  m.message
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Ваш вопрос..."
            />
            <button onClick={sendMessage}>Отправить</button>
          </div>
        </div>
      )}
    </div>
  );
}