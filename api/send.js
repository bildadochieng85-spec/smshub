// /api/send.js
import fetch from 'node-fetch';

const TELEGRAM_API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const token = process.env.BOT_TOKEN; // make sure this matches webhook.js
  if (!token) return res.status(500).json({ ok: false, error: 'BOT_TOKEN not configured' });

  const { chatId, text } = req.body || {};
  if (!chatId || !text) return res.status(400).json({ ok: false, error: 'chatId and text required' });

  try {
    const r = await fetch(TELEGRAM_API(token, 'sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: String(chatId), text }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ ok: false, error: j });
    return res.json({ ok: true, result: j });
  } catch (err) {
    console.error('send error', err);
    return res.status(500).json({ ok: false, error: err.toString() });
  }
}
