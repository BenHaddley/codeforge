// Paperclip client — the only client entry point lesson-loader needs.
// Orchestrates: one text input -> context build -> API -> conversation ->
// UI, with a request cooldown and developer logging.
const Paperclip = (() => {
  const COOLDOWN_MS = 3000;
  const DEBUG_PARAM = 'paperclipDebug';

  let initialized = false;
  let busy = false;
  let lastRequestAt = 0;
  let debug = false;

  // ---- Public API (called by lesson-loader.js) ------------------------------

  function init(trackData, chapterData, lessonData) {
    if (!document.getElementById('paperclipPane')) return;
    PaperclipState.setLessonId(lessonData.id);
    PaperclipState.reset(lessonData.id);
    PaperclipContext.setLessonData(trackData, chapterData, lessonData);

    debug = new URLSearchParams(location.search).has(DEBUG_PARAM);
    PaperclipUI.init({ onSend: send });
    PaperclipUI.renderConversation(PaperclipState.getConversation(lessonData.id));
    PaperclipUI.setStatusText(debug ? 'connected' : '');
    setStatus('Ready — ask about the lesson, your code, or an error.');

    if (debug) logDebug({ event: 'initialized', lessonId: lessonData.id });
  }

  // Called after every Run/Submit so Paperclip knows the latest execution.
  function recordRun(result) {
    PaperclipState.recordRun(result);
    if (result && result.passed) {
      const lessonId = PaperclipContext.getLessonId();
      if (lessonId) PaperclipState.resetAssistanceLevel(lessonId);
    }
    if (debug && initialized) {
      logDebug({
        event: 'run recorded',
        status: result && result.passed ? 'passed' : result && result.timedOut ? 'timeout' : 'other',
      });
    }
  }

  // ---- Send flow ------------------------------------------------------------

  async function send(studentMessage) {
    if (busy) return;
    const lessonId = PaperclipContext.getLessonId();

    const now = Date.now();
    if (now - lastRequestAt < COOLDOWN_MS) {
      PaperclipUI.showError('Wait a moment before sending another question.');
      return;
    }
    lastRequestAt = now;

    busy = true;
    PaperclipUI.setBusy(true);
    PaperclipUI.clearLoading();
    PaperclipUI.showLoading();
    setStatus('Paperclip is thinking…');

    // Build the context BEFORE recording the message so the history slice
    // sent to the API does not already contain the question being asked.
    const context = PaperclipContext.build();
    PaperclipState.addMessage(lessonId, 'user', studentMessage);
    PaperclipUI.appendMessage('user', studentMessage);

    const started = Date.now();
    const result = await PaperclipApi.sendRequest({ studentMessage, context });

    if (result.ok) {
      PaperclipUI.clearLoading();
      PaperclipState.addMessage(lessonId, 'assistant', result.content);
      PaperclipUI.appendMessage('assistant', result.content);
      PaperclipState.noteSentEditorVersion(PaperclipContext.getCurrentEditorCode());
      if (!context.assignmentComplete) PaperclipState.bumpAssistanceLevel(lessonId);
      setStatus('Ready.');
      if (debug) {
        logDebug({
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
          contextBytes: JSON.stringify(context).length,
          editorVersion: context.editor.version,
          editorUpdated: context.editor.updatedSinceLastMessage,
          executionStatus: context.lastRun ? context.lastRun.status : 'none',
          assignmentComplete: context.assignmentComplete,
          assistanceLevel: context.assistanceLevel,
          responseStatus: 'ok',
        });
        PaperclipUI.setDebugLine(`Provider: ${result.provider} · Model: ${result.model} · Latency: ${((result.latencyMs || 0) / 1000).toFixed(1)}s`);
      }
    } else {
      PaperclipUI.clearLoading();
      PaperclipUI.showError(result.errorMessage || fallbackError(result.errorKind));
      setStatus('Paperclip unavailable');
      if (debug) logDebug({ event: 'request failed', errorKind: result.errorKind });
    }
    busy = false;
    PaperclipUI.setBusy(false);
  }

  function fallbackError(kind) {
    const map = {
      network: 'Paperclip could not connect to the tutor service.\n\nYour code and lesson progress are safe.\nTry again in a moment.',
      timeout: 'The tutor service took too long to respond.\n\nYour code and lesson progress are safe.\nTry again in a moment.',
      rate_limited: 'Paperclip is busy right now.\n\nWait a moment, then try again.',
    };
    return map[kind] || 'Paperclip is temporarily unavailable.\n\nYour lesson and code have not been affected.';
  }

  function setStatus(text) {
    const el = document.getElementById('statusText');
    if (el) el.textContent = text;
  }

  // ---- Developer logging ------------------------------------------------------

  function logDebug(entry) {
    if (!debug) return;
    // eslint-disable-next-line no-console
    console.log('[PAPERCLIP]', JSON.stringify(entry));
  }

  return { init, recordRun };
})();