# Quick Deployment Checklist - Render

## Pre-Deployment (Local Testing)

### ✅ Step 1: Test Locally (5 minutes)
```bash
# 1. Copy environment file
cp .env.example .env

# 2. Fill in test API keys
# Edit .env and add real test keys from:
# - Paystack: https://dashboard.paystack.com (use test keys)
# - 5SIM: https://5sim.net/api
# - Firebase: (optional, can use mock)

# 3. Install & run
npm install
npm run dev

# Should see:
# ✅ Firebase initialization
# ✅ Server listening on port 3000
```

### ✅ Step 2: Test Frontend Locally
```bash
# Option A: VS Code Live Server
# Right-click buy-number.html → "Open with Live Server"

# Option B: Python HTTP Server
cd d:\Refrence\ areas\smshub
python -m http.server 5000

# Open: http://localhost:5000/buy-number.html
```

### ✅ Step 3: Verify Connection
```javascript
// Open browser DevTools (F12)
// In Console, run:
const test = await apiCall('/number/buy', {
  method: 'POST',
  body: JSON.stringify({ country: 'US', service: 'google' })
});
console.log(test);

// Expected: 
// - If error about wallet or auth → Good! (backend responding)
// - If "Network error" → Bad! (backend not responding, check BACKEND_URL)
```

---

## Production Deployment (Render)

### ✅ Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Fix CORS and frontend-backend integration for production"
git push origin main

# Local files to NOT commit:
# - .env (should be in .gitignore) ✅
# - node_modules/ (should be in .gitignore) ✅
```

### ✅ Step 2: Create Render Service
1. Go to **https://dashboard.render.com**
2. Click **New +** → **Web Service**
3. Select your repository
4. Configure:
   - **Name**: `smshub` (or your choice)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free or Starter
5. Click **Create Web Service** → Wait for deployment

### ✅ Step 3: Add Environment Variables
After deployment starts:
1. Go to your service dashboard
2. Click **Environment** tab
3. Click **Add Environment Variable**
4. Add each variable (one at a time):

```
Key: PAYSTACK_SECRET_KEY
Value: sk_live_your_actual_key_here

Key: PAYSTACK_PUBLIC_KEY  
Value: pk_live_your_actual_key_here

Key: FIVESIM_API_KEY
Value: your_5sim_key_here

Key: SERVER_URL
Value: https://[your-service-name].onrender.com

Key: NODE_ENV
Value: production
```

> 🎯 **Get your URL**: `https://[your-service-name].onrender.com`
> (visible at top of Render dashboard)

### ✅ Step 4: Update Frontend URLs
Once you have your Render URL (e.g., `https://smshub-abcd.onrender.com`):

**Update each file:**
- `js/buy-number.js`
- `js/dashboard.js`
- `js/transactions.js`
- `js/usa-numbers.js`

Change:
```javascript
const BACKEND_URL = 'https://smshub-ftgg.onrender.com'
```

To:
```javascript
const BACKEND_URL = 'https://YOUR-RENDER-URL.onrender.com'
```

### ✅ Step 5: Deploy Frontend
If hosting frontend separately (Netlify, Vercel, GitHub Pages):
1. Update BACKEND_URL in code
2. Deploy frontend repo
3. Verify it can reach your backend

If frontend is in same repo as backend:
1. Update BACKEND_URL
2. Commit & push
3. Render auto-redeploys

### ✅ Step 6: Test Production
```bash
# Test backend is running
curl https://YOUR-RENDER-URL.onrender.com/paystack-public-key
# Expected: {"publicKey":"pk_live_..."}

# Test frontend can reach backend
# Open your frontend (Netlify, Vercel, or Render)
# Try buying a number
# Should either work or show auth error (not network error!)
```

---

## Quick Troubleshooting

### ❌ "Network Error" on Buy Button
**Cause**: Frontend can't reach backend
**Fix**: Check Render logs
```bash
# 1. Render Dashboard → Your Service → Logs
# 2. Look for errors
# 3. Most common:
#    - PAYSTACK_SECRET_KEY not set → Add to Environment
#    - FIVESIM_API_KEY not set → Add to Environment
#    - Wrong BACKEND_URL in frontend code
```

### ❌ Build Failed on Render
**Cause**: npm dependencies issue
**Fix**:
```bash
# Local test:
rm -rf node_modules package-lock.json
npm install
npm start

# If works locally, push to GitHub
# Render will auto-redeploy
```

### ❌ Environment Variables Not Working
**Remember**: Environment variables in Render are NOT from .env
- Delete .env from local machine (or at least don't commit)
- Add each variable explicitly in Render dashboard
- Changes take effect after Service restart

### ❌ Frontend Shows Different Backend URL
**Fix**: Make sure you updated ALL 4 files:
```bash
grep -r "BACKEND_URL" js/
# Should show 4 files with same URL
```

---

## File Checklist

### Files Changed (✅ Done)
- [x] `js/utils.js` - Updated apiCall() function
- [x] `js/buy-number.js` - Added BACKEND_URL
- [x] `js/dashboard.js` - Added BACKEND_URL
- [x] `js/transactions.js` - Added BACKEND_URL
- [x] `js/usa-numbers.js` - Added BACKEND_URL
- [x] `.env.example` - Added documentation
- [x] `package.json` - Already correct
- [x] `server.js` - Already correct, no changes needed

### Files Created (✅ Done)
- [x] `PRODUCTION_DEPLOYMENT.md` - Full deployment guide
- [x] `CODE_REFERENCE.md` - Code examples
- [x] `RENDER_QUICK_START.md` - This file

---

## Environment Variables Needed

### Render Dashboard - Add These

```
PAYSTACK_SECRET_KEY      = sk_live_...  (from Paystack dashboard)
PAYSTACK_PUBLIC_KEY      = pk_live_...  (from Paystack dashboard)
FIVESIM_API_KEY          = ...          (from 5SIM website)
TELEGRAM_BOT_TOKEN       = ...          (optional, from @BotFather)
DEFAULT_CHAT_ID          = 7711425125   (keep as is)
FIREBASE_PROJECT_ID      = ...          (optional, from Firebase)
FIREBASE_PRIVATE_KEY     = ...          (optional, from Firebase)
FIREBASE_CLIENT_EMAIL    = ...          (optional, from Firebase)
UPSTASH_REDIS_REST_URL   = ...          (optional, from Upstash)
UPSTASH_REDIS_REST_TOKEN = ...          (optional, from Upstash)
SERVER_URL               = https://YOUR-RENDER-URL.onrender.com
NODE_ENV                 = production
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │ buy-number.html (Frontend)                       │   │
│  │ - Gets BACKEND_URL = 'https://...onrender.com'  │   │
│  │ - Calls apiCall('/number/buy', {...})           │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS Request
                       │ POST /api/number/buy
                       ▼
┌──────────────────────────────────────────────────────────┐
│              RENDER.COM (Production)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  YOUR-RENDER-URL.onrender.com:443               │   │
│  │  ┌────────────────────────────────────────────┐ │   │
│  │  │ server.js (Express Backend)                │ │   │
│  │  │ ┌──────────────────────────────────────┐  │ │   │
│  │  │ │ CORS Middleware ✅                   │  │ │   │
│  │  │ │ - Allows all origins                 │  │ │   │
│  │  │ │ - Handles OPTIONS requests           │  │ │   │
│  │  │ └──────────────────────────────────────┘  │ │   │
│  │  │ ┌──────────────────────────────────────┐  │ │   │
│  │  │ │ Route: POST /api/number/buy ✅       │  │ │   │
│  │  │ │ - Validates user & wallet             │  │ │   │
│  │  │ │ - Calls 5SIM API                      │  │ │   │
│  │  │ │ - Saves to Firebase                   │  │ │   │
│  │  │ │ - Returns: {success, orderId, ...}   │  │ │   │
│  │  │ └──────────────────────────────────────┘  │ │   │
│  │  │ ┌──────────────────────────────────────┐  │ │   │
│  │  │ │ Environment Variables ✅              │  │ │   │
│  │  │ │ - PAYSTACK_SECRET_KEY                │  │ │   │
│  │  │ │ - FIVESIM_API_KEY                    │  │ │   │
│  │  │ │ - FIREBASE_*                         │  │ │   │
│  │  │ │ - All configured in Render dashboard │  │ │   │
│  │  │ └──────────────────────────────────────┘  │ │   │
│  │  └────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ External APIs (called by backend)                │   │
│  │ - 5SIM: Get virtual phone numbers               │   │
│  │ - Firebase: Store orders & user data            │   │
│  │ - Paystack: Payment processing                  │   │
│  │ - Telegram: Notifications (optional)            │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
                       ▲
                       │ HTTPS Response
                       │ {success, orderId, phoneNumber}
                       │
┌──────────────────────┴──────────────────────────────────┐
│                    USER'S BROWSER                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │ buy-number.html (Frontend) receives response     │   │
│  │ Shows: "Number purchased: +1234567890"          │   │
│  │ Starts polling: GET /api/number/sms/{orderId}   │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## Success Indicators ✅

After deployment, you should see:

1. **Backend Logs (Render Dashboard)**
   ```
   ✅ Server ready for requests!
   ✅ Paystack: ✅ Configured
   ✅ 5sim: ✅ Configured
   ```

2. **Frontend in Browser**
   - Buy Number page loads
   - Country/Service dropdowns work
   - Network tab shows requests to YOUR-RENDER-URL
   - Purchase button shows success or auth error (not "Network Error")

3. **Test in Console**
   ```javascript
   console.log('Backend URL:', BACKEND_URL)
   // Output: Backend URL: https://YOUR-RENDER-URL.onrender.com
   ```

---

## Next Actions

1. **Local Test**: Run `npm run dev` locally to verify everything works
2. **Push Code**: Commit changes and push to GitHub
3. **Create Render Service**: Follow Step 2 above
4. **Add Env Vars**: Copy variables from .env to Render dashboard
5. **Deploy Frontend**: Update BACKEND_URL and deploy
6. **Test Integration**: Try buying a number from deployed frontend
7. **Monitor Logs**: Watch Render logs for any errors

---

## Support

**If something breaks:**
1. Check Render logs: Dashboard → Service → Logs
2. Check browser console: F12 → Console tab
3. Check network requests: F12 → Network tab
4. Verify env vars are set in Render (not from .env file)
5. Make sure all 4 JS files have BACKEND_URL defined

---

**You're ready to deploy! 🚀**
