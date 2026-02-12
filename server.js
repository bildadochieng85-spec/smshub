/**
 * Prime SMS Hub - Complete Backend Server v2.0
 * ALL-IN-ONE: Includes all services, routes, and APIs directly
 * Features: SMS Hub + Support Chat + Payments + Dashboard
 */

require('dotenv').config()
const express = require('express')
const http = require('http')
const path = require('path')
const { Server } = require('socket.io')
const axios = require('axios')
const admin = require('firebase-admin')
const crypto = require('crypto')

// Initialize Express app
const app = express()
const server = http.createServer(app)

// Socket.io setup
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 25000,
  pingTimeout: 60000
})

// ================= CONFIGURATION ================= 
const PORT = process.env.PORT || 3000
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || ''
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''
const FIVESIM_API_KEY = process.env.FIVESIM_API_KEY || ''
const DEFAULT_CHAT_ID = process.env.DEFAULT_CHAT_ID || 7711425125
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`

// Firebase initialization
let db = null
try {
  if (!admin.apps.length) {
    const firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    }
    
    if (firebaseConfig.projectId && firebaseConfig.privateKey && firebaseConfig.clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig)
      })
      db = admin.firestore()
      console.log('✅ Firebase initialized')
    }
  } else {
    db = admin.firestore()
  }
} catch (error) {
  console.warn('⚠️ Firebase initialization warning:', error.message)
}

// Redis setup for chat history
let redis = null
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Redis } = require('@upstash/redis')
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    })
  }
} catch (e) {
  console.warn('⚠️ Redis not available, chat history disabled')
}

// ================= 5SIM API CLIENT ================= 
const fivesimClient = axios.create({
  baseURL: 'https://5sim.net/v1',
  headers: {
    'Authorization': `Bearer ${FIVESIM_API_KEY}`,
    'Accept': 'application/json'
  }
})

async function buyNumber(country, service) {
  try {
    const response = await fivesimClient.post(`/user/buy/activation/${country}/any/${service}`)
    if (response.data?.data) {
      const order = response.data.data
      return {
        success: true,
        orderId: order.id,
        phoneNumber: order.phone,
        service: order.service,
        country: order.country,
        price: order.cost,
        status: order.status,
        expiresAt: order.expires
      }
    }
    return { success: false, error: 'Invalid response from 5sim' }
  } catch (error) {
    console.error('5sim error:', error.response?.data?.message || error.message)
    return { success: false, error: error.response?.data?.message || error.message }
  }
}

async function checkSMS(orderId) {
  try {
    const response = await fivesimClient.get(`/user/check/${orderId}`)
    if (response.data?.data) {
      const order = response.data.data
      return {
        success: true,
        status: order.status,
        sms: order.sms || null,
        code: order.sms ? order.sms.split(' ').find(s => /^\d{4,}$/.test(s)) : null,
        expiresAt: order.expires
      }
    }
    return { success: false, status: 'error', error: 'Invalid response' }
  } catch (error) {
    console.error('5sim checkSMS error:', error.message)
    return { success: false, status: 'error', error: error.message }
  }
}

async function cancelOrder(orderId) {
  try {
    const response = await fivesimClient.post(`/user/cancel/${orderId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function finishOrder(orderId) {
  try {
    const response = await fivesimClient.post(`/user/finish/${orderId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ================= PAYSTACK API CLIENT ================= 
const paystackClient = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
})

async function initializePayment(email, amount, reference) {
  try {
    const response = await paystackClient.post('/transaction/initialize', {
      email,
      amount,
      reference
    })
    if (response.data?.status) {
      return {
        success: true,
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        reference: response.data.data.reference
      }
    }
    return { success: false, error: 'Failed to initialize payment' }
  } catch (error) {
    console.error('Paystack error:', error.response?.data?.message || error.message)
    return { success: false, error: error.response?.data?.message || error.message }
  }
}

async function verifyPayment(reference) {
  try {
    const response = await paystackClient.get(`/transaction/verify/${reference}`)
    if (response.data?.status) {
      const data = response.data.data
      if (data.status === 'success') {
        return {
          success: true,
          status: 'success',
          reference: data.reference,
          amount: data.amount / 100,
          currency: data.currency,
          email: data.customer.email
        }
      }
    }
    return { success: false, error: 'Payment verification failed' }
  } catch (error) {
    console.error('Paystack verify error:', error.message)
    return { success: false, error: error.message }
  }
}

// ================= FIREBASE SERVICE FUNCTIONS ================= 
async function getUser(uid) {
  try {
    if (!db) return null
    const doc = await db.collection('users').doc(uid).get()
    return doc.exists ? { id: uid, ...doc.data() } : null
  } catch (error) {
    return null
  }
}

async function setUser(uid, userData) {
  try {
    if (!db) return { success: false }
    await db.collection('users').doc(uid).set(userData, { merge: true })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function saveOrder(orderData) {
  try {
    if (!db) return { success: false }
    const docRef = await db.collection('orders').add({
      ...orderData,
      createdAt: new Date().toISOString()
    })
    return { success: true, orderId: docRef.id }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function updateOrder(docId, updateData) {
  try {
    if (!db) return { success: false }
    await db.collection('orders').doc(docId).update(updateData)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function getOrder(orderId) {
  try {
    if (!db) return null
    const doc = await db.collection('orders').doc(orderId).get()
    return doc.exists ? { id: orderId, ...doc.data() } : null
  } catch (error) {
    return null
  }
}

async function getUserOrders(uid) {
  try {
    if (!db) return { orders: [] }
    const snapshot = await db.collection('orders')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .get()
    const orders = []
    snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }))
    return { success: true, orders }
  } catch (error) {
    return { success: false, orders: [] }
  }
}

async function saveTransaction(txData) {
  try {
    if (!db) return { success: false }
    const docRef = await db.collection('transactions').add({
      ...txData,
      createdAt: new Date().toISOString()
    })
    return { success: true, id: docRef.id }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function getUserTransactions(uid) {
  try {
    if (!db) return { transactions: [] }
    const snapshot = await db.collection('transactions')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .get()
    const transactions = []
    snapshot.forEach(doc => transactions.push({ id: doc.id, ...doc.data() }))
    return { success: true, transactions }
  } catch (error) {
    return { success: false, transactions: [] }
  }
}

async function addToWallet(uid, amount) {
  try {
    if (!db) return { success: false }
    const userRef = db.collection('users').doc(uid)
    const user = await getUser(uid)
    const currentBalance = user?.wallet || 0
    const newBalance = currentBalance + amount
    
    await userRef.update({
      wallet: newBalance,
      updatedAt: new Date().toISOString()
    })
    
    return { success: true, newBalance }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ================= MIDDLEWARE ================= 
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))
app.use(express.static(path.join(__dirname)))

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// Authentication middleware
async function authenticateUser(req, res, next) {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1]
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' })
    }
    
    if (!admin.apps.length || !admin.auth) {
      return res.status(500).json({ success: false, error: 'Auth not configured' })
    }
    
    const decodedToken = await admin.auth().verifyIdToken(token)
    req.user = { uid: decodedToken.uid, email: decodedToken.email }
    next()
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' })
  }
}

// Rate limiting
const requestCounts = new Map()
function rateLimit(max, window) {
  return (req, res, next) => {
    const key = req.ip
    const now = Date.now()
    const requests = requestCounts.get(key) || []
    const recentRequests = requests.filter(t => now - t < window)
    
    if (recentRequests.length >= max) {
      return res.status(429).json({ error: 'Too many requests' })
    }
    
    recentRequests.push(now)
    requestCounts.set(key, recentRequests)
    next()
  }
}

app.use('/api/', rateLimit(100, 60000)) // 100 requests per minute

// ================= TELEGRAM BOT ================= 
let bot = null
let primeSMSBot = null

if (TELEGRAM_BOT_TOKEN) {
  try {
    const TelegramBot = require('node-telegram-bot-api')
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false })
    
    // Try to initialize SMS bot if available
    try {
      const PrimeSMSBot = require('./telegram-bot/bot')
      primeSMSBot = new PrimeSMSBot(TELEGRAM_BOT_TOKEN)
    } catch (e) {
      console.warn('⚠️ SMS bot module not available')
    }
    
    const botEndpoint = `/bot${TELEGRAM_BOT_TOKEN}`
    if (SERVER_URL !== `http://localhost:${PORT}`) {
      bot.setWebHook(`${SERVER_URL}${botEndpoint}`)
    }
    
    app.post(botEndpoint, (req, res) => {
      bot.processUpdate(req.body)
      res.sendStatus(200)
    })
    
    console.log('✅ Telegram bot initialized')
  } catch (err) {
    console.error('⚠️ Telegram bot error:', err.message)
  }
} else {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN not set')
}

// ================= ACTIVE WEB SOCKETS ================= 
const activeWebSockets = new Map() // userId -> socket mapping

// ================= SOCKET.IO CONNECTION ================= 
io.on('connection', async (socket) => {
  const userId = socket.id
  activeWebSockets.set(userId, socket)
  
  console.log(`WebSocket connected: ${socket.id}`)

  // Welcome message
  const welcomeText = "👋 Hello! Welcome to PrimeSmsHub. How can we help you today?"
  socket.emit('tg_message', { 
    text: welcomeText, 
    from: "Support",
    timestamp: new Date().toISOString()
  })

  // Store welcome in history
  if (redis) {
    try {
      const welcomeObj = { 
        socketId: userId, 
        text: welcomeText, 
        from: 'Support',
        userDetails: null,
        date: Date.now() 
      }
      await redis.lpush('tg_messages', JSON.stringify(welcomeObj))
      await redis.ltrim('tg_messages', 0, 99)
    } catch (e) {
      console.warn('Redis save failed:', e.message)
    }
  }

  /**
   * Send message from web user to Telegram support
   * Now includes user details (name, email, message)
   */
  socket.on('send_message', async (data) => {
    const { text, userDetails = {} } = data
    
    if (!text) {
      socket.emit('error', { message: 'Message cannot be empty' })
      return
    }

    try {
      // Format message for Telegram admin
      const userInfo = userDetails.name || userDetails.email || userId
      const report = `
🌐 **NEW MESSAGE FROM WEB SUPPORT**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 **From:** ${userInfo}
${userDetails.email ? `📧 **Email:** \`${userDetails.email}\`` : ''}
${userDetails.phone ? `📱 **Phone:** \`${userDetails.phone}\`` : ''}
🆔 **Socket ID:** \`${userId}\`
💬 **Message:** ${text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

      // Send to Telegram support admin
      if (bot) {
        await bot.sendMessage(DEFAULT_CHAT_ID, report, { parse_mode: 'Markdown' })
      }

      // Store in Redis history with user details
      if (redis) {
        const msgObj = { 
          socketId: userId, 
          text: text, 
          from: 'Web User',
          userDetails: {
            name: userDetails.name || 'Anonymous',
            email: userDetails.email || null,
            phone: userDetails.phone || null
          },
          date: Date.now() 
        }
        await redis.lpush('tg_messages', JSON.stringify(msgObj))
        await redis.ltrim('tg_messages', 0, 99)
      }

      // Confirm to user
      socket.emit('message_sent', { 
        ok: true,
        message: 'Your message has been sent to our support team!'
      })
    } catch (error) {
      console.error('Error sending message:', error)
      socket.emit('error', { message: 'Failed to send message' })
    }
  })

  /**
   * Stop polling for OTP
   */
  socket.on('stop_polling', () => {
    // Handle any polling cleanup if needed
  })

  socket.on('disconnect', () => {
    activeWebSockets.delete(userId)
    console.log(`WebSocket disconnected: ${socket.id}`)
  })
})

// ================= TELEGRAM SUPPORT RELAY ================= 
/**
 * When support replies to a message, send it back to web user
 * Support replies TO the original message
 */
if (bot) {
  bot.on('message', async (msg) => {
    try {
      // Check if this is a reply to a web user message
      if (!msg.reply_to_message || msg.from.is_bot) return

      // Extract Socket ID from original message
      const originalText = msg.reply_to_message.text || ""
      const socketMatch = originalText.match(/Socket ID: `([a-zA-Z0-9._-]+)`/)
      
      if (!socketMatch || !socketMatch[1]) return

      const targetSocketId = socketMatch[1]
      const replyText = msg.text

      // Save support reply to Redis
      if (redis) {
        const replyObj = { 
          replyToSocketId: targetSocketId, 
          text: replyText, 
          from: 'Support',
          userDetails: null,
          date: Date.now() 
        }
        await redis.lpush('tg_messages', JSON.stringify(replyObj))
        await redis.ltrim('tg_messages', 0, 99)
      }

      // Send reply to web user socket
      const webClient = activeWebSockets.get(targetSocketId)
      if (webClient) {
        webClient.emit('tg_message', { 
          text: replyText, 
          from: "Support",
          timestamp: new Date().toISOString()
        })
        
        // Confirm to support on Telegram
        await bot.sendMessage(msg.chat.id, "✅ Reply delivered to user in browser!")
      } else {
        // User is offline
        await bot.sendMessage(msg.chat.id, 
          "⌛ User is currently offline. They will see your message when they return.")
      }
    } catch (error) {
      console.error('Telegram relay error:', error)
    }
  })
}

// ================= API ROUTES ================= 

// POST /api/number/buy
app.post('/api/number/buy', authenticateUser, async (req, res) => {
  try {
    const { country, service } = req.body
    const uid = req.user.uid

    if (!country || !service) {
      return res.status(400).json({ success: false, error: 'Country and service required' })
    }

    const user = await getUser(uid)
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    if ((user.wallet || 0) < 1) {
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' })
    }

    const buyResult = await buyNumber(country, service)
    if (!buyResult.success) {
      return res.status(400).json({ success: false, error: buyResult.error })
    }

    const orderData = {
      uid,
      fivesimOrderId: buyResult.orderId,
      phoneNumber: buyResult.phoneNumber,
      service,
      country,
      price: buyResult.price,
      status: 'pending',
      sms: null,
      expiresAt: buyResult.expiresAt,
      createdAt: new Date().toISOString()
    }

    const saveResult = await saveOrder(orderData)
    if (!saveResult.success) {
      return res.status(500).json({ success: false, error: 'Failed to save order' })
    }

    await addToWallet(uid, -buyResult.price)

    res.json({
      success: true,
      orderId: saveResult.orderId,
      phoneNumber: buyResult.phoneNumber,
      service,
      country,
      price: buyResult.price,
      expiresAt: buyResult.expiresAt,
      message: `Number purchased: ${buyResult.phoneNumber}`
    })
  } catch (error) {
    console.error('POST /api/number/buy error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/number/sms/:orderId
app.get('/api/number/sms/:orderId', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params
    const uid = req.user.uid

    const order = await getOrder(orderId)
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' })
    }

    if (order.uid !== uid) {
      return res.status(403).json({ success: false, error: 'Unauthorized' })
    }

    const smsResult = await checkSMS(order.fivesimOrderId)
    if (!smsResult.success) {
      return res.status(400).json({ success: false, error: smsResult.error })
    }

    if (smsResult.status === 'received' && smsResult.code) {
      await updateOrder(orderId, {
        status: 'received',
        sms: smsResult.sms,
        code: smsResult.code,
        receivedAt: new Date().toISOString()
      })
    }

    res.json({
      success: true,
      status: smsResult.status,
      sms: smsResult.sms,
      code: smsResult.code,
      message: smsResult.status === 'received' ? 'SMS received' : `Status: ${smsResult.status}`
    })
  } catch (error) {
    console.error('GET /api/number/sms error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/number/cancel/:orderId
app.post('/api/number/cancel/:orderId', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params
    const uid = req.user.uid

    const order = await getOrder(orderId)
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' })
    }

    if (order.uid !== uid) {
      return res.status(403).json({ success: false, error: 'Unauthorized' })
    }

    const cancelResult = await cancelOrder(order.fivesimOrderId)
    if (!cancelResult.success) {
      return res.status(400).json({ success: false, error: cancelResult.error })
    }

    await updateOrder(orderId, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    })

    const refundAmount = order.price * 0.9
    await addToWallet(uid, refundAmount)

    res.json({
      success: true,
      message: 'Order cancelled',
      refunded: refundAmount
    })
  } catch (error) {
    console.error('POST /api/number/cancel error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/number/finish/:orderId
app.post('/api/number/finish/:orderId', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params
    const uid = req.user.uid

    const order = await getOrder(orderId)
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' })
    }

    if (order.uid !== uid) {
      return res.status(403).json({ success: false, error: 'Unauthorized' })
    }

    const finishResult = await finishOrder(order.fivesimOrderId)
    if (!finishResult.success) {
      return res.status(400).json({ success: false, error: finishResult.error })
    }

    await updateOrder(orderId, {
      status: 'completed',
      completedAt: new Date().toISOString()
    })

    res.json({
      success: true,
      message: 'Order completed'
    })
  } catch (error) {
    console.error('POST /api/number/finish error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/dashboard
app.get('/api/dashboard', authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid

    const user = await getUser(uid)
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    const ordersResult = await getUserOrders(uid)
    const orders = ordersResult.orders || []

    const activeNumbers = orders.filter(o => 
      o.status === 'pending' || o.status === 'received'
    )

    const transactionsResult = await getUserTransactions(uid)
    const recentTransactions = (transactionsResult.transactions || []).slice(0, 5)

    const totalSpent = orders.reduce((sum, o) => sum + (o.price || 0), 0)

    res.json({
      success: true,
      wallet: user.wallet || 0,
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      activeNumbersCount: activeNumbers.length,
      totalOrdersCount: orders.length,
      activeNumbers: activeNumbers.map(o => ({
        id: o.id,
        phoneNumber: o.phoneNumber,
        service: o.service,
        country: o.country,
        status: o.status,
        expiresAt: o.expiresAt,
        sms: o.sms,
        code: o.code
      })),
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        amount: t.amount,
        currency: t.currency || 'USD',
        reference: t.paystackReference,
        status: t.status || 'success',
        createdAt: t.createdAt
      }))
    })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/transactions
app.get('/api/transactions', authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid

    const ordersResult = await getUserOrders(uid)
    const orders = ordersResult.orders || []

    const transactionsResult = await getUserTransactions(uid)
    const transactions = transactionsResult.transactions || []

    const numberTransactions = orders.map(o => ({
      id: o.id,
      type: 'number_purchase',
      date: o.createdAt,
      service: o.service,
      country: o.country,
      phoneNumber: o.phoneNumber,
      price: o.price,
      status: o.status,
      orderId: o.id
    }))

    const walletTransactions = transactions.map(t => ({
      id: t.id,
      type: 'wallet_topup',
      date: t.createdAt,
      amount: t.amount,
      currency: t.currency,
      status: 'completed',
      reference: t.paystackReference
    }))

    const allTransactions = [...numberTransactions, ...walletTransactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    res.json({
      success: true,
      transactions: allTransactions,
      count: allTransactions.length
    })
  } catch (error) {
    console.error('GET /api/transactions error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/funds/add
app.post('/api/funds/add', authenticateUser, async (req, res) => {
  try {
    const { amount } = req.body
    const uid = req.user.uid
    const email = req.user.email

    if (!amount || amount < 1 || amount > 100000) {
      return res.status(400).json({ success: false, error: 'Invalid amount' })
    }

    const reference = `PSH-${uid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

    const paymentResult = await initializePayment(
      email,
      Math.round(amount * 100),
      reference
    )

    if (!paymentResult.success) {
      return res.status(400).json({ success: false, error: paymentResult.error })
    }

    await saveTransaction({
      uid,
      amount,
      currency: 'USD',
      paystackReference: reference,
      authorizationUrl: paymentResult.authorizationUrl,
      status: 'pending',
      type: 'wallet_topup'
    })

    res.json({
      success: true,
      authorizationUrl: paymentResult.authorizationUrl,
      accessCode: paymentResult.accessCode,
      reference: reference,
      amount: amount,
      message: 'Payment initialized. Redirecting to Paystack...'
    })
  } catch (error) {
    console.error('POST /api/funds/add error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/funds/verify
app.post('/api/funds/verify', authenticateUser, async (req, res) => {
  try {
    const { reference } = req.body
    const uid = req.user.uid

    if (!reference) {
      return res.status(400).json({ success: false, error: 'Reference required' })
    }

    const verifyResult = await verifyPayment(reference)
    if (!verifyResult.success) {
      return res.status(400).json({ success: false, error: verifyResult.error })
    }

    const walletResult = await addToWallet(uid, verifyResult.amount)
    if (!walletResult.success) {
      return res.status(500).json({ success: false, error: 'Failed to update wallet' })
    }

    res.json({
      success: true,
      message: `Wallet topped up with $${verifyResult.amount}`,
      newBalance: walletResult.newBalance,
      amount: verifyResult.amount,
      reference: reference
    })
  } catch (error) {
    console.error('POST /api/funds/verify error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/funds/public-key
app.get('/api/funds/public-key', (req, res) => {
  res.json({
    publicKey: PAYSTACK_PUBLIC_KEY,
    message: 'Paystack public key'
  })
})

// GET /api/messages
app.get('/api/messages', async (req, res) => {
  try {
    if (!redis) {
      return res.json({ ok: false, messages: [] })
    }
    
    const msgs = await redis.lrange('tg_messages', 0, 99)
    res.json({ 
      ok: true, 
      messages: msgs.map(m => {
        try {
          return JSON.parse(m)
        } catch (e) {
          return m
        }
      })
    })
  } catch (error) {
    res.json({ ok: false, messages: [], error: error.message })
  }
})

// GET /api/wallet
app.get('/api/wallet', authenticateUser, async (req, res) => {
  try {
    const user = await getUser(req.user.uid)
    res.json({ balance: user?.wallet || 0 })
  } catch (error) {
    res.json({ balance: 0 })
  }
})

// POST /paystack/webhook
app.post('/paystack/webhook', async (req, res) => {
  try {
    const { data } = req.body

    if (data?.status === 'success') {
      const amountInUSD = data.amount / 100

      if (redis) {
        const paymentObj = {
          transaction_id: data.id,
          amount: amountInUSD,
          currency: data.currency,
          customer: data.customer,
          timestamp: Date.now()
        }
        await redis.lpush('payments', JSON.stringify(paymentObj))
      }

      if (bot) {
        const message = `
💰 **NEW PAYMENT VERIFIED**
💵 Amount: $${amountInUSD}
📧 Email: ${data.customer?.email}
👤 Customer: ${data.customer?.name || 'Unknown'}
🆔 Transaction: \`${data.reference}\``
        await bot.sendMessage(DEFAULT_CHAT_ID, message, { parse_mode: 'Markdown' })
      }

      io.emit('wallet_update', { 
        balance: amountInUSD,
        message: 'Wallet updated!'
      })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Paystack webhook error:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /paystack-public-key
app.get('/paystack-public-key', (req, res) => {
  res.json({ publicKey: PAYSTACK_PUBLIC_KEY })
})

// GET /health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'Prime SMS Hub v2.0',
    timestamp: new Date().toISOString(),
    features: {
      sms_hub: '✅',
      support_chat: '✅',
      payments: PAYSTACK_PUBLIC_KEY ? '✅' : '❌',
      telegram_bot: bot ? '✅' : '❌',
      firebase: db ? '✅' : '❌',
      redis: redis ? '✅' : '❌',
      websocket: '✅'
    }
  })
})

// ================= START SERVER ================= 
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 Prime SMS Hub v2.0 - UNIFIED SERVER     ║
╠═══════════════════════════════════════════════╣
║ Port: ${PORT.toString().padEnd(35)}║
║ Mode: ${(process.env.NODE_ENV || 'production').padEnd(37)}║
║ SMS Hub: ✅ Enabled                          ║
║ Support Chat: ✅ Enabled                     ║
║ Telegram Bot: ${bot ? '✅ Enabled'.padEnd(33) : '⚠️  Disabled'.padEnd(33)}║
║ Paystack: ${PAYSTACK_PUBLIC_KEY ? '✅ Configured'.padEnd(31) : '⚠️  Not set'.padEnd(31)}║
║ 5sim: ${FIVESIM_API_KEY ? '✅ Configured'.padEnd(32) : '⚠️  Not set'.padEnd(32)}║
║ Firebase: ${db ? '✅ Connected'.padEnd(31) : '⚠️  Not set'.padEnd(31)}║
║ Redis: ${redis ? '✅ Connected'.padEnd(33) : '⚠️  Disabled'.padEnd(33)}║
╚═══════════════════════════════════════════════╝
  `);
  
  console.log('📊 Available APIs:');
  console.log('   POST   /api/number/buy');
  console.log('   GET    /api/number/sms/:orderId');
  console.log('   POST   /api/number/cancel/:orderId');
  console.log('   POST   /api/number/finish/:orderId');
  console.log('   GET    /api/dashboard');
  console.log('   GET    /api/transactions');
  console.log('   POST   /api/funds/add');
  console.log('   POST   /api/funds/verify');
  console.log('   GET    /api/funds/public-key');
  console.log('   GET    /api/messages (chat)');
  console.log('   GET    /api/wallet');
  console.log('   GET    /health (status)');
  console.log('');
  console.log('✅ Server ready for requests!');
})

module.exports = { app, io, server, db, bot, redis }
