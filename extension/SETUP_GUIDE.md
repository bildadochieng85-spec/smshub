# VS Code Extension Setup & API Testing Guide

This guide explains how to set up the Prime SMS Hub VS Code extension and test the API.

## Extension Installation

### Option 1: Install from VSIX file (For Distribution)

1. Build the VSIX package:
   ```bash
   npm install -g @vscode/vsce
   cd extension
   vsce package
   ```

2. Install in VS Code:
   - Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
   - Click "Install from VSIX..."
   - Select the generated `.vsix` file

### Option 2: Development Setup

1. Open VS Code
2. Clone the repository
3. Open the `extension` folder in VS Code
4. Press `F5` to launch the extension in debug mode
5. The sidebar should appear on the left activity bar

## Configuration

### Step 1: Get Your API Key

The API key is the internal `PRIME_API_KEY` from your Render deployment environment.

**To set it up:**

1. Go to your Render service dashboard
2. Find the `PRIME_API_KEY` environment variable
3. Copy the value securely

### Step 2: Configure VS Code Settings

1. Press `Ctrl+,` (or `Cmd+,` on Mac) to open Settings
2. Search for `primesmshub`
3. Set the following properties:

| Setting | Value | Required |
|---------|-------|----------|
| `primesmshub.apiKey` | Your internal API key | ✅ Yes |
| `primesmshub.serverUrl` | `https://your-app.onrender.com/api` | ✅ Yes |
| `primesmshub.logRequests` | `true` or `false` | No |

**Settings JSON (for settings.json):**
```json
{
  "primesmshub.apiKey": "your-internal-api-key-here",
  "primesmshub.serverUrl": "https://smshub-prime.onrender.com/api",
  "primesmshub.logRequests": true
}
```

⚠️ **Security**: Never commit your API key to version control!

### Step 3: Verify Configuration

1. Open the Prime SMS Hub sidebar (click the icon on the left activity bar)
2. You should see the status badge turn green (connected)
3. If you see an error, check:
   - API key is set correctly
   - Server URL is correct and accessible
   - Your internet connection is working

## Using the Extension

### Send SMS

1. **Select Country**: Choose destination country from dropdown
2. **Select Service**: Choose which service to buy a number for (Google, WhatsApp, Telegram, etc.)
3. **Click "Send SMS"**: The extension will:
   - Call `POST /api/sms/send` with country and service
   - Display the purchased virtual phone number
   - Show the SMS code when it arrives
   - Display pricing and expiration time

### Check Balance

1. **Click "Check Balance"**: The extension will:
   - Call `GET /api/balance`
   - Display your current account balance
   - Show account rating if available
   - Update the activity log

## API Testing

### Test 1: Check Server Health

```bash
curl https://your-app-name.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-02-12T10:30:00.000Z"
}
```

### Test 2: Check Balance (with API Key)

```bash
curl -H "x-api-key: YOUR_PRIME_API_KEY" \
  https://your-app-name.onrender.com/api/balance
```

Example response:
```json
{
  "success": true,
  "balance": 45.67,
  "frozen": 0,
  "rating": 4.8
}
```

### Test 3: Send SMS / Get Virtual Number

```bash
curl -X POST \
  -H "x-api-key: YOUR_PRIME_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "service": "google"
  }' \
  https://your-app-name.onrender.com/api/sms/send
```

Example response:
```json
{
  "success": true,
  "phoneNumber": "+1234567890",
  "orderId": 123456789,
  "service": "google",
  "country": "US",
  "price": 1.50,
  "expiresAt": "2024-02-12T11:00:00.000Z"
}
```

### Test 4: Get SMS Logs

```bash
curl -H "x-api-key: YOUR_PRIME_API_KEY" \
  https://your-app-name.onrender.com/api/sms/logs
```

Example response:
```json
{
  "success": true,
  "logs": [],
  "total": 0,
  "message": "SMS logs endpoint ready for integration"
}
```

## Supported Services

The extension supports the following services:

| Service | Code | Notes |
|---------|------|-------|
| Google | `google` | For Google Account OTP |
| WhatsApp | `whatsapp` | For WhatsApp verification |
| Telegram | `telegram` | For Telegram registration |
| Facebook | `facebook` | For Facebook signup |
| Twitter | `twitter` | For Twitter signup |
| Instagram | `instagram` | For Instagram verification |
| Uber | `uber` | For Uber account |
| Amazon | `amazon` | For Amazon account |

## Supported Countries

| Country | Code |
|---------|------|
| United States | `US` |
| United Kingdom | `UK` |
| Nigeria | `NG` |
| India | `IN` |
| France | `FR` |
| Germany | `DE` |
| Canada | `CA` |
| Australia | `AU` |

**Note**: More countries can be added in `webview/sidebar.html` by extending the country dropdown.

## Troubleshooting

### "API not configured" Error

**Cause**: API key is not set or empty in VS Code settings

**Solution**:
1. Open VS Code Settings (Ctrl+,)
2. Search for `primesmshub`
3. Enter your API key in `primesmshub.apiKey`

### Connection Error

**Cause**: Server URL is incorrect or server is unreachable

**Solution**:
1. Verify the server URL is correct: `https://your-app.onrender.com/api`
2. Check that your Render service is running
3. Test the health endpoint: `curl https://your-app.onrender.com/health`

### "Invalid API key" Error

**Cause**: The API key doesn't match the backend's `PRIME_API_KEY`

**Solution**:
1. Confirm the API key in VS Code settings matches Render environment variable
2. Check for extra spaces or hidden characters
3. Ask your backend admin to verify the key

### Network Timeout

**Cause**: Server is slow or overloaded

**Solution**:
1. Wait a few seconds and try again
2. Check if Render service is spinning down (free tier)
3. Upgrade your Render plan for better performance

## Advanced: Enable Request Logging

To debug API calls, enable logging:

1. Open VS Code Settings
2. Set `primesmshub.logRequests` to `true`
3. Open Developer Tools (Ctrl+Shift+I)
4. Go to Console tab
5. You'll see all API requests and responses logged

Example log output:
```
[PrimeSMSHub API] POST /sms/send 
  url: https://smshub-prime.onrender.com/api/sms/send
  body: {"country":"US","service":"google"}

[PrimeSMSHub API] Response from /sms/send 
  status: 200
  data: {success: true, phoneNumber: "+1234567890", ...}
```

## File Structure

```
extension/
├── package.json              # Extension manifest
├── extension.js              # Main extension file (activation)
├── api-client.js             # API client class (Node.js version)
├── webview/
│   └── sidebar.html          # Sidebar UI & webview script
└── resources/
    ├── icon.svg              # Sidebar icon
    └── logo.png              # Extension logo
```

## Development

### Running in Debug Mode

1. Open `extension` folder in VS Code
2. Press `F5` to launch debug version
3. A new VS Code window will open with the extension loaded
4. Make changes to files and reload (`Ctrl+R`)

### Building for Release

```bash
# Install tools
npm install -g @vscode/vsce

# Build VSIX package
cd extension
vsce package

# This creates a .vsix file that can be distributed
```

## Extension API Reference

### Configuration Keys

- `primesmshub.apiKey` (string): Internal API key for authentication
- `primesmshub.serverUrl` (string): Base URL of the PrimeSMSHub API
- `primesmshub.logRequests` (boolean): Enable detailed logging

### Commands

- `primesmshub.refreshBalance`: Refresh balance in sidebar
- `primesmshub.openSettings`: Open extension settings

### Webview Messages

**From Webview → Extension:**
- `{ type: 'get-config' }`: Request API configuration
- `{ type: 'open-settings' }`: Open VS Code settings
- `{ type: 'log', message: '...' }`: Log message

**From Extension → Webview:**
- `{ type: 'api-config', baseUrl, apiKey, isConfigured, logRequests }`
- `{ type: 'refresh-balance' }`: Refresh balance display

## Security Notes

1. ✅ API key is stored in VS Code settings (encrypted by VS Code)
2. ✅ 5sim credentials are never exposed or stored in extension
3. ✅ All API calls use HTTPS
4. ✅ Internal API key (`x-api-key` header) is separated from 5sim credentials
5. ❌ Never hardcode API keys in source code
6. ❌ Never commit settings.json with API keys to version control

## Support & Issues

For issues or feature requests:
1. Check the troubleshooting section above
2. Review the backend error messages
3. Enable `primesmshub.logRequests` for detailed logs
4. Create an issue in the GitHub repository

---

**Last Updated**: February 2024
