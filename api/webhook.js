// Vercel Serverless webhook to receive Telegram updates
// POST /api/webhook

const { Redis } = require('@upstash/redis');

const REDIS = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
}) : null;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  try {
    const update = req.body;
    console.log('/api/webhook update:', JSON.stringify(update));

    // Normalize message payload
    const msg = update.message || update.edited_message || update.channel_post || null;
    if (msg) {
      const payload = {
        chatId: msg.chat && msg.chat.id,
        from: msg.from || null,
        text: msg.text || '',
        date: msg.date || Date.now(),
      };

      // Store into Redis list if available
      if (REDIS) {
        await REDIS.lpush('tg_messages', JSON.stringify(payload));
        await REDIS.ltrim('tg_messages', 0, 99); // keep latest 100
      }

      // For compatibility with existing server socket-based UI, also log it
      console.log('Stored message:', payload);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook handler error', err);
    return res.status(500).json({ ok: false, error: err.toString() });
  }
};