const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_NOTIFY_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

async function safeFetch(url, options) {
  try {
    await fetch(url, options);
  } catch (e) {
    console.error('Telegram notify error', e);
  }
}

export async function notifyClientMessage({ chatId, message }) {
  if (!BOT_TOKEN || !CHAT_ID) return;

  const textParts = [];
  textParts.push('💬 Новое сообщение от клиента');
  if (chatId) {
    textParts.push(`Чат: \`${String(chatId).slice(0, 8)}\``);
  }

  const maxLen = 500;
  let body = message || '';
  if (body.length > maxLen) {
    body = body.slice(0, maxLen) + '…';
  }

  if (body) {
    textParts.push('');
    textParts.push(body);
  }

  const text = textParts.join('\n');

  await safeFetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    },
  );
}

