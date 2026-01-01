# Running the Telegram Bot Server (local development)

## Prerequisites
- Node.js 18+ and npm installed
- A Telegram bot token (from @BotFather) — keep this secret

## Setup
1. In project root, create a `.env` file with your token (do NOT commit this file and rotate the token if you've already pasted it in public):

```
TELEGRAM_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
# Optional: if you want the UI to always send to a specific chat id, set DEFAULT_CHAT_ID
# DEFAULT_CHAT_ID=123456789
```

**Security note:** If you shared your token publicly (for example in chat or on GitHub), revoke it and generate a new one using @BotFather immediately. For quick testing I added your token and chat id as fallbacks in `server.js` — **remove these hardcoded values and use a `.env` file** for anything beyond short local testing. To rotate a token, open a chat with @BotFather, select your bot, and use the API Token / Revoke or /token flow to generate a new token.
2. Install dependencies:

```
npm install
```

## Run
- Development
```
npm run dev
```
- Production
```
npm start
```

Server will serve the web UI at `http://localhost:3000` and will connect to Telegram using long polling.

## How it works
- When someone messages your Telegram bot, the bot receives it and the server emits `tg_message` via Socket.IO to connected web clients.
- In the web UI, click the Chat button to open the widget. Incoming messages auto-fill the `Chat ID` box so you can reply.
- To reply, type your message and click Send — the server relays it using the Telegram Bot API.

Note: the chat id is not shown in the UI. Per your request, the UI no longer prompts for or accepts a chat id — the chat id must be provided in code or on the server.

How to configure the chat id:
- Server-side (configured in code per your request): the chat id is hardcoded in `server.js` (look for `DEFAULT_CHAT_ID = 7711425125`). This will be emitted to clients and they will send automatically. **Warning**: hardcoding IDs in code is less secure—do not commit sensitive values.
- Client-side (less secure): alternatively set `const DEFAULT_CHAT_ID = 123456789;` at the top of `script.js` to hardcode the id into the client.

If neither is set, sending is blocked and the UI will show a status: "No chat configured — sending disabled".

Direct send endpoint
- The web UI now uses a direct HTTP endpoint at `POST /api/send` to deliver messages. This works even if the Socket.IO connection is not available (useful when you open the HTML via Live Server or similar).

CORS & Live Server notes
- If you open `index.html` via a separate Live Server (e.g., `127.0.0.1:5500`), the client will try to connect to the Node server at `http://localhost:3000` as a fallback and will also call the HTTP endpoints there. Ensure the Node server is running and reachable at that address.

## Security
- **Do not commit** your `.env` or token to source control.
- This is a minimal demo for local development only. For production, add authentication and SSL/TLS.
