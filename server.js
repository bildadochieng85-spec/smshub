require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const TelegramBot = require('node-telegram-bot-api')
const { Redis } = require('@upstash/redis')
const axios = require('axios')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

/* ================= FLUTTERWAVE CONFIG ================= */
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY
const FLW_ENCRYPTION_KEY = process.env.FLW_ENCRYPTION_KEY

/* ================= REDIS ================= */
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null

app.use(express.json())
app.use(express.static(__dirname))

/* ================= TELEGRAM BOT ================= */
const token = process.env.TELEGRAM_BOT_TOKEN
const DEFAULT_CHAT_ID = 7711425125
const bot = new TelegramBot(token, { polling: false })
bot.setWebHook(`https://smshub-ftgg.onrender.com/bot${token}`)
app.post(`/bot${token}`, (req, res) => { bot.processUpdate(req.body); res.sendStatus(200) })

/* ================= SOCKET.IO ================= */
const activeWebSockets = new Map()
io.on('connection', async socket => {
  const userId = socket.id
  activeWebSockets.set(userId, socket)

  // Welcome message
  const welcomeText = "Hello! Welcome to PrimeSmsHub. How can we help you today?"
  socket.emit('tg_message', { text: welcomeText, from: "Support" })

  if (redis) {
    const welcomeObj = { replyToSocketId: userId, text: welcomeText, from: 'Support', date: Date.now() }
    await redis.lpush('tg_messages', JSON.stringify(welcomeObj))
    await redis.ltrim('tg_messages', 0, 99)
  }

  socket.on('send_message', async data => {
    const report =
      `🌐 **NEW MESSAGE FROM WEB**\n━━━━━━━━━━━━━━━\n` +
      `👤 **User ID:** \`${userId}\`\n💬 **Message:** ${data.text}`
    await bot.sendMessage(DEFAULT_CHAT_ID, report, { parse_mode: 'Markdown' })

    if (redis) {
      const msgObj = { socketId: userId, text: data.text, from: 'Web User', date: Date.now() }
      await redis.lpush('tg_messages', JSON.stringify(msgObj))
      await redis.ltrim('tg_messages', 0, 99)
    }
    socket.emit('message_sent', { ok: true })
  })

  socket.on('disconnect', () => activeWebSockets.delete(userId))
})

/* ================= TELEGRAM → WEB ================= */
bot.on('message', async msg => {
  if (!msg.reply_to_message || msg.from.is_bot) return
  const match = (msg.reply_to_message.text || "").match(/User ID: ([a-zA-Z0-9_-]+)/)
  if (match && match[1]) {
    const targetSocketId = match[1]
    if (redis) {
      const replyObj = { replyToSocketId: targetSocketId, text: msg.text, from: 'Support', date: Date.now() }
      await redis.lpush('tg_messages', JSON.stringify(replyObj))
      await redis.ltrim('tg_messages', 0, 99)
    }
    const webClient = activeWebSockets.get(targetSocketId)
    if (webClient) {
      webClient.emit('tg_message', { text: msg.text, from: "Support" })
      bot.sendMessage(msg.chat.id, "✅ Reply delivered to user browser.")
    } else {
      bot.sendMessage(msg.chat.id, "⌛ User is offline. They will see this message when they return.")
    }
  }
})

/* ================= CHAT HISTORY ================= */
app.get('/api/messages', async (req, res) => {
  if (!redis) return res.json({ ok: false, messages: [] })
  const msgs = await redis.lrange('tg_messages', 0, 99)
  res.json({ ok: true, messages: msgs.map(m => JSON.parse(m)) })
})

/* ================= WALLET API ================= */
app.get('/api/wallet', async (req, res) => {
  try {
    if (!redis) return res.json({ balance: 0 })
    const payments = await redis.lrange('payments', 0, -1)
    const balance = payments.reduce((sum, p) => sum + JSON.parse(p).amount, 0)
    res.json({ balance })
  } catch { res.json({ balance: 0 }) }
})

/* ================= FLUTTERWAVE VERIFY (FIXED) ================= */
app.get('/flutterwave/verify/:id', async (req, res) => {
  try {
    const txId = req.params.id
    if (!txId) return res.status(400).json({ status: 'error', message: 'Transaction ID is required' })

    const response = await axios.get(`https://api.flutterwave.com/v3/transactions/${txId}/verify`, {
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.data && response.data.status === 'success' && response.data.data) {
      const data = response.data.data

      // Save to Redis
      if (redis) {
        await redis.lpush('payments', JSON.stringify({
          transaction_id: data.id,
          amount: data.amount,
          currency: data.currency,
          customer: data.customer
        }))
      }

      res.json({
        status: 'success',
        message: 'Payment verified successfully',
        data: data
      })
    } else {
      res.status(400).json({
        status: 'error',
        message: response.data.message || 'Transaction could not be verified',
        data: response.data.data || null
      })
    }
  } catch (err) {
    console.error('Flutterwave Verify Error:', err.response ? err.response.data : err.message)
    res.status(500).json({
      status: 'error',
      message: 'Server Error while verifying payment',
      details: err.response ? err.response.data : err.message
    })
  }
})

/* ================= NOTIFY TELEGRAM AFTER PAYMENT ================= */
app.post('/notify-telegram', async (req, res) => {
  try {
    const { transaction_id, amount, currency, customer } = req.body
    const message =
      `💰 New Payment Received\n━━━━━━━━━━━━━━━\n` +
      `Transaction ID: ${transaction_id}\nAmount: ${amount} ${currency}\n` +
      `Customer: ${customer.name}\nEmail: ${customer.email}\nPhone: ${customer.phone_number}\n━━━━━━━━━━━━━━━`

    await bot.sendMessage(DEFAULT_CHAT_ID, message)

    // Save payment to Redis for wallet
    if (redis) await redis.lpush('payments', JSON.stringify({ transaction_id, amount, currency, customer }))

    // Emit balance update in real-time
    if (activeWebSockets.size > 0 && redis) {
      const payments = await redis.lrange('payments', 0, -1)
      const balance = payments.reduce((sum, p) => sum + JSON.parse(p).amount, 0)
      activeWebSockets.forEach(socket => socket.emit('wallet_update', { balance }))
    }

    res.json({ ok: true })
  } catch (err) { res.status(500).json({ ok: false, error: err.message }) }
})

/* ================= HEALTH CHECK ================= */
app.get('/health', (req, res) => {
  res.json({
    server: 'ok',
    flutterwave_secret_loaded: !!FLW_SECRET_KEY,
    flutterwave_encryption_loaded: !!FLW_ENCRYPTION_KEY
  })
})

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log('✅ Server Live on Port', PORT))
