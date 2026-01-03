// /api/webhook.js
const { Redis } = require('@upstash/redis');
const fetch = require('node-fetch');

const BOT_TOKEN = process.env.BOT_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const REDIS =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('OK');

  try {
    const update = req.body;

    const msg =
      update.message ||
      update.edited_message ||
      update.channel_post ||
      null;

    if (!msg || !msg.chat?.id) {
      return res.status(200).json({ ok: true });
    }

    const chatId = msg.chat.id;
    const text = msg.text || '';

    const payload = {
      chatId,
      from: msg.from || null,
      text,
      date: msg.date || Date.now(),
    };

    // Save message (optional)
    if (REDIS) {
      await REDIS.lpush('tg_messages', JSON.stringify(payload));
      await REDIS.ltrim('tg_messages', 0, 99);
    }

    // 🔥 Reply to Telegram directly
    if (text) {
      await fetch(`${TG_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `You said: ${text}`,
        }),
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ ok: false });
  }
};
