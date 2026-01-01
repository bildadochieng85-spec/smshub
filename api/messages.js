// GET /api/messages - returns recent messages (from Upstash Redis if configured)
const { Redis } = require('@upstash/redis');

const REDIS = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
}) : null;

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  try {
    if (!REDIS) return res.json({ ok: false, error: 'No Redis configured', messages: [] });
    const msgs = await REDIS.lrange('tg_messages', 0, 99);
    const parsed = msgs.map(m => { try { return JSON.parse(m); } catch { return m; } });
    return res.json({ ok: true, messages: parsed });
  } catch (err) {
    console.error('/api/messages error', err);
    return res.status(500).json({ ok: false, error: err.toString(), messages: [] });
  }
};