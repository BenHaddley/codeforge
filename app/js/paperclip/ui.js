// Paperclip panel UI — a Win98-native-looking docked window with one text
// input, conversation above it, and classic bevels. No chatbot styling.
const PaperclipUI = (() => {
  const COLLAPSED_KEY = 'codeforge:paperclip:collapsed';

  let els = null;
  let onSend = null;

  // Friendly fallback messages keyed by API error kind. The server already
  // sends friendly text; these cover client-side failures (network, etc.).
  const FALLBACK_ERRORS = {
    network: 'Paperclip could not connect to the tutor service.\n\nYour code and lesson progress are safe.\nTry again in a moment.',
    timeout: 'The tutor service took too long to respond.\n\nYour code and lesson progress are safe.\nTry again in a moment.',
    rate_limited: 'Paperclip is busy right now.\n\nWait a moment, then try again.',
    invalid_key: 'Paperclip is temporarily unavailable.\n\nYour lesson and code have not been affected.',
    provider_unavailable: 'Paperclip is temporarily unavailable.\n\nYour lesson and code have not been affected.',
    malformed: 'The tutor service returned an unreadable response.\n\nTry again in a moment.',
    empty: 'The tutor service returned an empty response.\n\nTry again in a moment.',
    invalid_request: 'That question could not be sent.\n\nShorten it and try again.',
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function init(handlers) {
    onSend = handlers.onSend;
    els = {
      pane: document.getElementById('paperclipPane'),
      titlebar: document.getElementById('paperclipTitlebar'),
      status: document.getElementById('paperclipStatus'),
      toggle: document.getElementById('paperclipToggle'),
      body: document.getElementById('paperclipBody'),
      conversation: document.getElementById('paperclipConversation'),
      input: document.getElementById('paperclipInput'),
      sendBtn: document.getElementById('paperclipSendBtn'),
      debugLine: document.getElementById('paperclipDebug'),
    };

    els.sendBtn.addEventListener('click', () => submit());
    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
    els.toggle.addEventListener('click', () => toggleCollapsed());

    if (window.innerWidth <= 1050 && localStorage.getItem(COLLAPSED_KEY) === null) {
      setCollapsed(true);
    } else {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
    }
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 1050 && localStorage.getItem(COLLAPSED_KEY) === null) setCollapsed(true);
    });
  }

  function submit() {
    const text = els.input.value.trim();
    if (!text || els.input.disabled) return;
    els.input.value = '';
    if (onSend) onSend(text);
  }

  // ---- Rendering -----------------------------------------------------------

  function messageBlock(role, content) {
    const label = role === 'user' ? 'You' : 'Paperclip';
    return `<div class="paperclip-msg ${role === 'user' ? 'user' : 'assistant'}">
      <div class="paperclip-msg-label">${label}</div>
      <div class="paperclip-msg-content">${escapeHtml(content)}</div>
    </div>`;
  }

  function renderConversation(messages) {
    els.conversation.innerHTML = messages.length
      ? messages.map((m) => messageBlock(m.role, m.content)).join('')
      : '<div class="paperclip-empty">Ask about the lesson, your code, or an error you are seeing.</div>';
    els.conversation.scrollTop = els.conversation.scrollHeight;
  }

  function appendMessage(role, content) {
    els.conversation.insertAdjacentHTML('beforeend', messageBlock(role, content));
    els.conversation.scrollTop = els.conversation.scrollHeight;
  }

  function showLoading() {
    els.conversation.insertAdjacentHTML('beforeend', '<div class="paperclip-thinking">Paperclip is thinking…</div>');
    els.conversation.scrollTop = els.conversation.scrollHeight;
    setBusy(true);
  }

  function clearLoading() {
    const thinking = els.conversation.querySelector('.paperclip-thinking');
    if (thinking) thinking.remove();
  }

  function showError(message) {
    els.conversation.insertAdjacentHTML('beforeend', `<div class="paperclip-error">${escapeHtml(message)}</div>`);
    els.conversation.scrollTop = els.conversation.scrollHeight;
  }

  function setBusy(busy) {
    els.input.disabled = busy;
    els.sendBtn.disabled = busy;
  }

  function setStatusText(text) {
    els.status.textContent = text || '';
  }

  function setDebugLine(text) {
    els.debugLine.textContent = text || '';
  }

  // ---- Collapse ------------------------------------------------------------

  function setCollapsed(collapsed) {
    els.pane.classList.toggle('collapsed', collapsed);
    els.toggle.textContent = collapsed ? '▲' : '▼';
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }

  function toggleCollapsed() {
    setCollapsed(!els.pane.classList.contains('collapsed'));
  }

  return {
    init,
    renderConversation,
    appendMessage,
    showLoading,
    clearLoading,
    showError,
    setBusy,
    setStatusText,
    setDebugLine,
  };
})();