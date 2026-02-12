# Quick Start Checklist - PrimeSMSHub VS Code Extension

Use this checklist to get up and running in minutes.

## ✅ Pre-Setup (Backend)

- [ ] Render service is deployed with backend
- [ ] `PRIME_API_KEY` is set in Render environment variables
- [ ] `GET /health` endpoint returns `{ status: "ok" }`
- [ ] You have the exact API key value from Render

## ✅ Step 1: Get API Key (2 minutes)

1. [ ] Go to [Render Dashboard](https://dashboard.render.com)
2. [ ] Click on your deployed service
3. [ ] Go to "Environment" tab
4. [ ] Find `PRIME_API_KEY` variable
5. [ ] Copy the value (don't share it!)
6. [ ] Save it somewhere secure

**Expected format**: Random string of 32+ characters
```
Example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

## ✅ Step 2: Clone/Download Extension (2 minutes)

- [ ] Navigate to the `extension/` directory in your PrimeSMSHub project
- [ ] Or clone the repository to your machine
- [ ] Open the `extension` folder in VS Code

## ✅ Step 3: Configure VS Code (3 minutes)

1. [ ] Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
2. [ ] Search for `primesmshub`
3. [ ] Fill in these settings:

| Setting | Value |
|---------|-------|
| **API Key** | Your copied `PRIME_API_KEY` value |
| **Server URL** | `https://your-app.onrender.com/api` |
| **Log Requests** | `false` (or `true` for debugging) |

✅ **Settings should look like:**
```json
{
  "primesmshub.apiKey": "a1b2c3d4e5f6g7h8...",
  "primesmshub.serverUrl": "https://smshub-prime.onrender.com/api",
  "primesmshub.logRequests": false
}
```

## ✅ Step 4: Test Backend API (2 minutes)

**Test 1: Health Check** (no auth needed)
```bash
curl https://your-app-name.onrender.com/health
```
✅ Should return: `{ "status": "ok", "timestamp": "..." }`

**Test 2: Check Balance** (auth required)
```bash
export PRIME_API_KEY="your-api-key"
export SERVER_URL="https://your-app.onrender.com/api"

node extension/test-api.js balance
```
✅ Should show your balance

**Test 3: Get Virtual Number**
```bash
node extension/test-api.js send US google
```
✅ Should return a phone number +1234567890

## ✅ Step 5: Launch Extension (1 minute)

**Development Mode:**
1. [ ] Open `extension` folder in VS Code
2. [ ] Press `F5` to start debug mode
3. [ ] A new VS Code window opens
4. [ ] Look for "Prime SMS Hub" icon on left sidebar
5. [ ] Click it to open the sidebar

**Installation Mode:**
1. [ ] Run `vsce package` to create .vsix file
2. [ ] Go to Extensions (Ctrl+Shift+X)
3. [ ] Click "Install from VSIX"
4. [ ] Select the `.vsix` file
5. [ ] Reload VS Code

## ✅ Step 6: Test Sidebar (2 minutes)

1. [ ] Click "Prime SMS Hub" icon on left sidebar
2. [ ] Verify status badge is **green** (connected)
3. [ ] Select "US" as country
4. [ ] Select "Google" as service
5. [ ] Click "Send SMS / Get Number" button
6. [ ] ✅ Should show virtual phone number
7. [ ] Click "Check Balance" button
8. [ ] ✅ Should show your account balance

## ✅ Troubleshooting Quick Fixes

### Sidebar shows "API not configured"
```bash
# Fix: Set your API key
Open Settings (Ctrl+,) → primesmshub.apiKey → Paste your key
```

### "Connection Error"
```bash
# Fix 1: Verify server URL
Settings → primesmshub.serverUrl → Check it's correct

# Fix 2: Test health endpoint
curl https://your-app.onrender.com/health

# Fix 3: Check internet connection
ping google.com
```

### "Invalid API key" error
```bash
# Fix: Copy API key again from Render, check for spaces
Settings → primesmshub.apiKey → Paste fresh copy
```

### Sidebar doesn't appear
```bash
# Fix: Reload VS Code
Ctrl+R or Cmd+R
```

## ✅ Success Indicators

You'll know everything works when you see:

✅ Status badge is **green** in sidebar
✅ "Send SMS" returns a phone number like `+1234567890`
✅ "Check Balance" shows your balance like `$45.67`
✅ Messages appear in green (success) or red (error)
✅ Activity log shows recent actions

## ✅ Next Steps

### If everything works:
- [ ] Share the `.vsix` file with your team
- [ ] Publish to VS Code Marketplace (optional)
- [ ] Add custom countries/services to dropdown
- [ ] Integrate with dashboard

### If something fails:
- [ ] Check **Troubleshooting Quick Fixes** above
- [ ] Read [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed help
- [ ] Enable `primesmshub.logRequests: true` to see API calls
- [ ] Check browser console (Ctrl+Shift+I) for errors

## 📚 Documentation

| Document | For |
|----------|-----|
| [README.md](README.md) | Quick overview & features |
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Detailed setup & API reference |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Technical details & architecture |

## 🔐 Security Reminders

✅ **Do:**
- [ ] Store API key in VS Code settings (encrypted)
- [ ] Use HTTPS URLs
- [ ] Keep API key secret

❌ **Don't:**
- [ ] Share your API key in messages
- [ ] Commit settings.json to Git
- [ ] Hardcode credentials in code

## 📝 Common Commands

```bash
# Test API without extension
node extension/test-api.js health
node extension/test-api.js balance
node extension/test-api.js send US google

# Run quick examples
node extension/examples.js

# Package extension for distribution
vsce package

# Debug mode (in extension folder)
code .  # then press F5
```

## ⏱️ Expected Time

- **Setup**: 10-15 minutes
- **Testing**: 5 minutes
- **Total**: ~20 minutes to working extension

## 🎯 What You've Built

✨ A secure VS Code extension that:
- Connects to your PrimeSMSHub backend API
- Gets virtual phone numbers for SMS verification
- Checks account balance and rating
- Works offline-first with error handling
- Fully respects VS Code theme and settings
- Never exposes your 5sim credentials

🚀 Ready for development, testing, and distribution!

---

**Need help?** See [SETUP_GUIDE.md](SETUP_GUIDE.md)

**Want details?** See [IMPLEMENTATION.md](IMPLEMENTATION.md)

**Have bugs?** Enable logging and check console (Ctrl+Shift+I)
