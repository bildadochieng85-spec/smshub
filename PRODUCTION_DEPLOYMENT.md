# Production Deployment Guide - Render

## Overview
This guide explains how to deploy the Prime SMS Hub to Render with proper frontend-backend communication, CORS configuration, and environment variables.

## Current Status
- ✅ **server.js** - Complete Express backend with CORS enabled
- ✅ **package.json** - Configured with `"start": "node server.js"` for Render
- ✅ **Frontend API calls** - Updated to use backend URL for production
- ✅ **CORS headers** - Properly configured for cross-origin requests
- ✅ **.env configuration** - Environment variables ready for secrets

---

## Part 1: Frontend Configuration

### What Was Fixed
The frontend's `apiCall()` function in `js/utils.js` now:
1. Prepends the `BACKEND_URL` to all API calls
2. Automatically adds `/api` prefix if missing
3. Works for both local development and production

### Frontend Files Updated
```javascript
// Each frontend file now has:
const BACKEND_URL = 'https://smshub-ftgg.onrender.com'
```

**Files with this constant:**
- `js/buy-number.js`
- `js/dashboard.js`
- `js/transactions.js`
- `js/usa-numbers.js`

### How Frontend Calls Backend
**OLD (Broken in production):**
```javascript
// This sent request to https://example.com/api/number/buy
// if frontend was on different domain
const response = await fetch('/number/buy')
```

**NEW (Works everywhere):**
```javascript
// js/utils.js automatically does:
// 1. Checks if BACKEND_URL is defined
// 2. Prepends http://localhost:3000/api/number/buy (dev)
//    or https://smshub-ftgg.onrender.com/api/number/buy (production)
const result = await apiCall('/number/buy', {
  method: 'POST',
  body: JSON.stringify({ country, service })
})
```

---

## Part 2: Backend Configuration (server.js)

### Key Features Already Implemented

**1. CORS Headers (Lines 257-263)**
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})
```
✅ Allows frontend from ANY domain to call backend
✅ Handles preflight OPTIONS requests
✅ Allows Content-Type, Authorization, and x-api-key headers

**2. POST /api/number/buy Endpoint (Line 592)**
```javascript
app.post('/api/number/buy', authenticateUser, async (req, res) => {
  // Validates user has sufficient wallet balance
  // Calls 5SIM to buy the number
  // Saves order to Firebase
  // Deducts from wallet
  // Returns: { success, orderId, phoneNumber, service, country, expiresAt }
})
```

**3. Environment Variables Used**
```javascript
const PORT = process.env.PORT || 3000                    // Set by Render
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const FIVESIM_API_KEY = process.env.FIVESIM_API_KEY
const SERVER_URL = process.env.SERVER_URL                // For webhooks
```

### Server Response Format
```javascript
// Success response from POST /api/number/buy
{
  "success": true,
  "orderId": "doc_id_123",
  "phoneNumber": "+1234567890",
  "service": "google",
  "country": "US",
  "price": 0.49,
  "expiresAt": "2025-02-13T09:00:00Z",
  "message": "Number purchased: +1234567890"
}

// Error response
{
  "success": false,
  "error": "Insufficient wallet balance"
}
```

---

## Part 3: Environment Variables Setup

### Step 1: Create .env file
```bash
# Rename .env.example to .env
# On Linux/Mac:
cp .env.example .env

# On Windows:
# Right-click .env.example → Copy → Paste → Rename to .env
```

### Step 2: Fill in Required Values

**Backend URL (for frontend to reach backend)**
```dotenv
# In the HTML/CSS project files (frontend):
# This is already in each js/*.js file, but you can override here
REACT_APP_BACKEND_URL=https://smshub-ftgg.onrender.com
```

**Paystack Configuration**
```dotenv
PAYSTACK_SECRET_KEY=sk_live_your_actual_secret_key_from_dashboard
PAYSTACK_PUBLIC_KEY=pk_live_your_actual_public_key_from_dashboard
```
> ⚠️ **CRITICAL**: Never commit real keys to GitHub!
> Only .env is in .gitignore. .env.example should never have real keys.

**5SIM Configuration**
```dotenv
FIVESIM_API_KEY=your_actual_5sim_api_key_here
```

**Server URLs**
```dotenv
SERVER_URL=https://smshub-ftgg.onrender.com
NODE_ENV=production
PORT=3000  # Render will override this automatically
```

**Optional Services**
```dotenv
# Firebase (for user database)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=... 
FIREBASE_CLIENT_EMAIL=...

# Telegram Bot (for notifications)
TELEGRAM_BOT_TOKEN=...
DEFAULT_CHAT_ID=...

# Redis (for chat history)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Part 4: Deploy to Render

### Step 1: Prepare Repository
```bash
# Ensure .env is NOT committed
git status
# Should NOT show .env if .gitignore is correct

# Make sure all changes are committed
git add .
git commit -m "Fix CORS, update frontend API calls for production"
git push origin main
```

### Step 2: Create Render Service
1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Select your GitHub repository
4. Configure:
   - **Name**: smshub (or your choice)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or your preference)

### Step 3: Add Environment Variables
In Render dashboard:
1. Click your service
2. Go to **Environment** tab
3. Add each variable from your .env:

```
PAYSTACK_SECRET_KEY = sk_live_xxxxx
PAYSTACK_PUBLIC_KEY = pk_live_xxxxx
FIVESIM_API_KEY = xxxxx
TELEGRAM_BOT_TOKEN = xxxxx
DEFAULT_CHAT_ID = xxxxx
NODE_ENV = production
SERVER_URL = https://YOUR_RENDER_URL.onrender.com
```

> 🎯 Get your Render URL after first deployment!

### Step 4: Deploy
- Render auto-deploys when you push to GitHub
- Or click **Manual Deploy** button
- Wait for "Deploy successful" message
- Your backend is now live! 🚀

---

## Part 5: Update Frontend for Production

Once your backend is deployed to Render:

1. Get your Render URL (e.g., `https://smshub-ftgg.onrender.com`)

2. Update each frontend file:

```javascript
// In: js/buy-number.js, js/dashboard.js, js/transactions.js, js/usa-numbers.js
const BACKEND_URL = 'https://smshub-ftgg.onrender.com'  // ← Your Render URL
```

3. If frontend is also hosted (e.g., on Render, Netlify):
   - Update that deployment too
   - Make sure both are using the same backend URL

---

## Part 6: Testing the Connection

### Test 1: Check Backend is Running
```bash
curl https://smshub-ftgg.onrender.com/health
# Should return something

curl https://smshub-ftgg.onrender.com/paystack-public-key
# Should return: { "publicKey": "pk_live_xxxxx" }
```

### Test 2: Test Frontend Call
Open browser Developer Tools (F12):

```javascript
// In Console, test the apiCall function:
apiCall('/number/buy', {
  method: 'POST',
  body: JSON.stringify({ country: 'US', service: 'google' })
}).then(r => console.log(r))

// Should show error about authentication (not network error!)
// This proves the connection is working
```

### Test 3: Full Integration Test
1. Open your frontend (buy-number.html)
2. Select country and service
3. Click "Buy Number"
4. Watch for:
   - ✅ **Good**: "Network Error" → Auth error → Working!
   - ❌ **Bad**: "Network Error" → Check backend URL

---

## Part 7: Troubleshooting

### Issue: "Network Error" on Buy Button
**Causes & Solutions:**

| Error | Cause | Solution |
|-------|-------|----------|
| CORS error in console | Frontend/backend URLs mismatch | Check BACKEND_URL in js/*.js files |
| 404 on `/api/number/buy` | Wrong endpoint | Verify endpoint has `/api` prefix |
| 401 Unauthorized | Missing Firebase auth token | User needs to be logged in first |
| 403 Forbidden | User not found in Firebase | User profile needs to be created |
| Wallet balance error | Insufficient funds | User needs to fund wallet via Paystack |

### Issue: Backend on Render Not Starting
**Check Logs:**
1. Go to Render dashboard
2. Click your service
3. Click **Logs** tab
4. Look for error messages
5. Common issues:
   - Missing environment variables → Add to Render
   - Port already in use → Render handles this automatically
   - Module not found → Run `npm install` locally, push to GitHub

### Issue: Environment Variables Not Available
```bash
# Make sure each variable is set in Render dashboard
# Variables are NOT inherited from .env
# You must add them explicitly in Render
```

---

## Part 8: Local Development

### Setup Local Backend
```bash
# 1. Copy .env.example to .env
cp .env.example .env

# 2. Edit .env with your test API keys
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
FIVESIM_API_KEY=test_key

# 3. Install dependencies
npm install

# 4. Start server
npm run dev  # or: npm start
# Server runs on http://localhost:3000
```

### Setup Local Frontend
Update frontend files to use localhost:
```javascript
// In: js/buy-number.js, js/dashboard.js, etc.
const BACKEND_URL = 'http://localhost:3000'  // ← Local dev
```

Or use the fallback - if BACKEND_URL is empty, it uses relative paths:
```javascript
// js/utils.js will use: http://localhost:3000/api/number/buy
```

### Run Local Frontend
```bash
# Simple approach: Use VS Code Live Server
# Or: Use Python
python -m http.server 5000

# Then open: http://localhost:5000/buy-number.html
```

---

## Part 9: Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] No real API keys in `.env.example`
- [ ] `.env` file is NOT committed to GitHub
- [ ] Render environment variables are set (not copied from .env)
- [ ] CORS allows only trusted domains (optional: restrict from '*')
- [ ] Secret keys (Paystack, 5SIM) are never logged
- [ ] Authentication tokens are validated on backend
- [ ] Rate limiting is enabled (100 requests/min on `/api/`)

---

## Part 10: Monitoring & Maintenance

### View Backend Logs
```bash
# Render provides real-time logs in dashboard
# Or watch: tail -f logs/server.log
```

### Check Health Endpoint
```bash
# Should always respond with status
curl https://smshub-ftgg.onrender.com/health
```

### Monitor Payment Processing
```bash
# Check Paystack webhook deliveries
# https://dashboard.paystack.com/settings/webhooks
```

---

## Summary of Changes

| File | Change | Why |
|------|--------|-----|
| `js/utils.js` | Updated apiCall() to use BACKEND_URL | Fix production API calls |
| `js/buy-number.js` | Added BACKEND_URL constant | Point frontend to backend |
| `js/dashboard.js` | Added BACKEND_URL constant | Consistent configuration |
| `js/transactions.js` | Added BACKEND_URL constant | Consistent configuration |
| `js/usa-numbers.js` | Added BACKEND_URL constant | Consistent configuration |
| `.env.example` | Added comments & SERVER_URL | Better documentation |
| `package.json` | Already has `"start": "node server.js"` | ✅ Ready for Render |
| `server.js` | CORS already configured | ✅ Ready to accept frontend calls |

---

## Next Steps

1. **Test locally** - Verify backend and frontend work together
2. **Setup Render** - Create new Web Service
3. **Add env vars** - Set all required variables in Render
4. **Deploy** - Push code to GitHub, Render auto-deploys
5. **Test production** - Verify frontend can call backend on Render
6. **Update frontend URL** - If hosted separately, update BACKEND_URL
7. **Monitor** - Check logs for errors, monitor transactions

🎉 **You're ready to deploy!**
