const chatModal = document.getElementById('chatModal');
const openChat = document.getElementById('openChat');
const closeChat = document.getElementById('closeChat');
const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatStatus = document.getElementById('chatStatus');

// Optional: hardcode a default chat id here (number) if you want the client to always send to a specific chat.
// Example: const DEFAULT_CHAT_ID = 123456789; (client-side fallback only)
const DEFAULT_CHAT_ID = 7711425125; // set to a number to hardcode (applied automatically)
let currentChatId = null;

// Apply client-side default immediately so sending is enabled without prompting
if (DEFAULT_CHAT_ID) {
  currentChatId = DEFAULT_CHAT_ID;
  setChatStatus(`Client default chat configured (id: ${DEFAULT_CHAT_ID})`);
  console.log('Client DEFAULT_CHAT_ID applied:', DEFAULT_CHAT_ID);
}

// No manual Set/Clear UI - client will rely on server default (if allowed) or client fallback.


// Modal open/close helpers — modal stays closed until user presses the button
function openModal(){
  if (!chatModal) return;
  chatModal.classList.add('open');
  chatModal.style.display = 'flex';
  // focus input for convenience
  setTimeout(()=>{ if (messageInput) messageInput.focus(); }, 100);
}
function closeModal(){
  if (!chatModal) return;
  chatModal.classList.remove('open');
  // keep display none after animation
  setTimeout(()=>{ chatModal.style.display = 'none'; }, 200);
}

// ensure it's closed on load
if (chatModal) { chatModal.classList.remove('open'); chatModal.style.display = 'none'; }

openChat.addEventListener('click', () => { openModal(); });
if (closeChat) closeChat.addEventListener('click', () => { closeModal(); });

function setChatStatus(text) {
  if (chatStatus) chatStatus.textContent = text;
}

function appendMessage(text, cls) {
  // Only append messages that are either sent by web client ('msg-web')
  // or received from Telegram ('msg-telegram'). Route informational
  // messages to the status area so the chat shows only conversation.
  if (cls !== 'msg-web' && cls !== 'msg-telegram') {
    setChatStatus(text);
    return null;
  }

  // Build message element with proper structure for styling and ticks
  const wrapper = document.createElement('div');
  wrapper.className = cls + ' msg-wrapper';
  wrapper.style.marginBottom = '8px';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';

  const bubble = document.createElement('div');
  bubble.className = 'msg ' + (cls === 'msg-web' ? 'msg-web' : 'msg-telegram');
  bubble.textContent = text;

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const time = new Date();
  meta.textContent = time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

  // Add tick for web-sent messages
  if (cls === 'msg-web') {
    const tick = document.createElement('span');
    tick.className = 'tick pending';
    tick.setAttribute('aria-hidden', 'true');
    tick.textContent = '✓';
    meta.appendChild(tick);
  }

  wrapper.appendChild(bubble);
  wrapper.appendChild(meta);

  if (chatBox) {
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
    return wrapper;
  } else {
    console.log(text);
    return wrapper;
  }
}

let socket = null;
function attachSocketLogging(s) {
  s.on('connect', () => setChatStatus('Connected to bot server'));
  s.on('connect_error', (err) => {
    console.error('Socket connect_error', err);
    setChatStatus('Socket connect error: ' + (err && err.message ? err.message : err));
  });
  s.on('connect_timeout', () => setChatStatus('Socket connect timeout'));
  s.on('reconnect_attempt', () => setChatStatus('Socket reconnect attempt'));
  s.on('disconnect', (reason) => setChatStatus('Socket disconnected: ' + reason));
}

if (typeof io !== 'undefined') {
  try {
    // If page is served from the Node server (port 3000), use same-origin connect
    if (location.port === '3000' || location.hostname === 'localhost') {
      socket = io();
      attachSocketLogging(socket);
    } else {
      // Page served from Live Server or different port; try explicit server host immediately
      try {
        socket = io('http://localhost:3000', { transports: ['websocket', 'polling'] });
        setChatStatus('Connecting to socket at http://localhost:3000');
        attachSocketLogging(socket);
      } catch (err) {
        console.warn('Socket.IO explicit connect failed', err);
      }

      // Also try 127.0.0.1 if localhost fails after 1s
      setTimeout(() => {
        if (!socket || !socket.connected) {
          try {
            socket = io('http://127.0.0.1:3000', { transports: ['websocket', 'polling'] });
            setChatStatus('Connecting to socket at http://127.0.0.1:3000 (fallback)');
            attachSocketLogging(socket);
          } catch (err) {
            console.warn('Socket.IO fallback connect failed', err);
            setChatStatus('Live updates unavailable — using HTTP send');
          }
        }
      }, 1000);
    }
  } catch (err) {
    console.warn('Socket.IO default connect error', err);
  }
} else {
  console.warn('Socket.IO client not found');
  setChatStatus('Live updates unavailable — using HTTP send');
} 

if (socket) {
  // connection handled by attachSocketLogging which updates status; avoid posting into chat area
  socket.on('connect', () => { setChatStatus('Connected to bot server'); });

  socket.on('chats_list', (chats) => {
    if (chats && chats.length) {
      setChatStatus('Known chats: ' + chats.map(c => c.chatId).join(', '));
    }
  });

  socket.on('tg_message', (data) => {
    const { chatId, from, text } = data;
    currentChatId = chatId;
    setChatStatus('Chat selected (hidden)');
    appendMessage(`[${chatId}] ${from.first_name || from.username || 'user'}: ${text}`, 'msg-telegram');
  });

  // Server may provide a default chat id (hidden) at connection time.
  // If the server is configured to allow it, automatically select it so no modal entry is required.
  socket.on('default_chat', (id) => {
    if (id) {
      currentChatId = id;
      // Show the chat id in status for debugging so we can confirm it's set
      setChatStatus(`Default chat selected (id: ${id})`);
      console.log('Received default_chat from server:', id);
    }
  });

  // If no default is provided and no client fallback is set, disable sending to avoid prompting in UI
  // (we expect chat id to be in code/server-side per your request).
  socket.on('connect', () => {
    if (!currentChatId && !DEFAULT_CHAT_ID) {
      setChatStatus('No chat configured — sending disabled (configure DEFAULT_CHAT_ID or server default)');
    }
  });

  socket.on('message_sent', (payload) => {
    if (!payload.ok) {
      setChatStatus('Error sending message: ' + payload.error);
      return;
    }
    setChatStatus('Message delivered by server');
    // Mark the most recent pending sent message as delivered if present
    const pendings = document.querySelectorAll('.msg-wrapper .tick.pending');
    if (pendings && pendings.length) {
      const pending = pendings[pendings.length - 1];
      pending.classList.remove('pending');
      pending.classList.add('delivered');
      pending.textContent = '✓✓';
    }
  });
}

// Fetch server-side config (hidden default chat id) so we can send immediately without waiting for a message
(async function fetchConfig() {
  const tryGet = async (url) => {
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      return await r.json();
    } catch (_) {
      return null;
    }
  };

  let cfg = await tryGet('/api/config');
  if (!cfg) cfg = await tryGet('http://localhost:3000/api/config');
  if (cfg && cfg.defaultChatId) {
    currentChatId = cfg.defaultChatId;
    setChatStatus('Default chat configured by server (hidden)');
    console.log('Default chat loaded from server (hidden)');
  }
})();

sendBtn.addEventListener('click', async () => {
  const text = messageInput.value.trim();
  // Use configured chat id: priority: server-provided currentChatId -> client DEFAULT_CHAT_ID
  const chatId = currentChatId || DEFAULT_CHAT_ID;
  if (!text) return;
  if (!chatId) {
    setChatStatus('Send blocked: no chat id configured in code or server. Set DEFAULT_CHAT_ID in script or enable server default.');
    return;
  }

  // Try direct HTTP send first (works even if Socket.IO isn't connected)
  const payload = { text, chatId: Number(chatId) };
  setChatStatus(`Sending to ${chatId}...`);
  console.log('Attempting send, payload:', payload);

  const trySend = async (url) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const json = await r.json();
      console.log('HTTP send response from', url, json);
      return { ok: r.ok, json };
    } catch (err) {
      console.error('HTTP send error to', url, err);
      return { ok: false, error: err };
    }
  };

  // Build a list of candidate endpoints to try (covers common local development hosts)
  const hostCandidates = [
    '/api/send',
    `${location.protocol}//${location.hostname}:3000/api/send`,
    `http://localhost:3000/api/send`,
    `http://127.0.0.1:3000/api/send`
  ];

  // Before sending, check reachability via /api/echo (helps diagnose CORS/network issues)
  const tryEcho = async () => {
    const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname) || (location.port && !['80', '443'].includes(location.port));

    const echoCandidates = [
      '/api/echo',
      `${location.origin}/api/echo`,
      'http://localhost:3000/api/echo',
      'http://127.0.0.1:3000/api/echo'
    ];
    for (const url of echoCandidates) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const r = await fetch(url, { signal: controller.signal, credentials: 'same-origin' });
        clearTimeout(timeout);
        if (r.ok) {
          const j = await r.json();
          console.log('echo ok from', url, j);
          setChatStatus(`Server reachable at ${url}`);
          return { ok: true, url };
        }
      } catch (err) {
        console.warn('echo failed for', url, err);
      }
    }
    return { ok: false, isLocal };
  };

  const echo = await tryEcho();
  if (!echo.ok) {
    // In local/dev show detailed guidance; in production keep status minimal
    if (echo.isLocal) {
      setChatStatus('Server is not reachable from browser (echo failed on all hosts). See console for details.');
      return; // in dev we stop to avoid confusing send attempts
    } else {
      setChatStatus('Live updates unavailable (server echo failed); sending may still work.');
      console.warn('Echo failed on all hosts; proceeding to try sends; check server logs for /api/echo');
      // proceed to send attempts (do not return)
    }
  }

  // Try each candidate endpoint until one succeeds
  let res = { ok: false };
  const errors = [];
  for (const url of hostCandidates) {
    res = await trySend(url);
    if (res.ok && res.json && res.json.ok) break;
    errors.push({ url, res });
  }

  if (res.ok && res.json && res.json.ok) {
    // Append a local-sent message bubble (do NOT show chat id per user preference)
    const el = appendMessage(text, 'msg-web');
    setChatStatus('Message sent');
    // Mark tick as delivered (if the send was accepted by server/bot)
    if (el) {
      const tick = el.querySelector('.tick');
      if (tick) {
        tick.classList.remove('pending');
        tick.classList.add('delivered');
        tick.textContent = '✓✓';
      }
    }
  } else {
    const errMsg = (res.json && res.json.error) || (res.error && res.error.toString()) || 'Unknown error';
    setChatStatus('Failed to send: ' + errMsg);
    console.error('All send attempts failed:', errors);
    // Show failed bubble and mark tick as failed
    const el = appendMessage(text + ' (failed)', 'msg-web');
    if (el) {
      const tick = el.querySelector('.tick');
      if (tick) {
        tick.classList.remove('pending');
        tick.classList.add('failed');
        tick.textContent = '!';
      }
    }
  }

  messageInput.value = '';
});

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendBtn.click();
});
