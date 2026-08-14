// Paperclip session state: per-lesson conversation memory, assistance
// level, editor version tracking and the latest execution result.
//
// For this static prototype the conversation lives in localStorage, keyed
// by lesson id, so it survives reloads but never leaves the browser
// (except the trimmed slice that is deliberately sent with each request).
const PaperclipState = (() => {
  const MAX_STORED_MESSAGES = 30;
  const MAX_SENT_MESSAGES = 8;
  const MAX_SENT_CHARS = 1500;

  const convKey = (lessonId) => `codeforge:paperclip:conv:${lessonId}`;
  const levelKey = (lessonId) => `codeforge:paperclip:level:${lessonId}`;

  // ---- Conversation -------------------------------------------------------

  function getConversation(lessonId) {
    try {
      const raw = localStorage.getItem(convKey(lessonId));
      const msgs = raw ? JSON.parse(raw) : [];
      return Array.isArray(msgs) ? msgs : [];
    } catch (err) {
      return [];
    }
  }

  function saveConversation(lessonId, messages) {
    try {
      localStorage.setItem(convKey(lessonId), JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
    } catch (err) {
      // Storage full or unavailable — the session continues in memory.
    }
  }

  function addMessage(lessonId, role, content) {
    const messages = getConversation(lessonId);
    messages.push({ role, content, timestamp: Date.now() });
    saveConversation(lessonId, messages);
    return messages;
  }

  function clearConversation(lessonId) {
    try {
      localStorage.removeItem(convKey(lessonId));
    } catch (err) { /* ignore */ }
  }

  // The trimmed history actually sent to the API, so a long chat cannot
  // blow the context budget.
  function getSentHistory(lessonId) {
    return getConversation(lessonId)
      .slice(-MAX_SENT_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_SENT_CHARS) }));
  }

  // ---- Assistance level (0-4, per assignment) ------------------------------

  function getAssistanceLevel(lessonId) {
    const n = parseInt(localStorage.getItem(levelKey(lessonId)) || '0', 10);
    return Math.max(0, Math.min(4, n));
  }

  // Called after each Paperclip exchange while the assignment is
  // incomplete, so repeated questions get progressively more specific help.
  function bumpAssistanceLevel(lessonId) {
    const next = Math.min(4, getAssistanceLevel(lessonId) + 1);
    try {
      localStorage.setItem(levelKey(lessonId), String(next));
    } catch (err) { /* ignore */ }
    return next;
  }

  function resetAssistanceLevel(lessonId) {
    try {
      localStorage.setItem(levelKey(lessonId), '0');
    } catch (err) { /* ignore */ }
  }

  // ---- Editor version ------------------------------------------------------

  function hashCode(code) {
    let h = 5381;
    const s = String(code || '');
    for (let i = 0; i < s.length; i += 1) {
      h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  // ---- Runtime state (module memory; refreshed each lesson load) -----------

  let current = {
    lessonId: null,
    lastSentEditorVersion: null,
    lastRun: null,
  };

  function reset(lessonId) {
    current = { lessonId, lastSentEditorVersion: null, lastRun: null };
  }

  function setLessonId(lessonId) {
    current.lessonId = lessonId;
  }

  function recordRun(result) {
    current.lastRun = result;
  }

  function getLastRun() {
    return current.lastRun;
  }

  // Remembers the code version that was included in the last request, so
  // the next request can say whether the editor has moved on.
  function getLessonId() {
    return current.lessonId;
  }

  function noteSentEditorVersion(code) {
    current.lastSentEditorVersion = hashCode(code);
  }

  function editorUpdatedSinceLastMessage(code) {
    const h = hashCode(code);
    return current.lastSentEditorVersion !== null && h !== current.lastSentEditorVersion;
  }

  return {
    getConversation,
    addMessage,
    clearConversation,
    getSentHistory,
    getAssistanceLevel,
    bumpAssistanceLevel,
    resetAssistanceLevel,
    reset,
    setLessonId,
    getLessonId,
    recordRun,
    getLastRun,
    noteSentEditorVersion,
    editorUpdatedSinceLastMessage,
    hashCode,
  };
})();