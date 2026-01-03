// Auto send helper for development
// Starts periodic sends when AUTO_SEND=true. Honor DRY_RUN to avoid real sends.

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function nowText() {
  return new Date().toISOString();
}

function shouldEnable() {
  return String(process.env.AUTO_SEND || '').toLowerCase() === 'true';
}

function isDryRun() {
  return String(process.env.DRY_RUN || '').toLowerCase() === 'true';
}

function parseInterval() {
  const v = Number(process.env.AUTO_SEND_INTERVAL_MS || '');
  if (!Number.isFinite(v) || v <= 0) return DEFAULT_INTERVAL_MS;
  return v;
}

async function sendOnce({ bot, chatId }) {
  const text = `[AUTO SEND] dev message at ${nowText()}`;
  if (isDryRun()) {
    console.log('DRY_RUN: would send to', chatId, text);
    return { ok: true, dryRun: true, chatId, text };
  }

  try {
    const res = await bot.sendMessage(Number(chatId), text);
    console.log('Auto-sent message to', chatId, text);
    return { ok: true, result: res };
  } catch (err) {
    console.error('Auto-send failed', err);
    return { ok: false, error: err.toString() };
  }
}

function startAutoSend({ bot, defaultChatId, allowDefaultChat = false }) {
  if (!shouldEnable()) {
    console.log('AUTO_SEND not enabled (set AUTO_SEND=true to enable)');
    return null;
  }

  const chatId = allowDefaultChat ? defaultChatId : null;
  if (!chatId) {
    console.warn('AUTO_SEND requested but no default chat id available or allowDefaultChat is false. Aborting auto-send.');
    return null;
  }

  const interval = parseInterval();
  console.log(`Starting AUTO_SEND (dryRun=${isDryRun()}) to chat ${chatId} every ${interval}ms`);

  // Send one immediately
  sendOnce({ bot, chatId }).catch((err) => console.error('Initial auto-send error', err));

  const handle = setInterval(() => {
    sendOnce({ bot, chatId }).catch((err) => console.error('Scheduled auto-send error', err));
  }, interval);

  return () => clearInterval(handle);
}

module.exports = { startAutoSend, sendOnce };
