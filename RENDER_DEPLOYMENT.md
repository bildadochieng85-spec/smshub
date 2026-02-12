# Render Deployment Guide for PrimeSMSHub

This guide explains how to deploy the PrimeSMSHub backend server on Render as a Node.js Web Service.

## Prerequisites

- A Render account (https://render.com)
- A GitHub repository with the PrimeSMSHub code
- Environment variables configured (see below)

## Step 1: Create a New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** and select **"Web Service"**
3. Connect your GitHub repository
4. Fill in the service details:
   - **Name**: `smshub-prime` (or your preferred name)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`

## Step 2: Configure Environment Variables

Add the following environment variables in Render's Environment section:

### Required Environment Variables

```
PORT=3000
NODE_ENV=production
PRIME_API_KEY=<your-secure-api-key>
FIVESIM_API_KEY=<your-5sim-api-key>
```

### Optional Environment Variables

```
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
PAYSTACK_PUBLIC_KEY=<your-paystack-public-key>
PAYSTACK_SECRET_KEY=<your-paystack-secret-key>
FIREBASE_PROJECT_ID=<your-firebase-project-id>
FIREBASE_PRIVATE_KEY=<your-firebase-private-key>
FIREBASE_CLIENT_EMAIL=<your-firebase-client-email>
UPSTASH_REDIS_REST_URL=<your-redis-url>
UPSTASH_REDIS_REST_TOKEN=<your-redis-token>
DEFAULT_CHAT_ID=<your-telegram-chat-id>
SERVER_URL=https://your-render-service-url.onrender.com
```

## Step 3: Deploy

1. Click **"Create Web Service"**
2. Render will automatically build and deploy your application
3. Once deployment is complete, your service URL will be displayed (e.g., `https://smshub-prime.onrender.com`)

## Step 4: Verify Deployment

Test the health check endpoint to verify your server is running:

```bash
curl https://your-render-service-url.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-02-12T10:30:00.000Z"
}
```

## API Endpoints

### Public Endpoints (Require API Key in Header)

All `/api/*` endpoints require the `x-api-key` header:

```bash
curl -H "x-api-key: YOUR_PRIME_API_KEY" https://your-server/api/balance
```

#### Available API Routes:

- **GET** `/health` - Health check (no auth required)
- **POST** `/api/sms/send` - Send SMS via virtual number
  - Body: `{ country: "US", service: "google" }`
- **GET** `/api/balance` - Get account balance
- **GET** `/api/sms/logs` - Get SMS logs

### User-Authenticated Endpoints (Firebase Token)

These endpoints require Firebase authentication:

- **POST** `/api/number/buy` - Purchase a virtual number
- **GET** `/api/number/sms/:orderId` - Get SMS for an order
- **POST** `/api/number/cancel/:orderId` - Cancel an order
- **POST** `/api/number/finish/:orderId` - Mark order as complete
- **GET** `/api/dashboard` - Get user dashboard/wallet info
- **GET** `/api/transactions` - Get transaction history
- **POST** `/api/funds/add` - Add funds via Paystack
- **POST** `/api/funds/verify` - Verify payment

## Security Considerations

### API Key Management

1. **Generate a strong API key** (minimum 32 characters)
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Keep your API key secret** - Never commit it to version control
3. **Use environment variables** - Always store secrets in Render environment variables, not in code

### CORS

The server allows requests from all origins (`Access-Control-Allow-Origin: *`). For production, consider restricting this to specific domains:

```javascript
// In server.js, modify the CORS middleware:
res.header('Access-Control-Allow-Origin', 'https://yourdomain.com')
```

## Monitoring & Logs

1. View service logs in Render dashboard
2. Monitor CPU, memory usage from the dashboard
3. Set up alerts for service failures

## Troubleshooting

### Service Not Starting

Check logs in the Render dashboard for errors. Common issues:

- **PRIME_API_KEY not set**: Ensure environment variable is configured
- **FIVESIM_API_KEY not set**: The service will warn but continue to run
- **Firebase not initialized**: The service will work without Firebase, but some features will be disabled

### High Memory Usage

- Check for memory leaks in logs
- Consider increasing instance size in Render dashboard
- Review connection pooling settings for external APIs

### Timeout Issues

If requests timeout:
- Increase the timeout in API client calls
- Check your API provider's rate limits
- Consider upgrading your Render plan for better CPU

## Auto-Deploy from Git

Render automatically redeploys when you push to your Git repository:

1. Make changes locally
2. Commit and push to GitHub
3. Render will automatically rebuild and deploy within 1-2 minutes

To disable auto-deploy:
- Go to service settings
- Disable "Auto-Deploy"
- Manually deploy using the "Deploy" button

## Database Backups

If using Firebase or Redis:
- **Firebase**: Automatically backed up by Google Cloud
- **Redis (Upstash)**: Configure backups in Upstash dashboard

## Scaling

For production use with high traffic:

1. Upgrade from Free to Paid instance in Render
2. Enable "Scale 0" auto-shutdown for inactive periods
3. Monitor metrics and upgrade instance size as needed
4. Consider implementing database caching with Redis

## Example: Using the API from VS Code Extension

```javascript
const apiKey = process.env.PRIME_API_KEY;
const serverUrl = 'https://your-render-service-url.onrender.com';

// Check balance
const balanceResponse = await fetch(`${serverUrl}/api/balance`, {
  method: 'GET',
  headers: {
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  }
});

const balance = await balanceResponse.json();
console.log('Current balance:', balance.balance);

// Send SMS
const smsResponse = await fetch(`${serverUrl}/api/sms/send`, {
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    country: 'US',
    service: 'google'
  })
});

const result = await smsResponse.json();
console.log('Phone number:', result.phoneNumber);
```

## Support

For issues with:
- **Render**: Check [Render Documentation](https://render.com/docs)
- **PrimeSMSHub**: Review the main README.md
- **5sim API**: Visit [5sim Documentation](https://5sim.net/api)

---

**Last Updated**: February 2024
