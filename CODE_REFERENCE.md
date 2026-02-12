# Code Reference: Frontend-Backend Integration

## Part 1: Frontend API Call Implementation

### Updated apiCall() Function (js/utils.js)

```javascript
// ============================================================
// API CALLER - Centralized fetch helper
// ============================================================
async function apiCall(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    showErrors = true,
  } = options;

  try {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    // Determine the full URL for the API call
    // In production, use BACKEND_URL + /api + endpoint
    // In development (localhost), use relative path
    let fullUrl = endpoint;
    if (typeof BACKEND_URL !== 'undefined' && BACKEND_URL && !endpoint.startsWith('http')) {
      // Ensure endpoint starts with /api if not already
      const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
      fullUrl = `${BACKEND_URL}${apiEndpoint}`;
    } else if (!endpoint.startsWith('http')) {
      // Local development fallback - prepend /api if not present
      fullUrl = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    }

    const response = await fetch(fullUrl, config);
    const data = await response.json();

    // Handle authentication errors
    if (response.status === 401) {
      window.location.href = 'login.html';
      return null;
    }

    // Handle errors
    if (!response.ok) {
      if (showErrors) {
        showError(data.message || `Error: ${response.statusText}`);
      }
      return null;
    }

    return data;

  } catch (error) {
    console.error('API Error:', error);
    if (showErrors) {
      showError('Network error. Please check your connection.');
    }
    return null;
  }
}
```

### BACKEND_URL Configuration (All Frontend Files)

Each frontend file (buy-number.js, dashboard.js, transactions.js, usa-numbers.js) has:

```javascript
// Backend URL - set to your Render deployment URL or local dev server
// For production (Render): https://smshub-ftgg.onrender.com
// For local development: http://localhost:3000
const BACKEND_URL = 'https://smshub-ftgg.onrender.com'
```

### Example Frontend Call: Buy Number

**In buy-number.js (lines ~127)**

```javascript
async function handleBuyNumber(e) {
  e.preventDefault();

  const country = countrySelect.value;
  const service = serviceSelect.value;

  if (!country || !service) {
    showError('Please select country and service');
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    // This call is automatically transformed by apiCall():
    // - Endpoint: '/number/buy'
    // - Gets prefixed: '/api/number/buy'
    // - Gets full URL: 'https://smshub-ftgg.onrender.com/api/number/buy'
    const result = await apiCall('/number/buy', {
      method: 'POST',
      body: JSON.stringify({ country, service })
    });

    if (result && result.success) {
      displayPurchaseSuccess(result);
      buyForm.innerHTML = '';
    } else {
      showError(result?.error || 'Failed to purchase number');
    }
  } catch (error) {
    showError(error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
}
```

### How the Transformation Works

```
Development (localhost:3000):
  ┌─────────────────────────────────────────┐
  │ javascript: apiCall('/number/buy', {..})│
  └─────────────────────────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────────┐
  │ js/utils.js detects BACKEND_URL is undefined│
  │ or localhost, uses relative path            │
  └──────────────────────────────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────────┐
  │ fetch('http://localhost:3000/api/number/buy')│
  └──────────────────────────────────────────────┘


Production (Render):
  ┌──────────────────────────────────────────────┐
  │ javascript: apiCall('/number/buy', {..})     │
  └──────────────────────────────────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────────────────┐
  │ js/utils.js detects BACKEND_URL is defined      │
  │ = 'https://smshub-ftgg.onrender.com'           │
  └─────────────────────────────────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────────────────┐
  │ fetch('https://smshub-ftgg.onrender.com/api/number  │
  │    /buy')                                            │
  └──────────────────────────────────────────────────────┘
```

---

## Part 2: Backend Configuration

### Complete server.js Structure

The server.js is fully configured for production. Here's the relevant sections:

**CORS Configuration (Lines 256-263):**
```javascript
// CORS headers - Allow API key authentication and extensions
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})
```

**POST /api/number/buy Endpoint (Lines 592-646):**
```javascript
app.post('/api/number/buy', authenticateUser, async (req, res) => {
  try {
    const { country, service } = req.body
    const uid = req.user.uid

    // 1. Validate input
    if (!country || !service) {
      return res.status(400).json({ 
        success: false, 
        error: 'Country and service required' 
      })
    }

    // 2. Check user exists and has wallet
    const user = await getUser(uid)
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      })
    }

    // 3. Check wallet balance
    if ((user.wallet || 0) < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient wallet balance' 
      })
    }

    // 4. Buy number from 5SIM API
    const buyResult = await fivesimService.buyNumber(country, service)
    if (!buyResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: buyResult.error 
      })
    }

    // 5. Save order to Firebase
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
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to save order' 
      })
    }

    // 6. Deduct from wallet
    await addToWallet(uid, -buyResult.price)

    // 7. Return success response
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
```

**Environment Variables Used (Lines 33-37):**
```javascript
const PORT = process.env.PORT || 3000
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || ''
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''
const FIVESIM_API_KEY = process.env.FIVESIM_API_KEY || ''
const DEFAULT_CHAT_ID = process.env.DEFAULT_CHAT_ID || 7711425125
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`
```

**Server Startup (Lines 1040-1071):**
```javascript
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
})

module.exports = { app, io, server, db, bot, redis }
```

---

## Part 3: Request/Response Examples

### POST /api/number/buy

**Request:**
```javascript
// Frontend call
const result = await apiCall('/number/buy', {
  method: 'POST',
  body: JSON.stringify({ 
    country: 'US', 
    service: 'google' 
  })
});
```

**HTTP Details:**
```
POST https://smshub-ftgg.onrender.com/api/number/buy
Content-Type: application/json
Authorization: Bearer <user_firebase_token>

{
  "country": "US",
  "service": "google"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "orderId": "abc123def456",
  "phoneNumber": "+12025551234",
  "service": "google",
  "country": "US",
  "price": 0.49,
  "expiresAt": "2025-02-13T09:00:00Z",
  "message": "Number purchased: +12025551234"
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Insufficient wallet balance"
}
```

### GET /api/number/sms/:orderId

**Frontend Call:**
```javascript
const response = await apiCall(`/number/sms/${orderId}`);
```

**Success Response:**
```json
{
  "success": true,
  "status": "received",
  "sms": "Your verification code is: 123456",
  "code": "123456",
  "message": "SMS received"
}
```

---

## Part 4: Environment Variables Reference

### .env File (Complete Example)

```dotenv
# ============================================================
# FRONTEND CONFIGURATION
# ============================================================
REACT_APP_BACKEND_URL=https://smshub-ftgg.onrender.com

# ============================================================
# BACKEND SERVER
# ============================================================
PORT=3000
NODE_ENV=production
SERVER_URL=https://smshub-ftgg.onrender.com

# ============================================================
# PAYSTACK (Payment)
# ============================================================
PAYSTACK_SECRET_KEY=sk_live_1a2b3c4d5e6f7g8h9i0j
PAYSTACK_PUBLIC_KEY=pk_live_1a2b3c4d5e6f7g8h9i0j

# ============================================================
# 5SIM (SMS Service)
# ============================================================
FIVESIM_API_KEY=abc123def456ghi789jkl

# ============================================================
# TELEGRAM BOT
# ============================================================
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxyz
DEFAULT_CHAT_ID=7711425125

# ============================================================
# FIREBASE (User Database)
# ============================================================
FIREBASE_PROJECT_ID=smshub-project
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@smshub-project.iam.gserviceaccount.com

# ============================================================
# REDIS (Optional)
# ============================================================
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=abc123def456

# ============================================================
# SECURITY
# ============================================================
PRIME_API_KEY=super_secret_api_key_123456
```

---

## Part 5: Testing the Integration

### Test 1: Verify Backend is Running
```bash
curl https://smshub-ftgg.onrender.com/paystack-public-key
# Expected: {"publicKey":"pk_live_..."}
```

### Test 2: Test Frontend JavaScript
```javascript
// Open buy-number.html in browser
// Press F12 to open Developer Tools
// Go to Console tab
// Paste:

console.log('BACKEND_URL:', typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : 'Not defined');

// Then test apiCall:
apiCall('/number/buy', {
  method: 'POST',
  body: JSON.stringify({ country: 'US', service: 'google' })
}).then(r => {
  console.log('Response:', r);
  console.log('Status:', r?.success ? 'Success' : 'Error - ' + r?.error);
});

// You should see an authentication error (expected if not logged in)
// But NOT a network error - that means backend is reachable!
```

### Test 3: Full Flow
1. Login to frontend
2. Buy a number
3. Check browser Network tab (F12 → Network)
4. Look for POST request to `/api/number/buy`
5. Should see 200 response with success JSON

---

## Part 6: Common Integration Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| CORS error in console | Frontend and backend on different domains | ✅ Done: CORS headers configured |
| "Network Error" on button | `BACKEND_URL` not set correctly | Check `const BACKEND_URL` in js files |
| 404 on `/number/buy` | Missing `/api` prefix | ✅ Done: apiCall() adds it automatically |
| 401 Unauthorized | Not logged in | User must login first |
| Missing endpoint error | Typo in endpoint path | Use `/number/buy` not `/buy-numbers` |
| Paystack key error | Wrong key format | Check it's `sk_live_` not `sk_test_` |

---

## Summary

**Before (Broken):**
```javascript
// Frontend file - hardcoded, works only if frontend on same domain
fetch('/number/buy')  // Breaks if frontend on different domain!
```

**After (Working):**
```javascript
// Frontend file - uses BACKEND_URL for production
const BACKEND_URL = 'https://smshub-ftgg.onrender.com'
// js/utils.js:
apiCall('/number/buy')  // Prepends BACKEND_URL + /api = correct URL!
```

**Deploy:**
1. Add env vars to Render
2. Push code to GitHub
3. Render auto-deploys
4. Backend runs with `npm start` → `node server.js`
5. Frontend calls `BACKEND_URL` → works! 🎉
