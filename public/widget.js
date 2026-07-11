(function () {
  var scriptTag = document.currentScript;
  if (!scriptTag) return;

  var tenantId = scriptTag.getAttribute('data-tenant');
  if (!tenantId) {
    console.error('[Aura Widget] Missing data-tenant attribute on the embed <script> tag.');
    return;
  }

  var apiBase = scriptTag.getAttribute('data-api-base') || new URL(scriptTag.src).origin;
  var accent = scriptTag.getAttribute('data-accent') || '#2563eb';

  var sessionKey = 'aura_widget_session_' + tenantId;
  var sessionId = localStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(sessionKey, sessionId);
  }

  var messages = [];
  var isOpen = false;
  var isSending = false;

  var host = document.createElement('div');
  host.id = 'aura-chat-widget-root';
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent =
    '.bubble{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;' +
    'background:' + accent + ';color:#fff;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.25);' +
    'font-size:24px;z-index:2147483647;display:flex;align-items:center;justify-content:center;}' +
    '.panel{position:fixed;bottom:88px;right:20px;width:340px;max-width:90vw;height:460px;max-height:70vh;' +
    'background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);display:none;flex-direction:column;' +
    'overflow:hidden;font-family:system-ui,-apple-system,sans-serif;z-index:2147483647;}' +
    '.panel.open{display:flex;}' +
    '.header{background:' + accent + ';color:#fff;padding:14px 16px;font-size:14px;font-weight:600;}' +
    '.messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f7f8fa;}' +
    '.msg{max-width:80%;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.4;white-space:pre-wrap;}' +
    '.msg.customer{align-self:flex-end;background:' + accent + ';color:#fff;}' +
    '.msg.bot{align-self:flex-start;background:#e9ebee;color:#111;}' +
    '.inputRow{display:flex;border-top:1px solid #eee;}' +
    '.inputRow input{flex:1;border:none;padding:12px;font-size:13px;outline:none;}' +
    '.inputRow button{border:none;background:' + accent + ';color:#fff;padding:0 16px;cursor:pointer;font-size:13px;font-weight:600;}' +
    '.inputRow button:disabled{opacity:.5;cursor:default;}';
  root.appendChild(style);

  var bubble = document.createElement('button');
  bubble.className = 'bubble';
  bubble.textContent = '💬';
  bubble.setAttribute('aria-label', 'Open chat');
  root.appendChild(bubble);

  var panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML =
    '<div class="header">Chat with us</div>' +
    '<div class="messages"></div>' +
    '<div class="inputRow">' +
    '<input type="text" placeholder="Type a message…" />' +
    '<button type="button">Send</button>' +
    '</div>';
  root.appendChild(panel);

  var messagesEl = panel.querySelector('.messages');
  var inputEl = panel.querySelector('input');
  var sendBtn = panel.querySelector('button');

  function renderMessages() {
    messagesEl.innerHTML = '';
    messages.forEach(function (m) {
      var div = document.createElement('div');
      div.className = 'msg ' + (m.sender === 'customer' ? 'customer' : 'bot');
      div.textContent = m.text;
      messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setSending(state) {
    isSending = state;
    inputEl.disabled = state;
    sendBtn.disabled = state;
  }

  function sendMessage() {
    var text = inputEl.value.trim();
    if (!text || isSending) return;

    messages.push({ sender: 'customer', text: text });
    inputEl.value = '';
    renderMessages();
    setSending(true);

    fetch(apiBase + '/api/widget/' + encodeURIComponent(tenantId) + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId, messages: messages })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        messages.push({ sender: 'bot', text: data.reply || "Sorry, I didn't catch that." });
        renderMessages();
      })
      .catch(function () {
        messages.push({ sender: 'bot', text: 'Sorry, something went wrong. Please try again shortly.' });
        renderMessages();
      })
      .finally(function () {
        setSending(false);
        inputEl.focus();
      });
  }

  bubble.addEventListener('click', function () {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen && messages.length === 0) {
      messages.push({ sender: 'bot', text: "Hi there! How can I help you today?" });
      renderMessages();
    }
  });

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendMessage();
  });
})();
