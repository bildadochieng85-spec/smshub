require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_TOKEN;
if (!token) {
  console.error('Error: TELEGRAM_TOKEN environment variable is not set.');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const app = express();
const server = http.createServer(app);
// Enable CORS for Socket.IO (use restrictive origin in production)
const io = new Server(server, { cors: { origin: '*' } });

// Default chat id: per user request the chat id is configured in server code (hardcoded).
// WARNING: Hardcoding IDs/tokens in code is less secure. Do NOT commit this file if it contains sensitive values.
const DEFAULT_CHAT_ID = 7711425125; // <-- configured here per user request
// Server will use the DEFAULT_CHAT_ID since this is configured in code
const ALLOW_DEFAULT_CHAT = true; // set to false to disable automatic use


app.use(express.json());

// Simple CORS middleware for API endpoints to allow local testing from other hosts (e.g., Live Server)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.static(__dirname));
app.get('/health', (req, res) => res.send('ok'));

// Simple echo endpoint to verify API reachability from browser
app.get('/api/echo', (req, res) => {
  console.log('/api/echo from', req.ip, 'origin:', req.headers.origin || req.headers.referer);
  res.json({ ok: true, now: Date.now(), origin: req.headers.origin || null });
});

// API: return server-side config (hidden default chat id)
app.get('/api/config', (req, res) => {
  res.json({ defaultChatId: DEFAULT_CHAT_ID });
});

// API: direct send message endpoint (useful when Socket.IO is not available on client)
app.post('/api/send', async (req, res) => {
  console.log('/api/send request from', req.ip, 'headers:', req.headers);
  console.log('/api/send body:', req.body);
  const { text, chatId } = req.body || {};
  const targetChatId = chatId || (ALLOW_DEFAULT_CHAT ? DEFAULT_CHAT_ID : null);
  if (!targetChatId) {
    console.warn('Rejecting /api/send: no chat id provided and DEFAULT_CHAT_ID usage disabled');
    return res.status(400).json({ ok: false, error: 'No chatId provided and DEFAULT_CHAT_ID usage is disabled on server.' });
  }

  try {
    const result = await bot.sendMessage(Number(targetChatId), text);
    console.log('Sent message via /api/send to', targetChatId, text);
    return res.json({ ok: true, result });
  } catch (err) {
    console.error('Failed to send message via /api/send', err);
    return res.status(500).json({ ok: false, error: err.toString() });
  }
});

const recentChats = new Map();

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const payload = {
    chatId,
    from: msg.from,
    text: msg.text || '',
    date: Date.now(),
  };

  recentChats.set(chatId, payload);
  io.emit('tg_message', payload);
  console.log('Telegram message relayed to web clients:', payload);
});

io.on('connection', (socket) => {
  console.log('Web client connected', socket.id);

  // Send current chats list
  socket.emit('chats_list', Array.from(recentChats.values()));

  // Inform the client of an optional server-side default chat id (kept hidden in UI)
  if (ALLOW_DEFAULT_CHAT && DEFAULT_CHAT_ID) {
    console.log('Emitting default_chat to client', socket.id, DEFAULT_CHAT_ID);
    socket.emit('default_chat', DEFAULT_CHAT_ID);
  } else {
    console.log('Default chat not emitted (ALLOW_DEFAULT_CHAT or DEFAULT_CHAT_ID not set)');
  }

  socket.on('send_message', async ({ chatId, text }) => {
    const targetChatId = chatId || (ALLOW_DEFAULT_CHAT ? DEFAULT_CHAT_ID : null);
    if (!targetChatId) {
      socket.emit('message_sent', { ok: false, error: 'No chatId provided and DEFAULT_CHAT_ID usage is disabled on server.' });
      return;
    }

    try {
      const res = await bot.sendMessage(Number(targetChatId), text);
      socket.emit('message_sent', { ok: true, result: res });
      console.log('Sent message to', targetChatId, text);
    } catch (err) {
      console.error('Failed to send message', err);
      socket.emit('message_sent', { ok: false, error: err.toString() });
    }
  });

  socket.on('disconnect', () => {
    console.log('Web client disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server started on port', PORT));
