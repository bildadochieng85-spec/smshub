# Prime SMS Hub - VS Code Extension

A lightweight VS Code extension that integrates with your PrimeSMSHub backend API to send SMS messages and check account balance directly from the editor.

## Features

✨ **Easy SMS Sending** - Get virtual numbers for SMS verification in seconds
💳 **Check Balance** - View your 5sim account balance without leaving VS Code  
🔐 **Secure API** - Uses internal API key authentication, never exposes 5sim credentials
⚡ **Fast & Responsive** - Built with vanilla JavaScript, no heavy frameworks
📦 **Lightweight** - Minimal dependencies, quick to load
🎨 **VS Code Native** - Respects your VS Code theme and settings

## Quick Start

### 1. Install the Extension

- Download the `.vsix` file from releases
- Install in VS Code: Extensions → Install from VSIX
- Or clone this repo and press `F5` in debug mode

### 2. Configure API Key

1. Open VS Code Settings (Ctrl+, or Cmd+,)
2. Search for `primesmshub`
3. Set your API key from the Render environment variables:
   ```
   primesmshub.apiKey: "your-internal-api-key"
   primesmshub.serverUrl: "https://your-app.onrender.com/api"
   ```

### 3. Open Sidebar

- Click the Prime SMS Hub icon in the left activity bar
- You'll see the SMS sending interface

### 4. Send SMS

- Select country and service
- Click "Send SMS"
- You'll receive a virtual phone number
- Wait for the SMS code to arrive

## File Structure

```
extension/
├── package.json                  # Extension manifest & config
├── extension.js                  # Main extension code (activation)
├── api-client.js                 # API client for Node.js testing
├── webview/
│   └── sidebar.html              # Sidebar UI (HTML + CSS + JS)
├── test-api.js                   # CLI tool to test the API
├── SETUP_GUIDE.md               # Detailed setup and usage guide
└── resources/
    ├── icon.svg                  # Sidebar icon
    └── logo.png                  # Extension logo
```

## Usage

### In VS Code Sidebar

1. **Send SMS** - Get a virtual number for any service
   - Select country (US, UK, Nigeria, etc.)
   - Select service (Google, WhatsApp, Telegram, etc.)
   - Click "Send SMS"
   - Virtual number appears with expiration time
   
2. **Check Balance** - View account balance
   - Click "Check Balance"
   - See your current 5sim balance and rating

### From Terminal (Test Script)

```bash
# Check server health
node extension/test-api.js health

# Get account balance
export PRIME_API_KEY=your-key
export SERVER_URL=https://your-app.onrender.com/api
node extension/test-api.js balance

# Get virtual number
node extension/test-api.js send US google
node extension/test-api.js send NG whatsapp
```

## Configuration

### VS Code Settings

Add to your `settings.json`:

```json
{
  "primesmshub.apiKey": "your-internal-api-key-here",
  "primesmshub.serverUrl": "https://smshub-prime.onrender.com/api",
  "primesmshub.logRequests": false
}
```

| Setting | Type | Required | Description |
|---------|------|----------|-------------|
| `apiKey` | string | ✅ Yes | Internal API key from Render |
| `serverUrl` | string | ✅ Yes | Backend API base URL |
| `logRequests` | boolean | No | Enable API request logging |

## Security

🔒 **Security Best Practices**

- ✅ API key is stored in VS Code settings (encrypted)
- ✅ 5sim credentials are never exposed or stored
- ✅ All communication uses HTTPS
- ✅ Internal API key is separate from 5sim API key
- ✅ No credentials in source code or version control

❌ **Do Not**

- Don't share your API key
- Don't commit settings.json with API key to Git
- Don't hardcode credentials in extension code

## Development

### Setup

```bash
cd extension
npm install
```

### Debug Mode

1. Open the `extension` folder in VS Code
2. Press `F5` to launch debug version
3. A new VS Code window opens with the extension active
4. Edit files and reload (Ctrl+R) to see changes

### Build for Release

```bash
npm install -g @vscode/vsce
vsce package
```

This creates a `.vsix` file ready for distribution.

## API Reference

### Endpoints

All endpoints require `x-api-key` header with your internal API key.

**POST /api/sms/send**
```bash
curl -X POST \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "service": "google"
  }' \
  https://your-app.onrender.com/api/sms/send
```

Response:
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

**GET /api/balance**
```bash
curl -H "x-api-key: YOUR_KEY" \
  https://your-app.onrender.com/api/balance
```

Response:
```json
{
  "success": true,
  "balance": 45.67,
  "frozen": 0,
  "rating": 4.8
}
```

## Troubleshooting

### "API not configured" Message

- Open Settings (Ctrl+,)
- Search for `primesmshub`
- Enter your API key and server URL
- The sidebar should refresh automatically

### Connection Errors

- Check your internet connection
- Verify the server URL is correct
- Test with: `curl https://your-app.onrender.com/health`
- Make sure the Render service is running

### "Invalid API Key" Error

- Copy the API key exactly from Render environment variables
- Check for extra spaces or hidden characters
- Verify it matches `PRIME_API_KEY` in Render settings

## Supported Countries & Services

### Countries
US, UK, Nigeria, India, France, Germany, Canada, Australia

### Services
Google, WhatsApp, Telegram, Facebook, Twitter, Instagram, Uber, Amazon

More can be added by editing the dropdown in `webview/sidebar.html`.

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:

1. Check the [SETUP_GUIDE.md](SETUP_GUIDE.md) documentation
2. Enable logging: `primesmshub.logRequests: true`
3. Check browser console: Ctrl+Shift+I
4. Review error messages in the sidebar

## Links

- 📖 [Full Setup Guide](SETUP_GUIDE.md)
- 🔧 [Backend Repository](https://github.com/yourusername/primesmshub)
- 🌐 [PrimeSMSHub Website](https://primesmshub.com)
- 📧 [Support Email](mailto:support@primesmshub.com)

---

**Made with ❤️ for VS Code**
