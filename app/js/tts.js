// Reads Code Forge's own lesson text aloud — never book/video transcript
// text, see docs/12-copyright-source-boundaries.md. Speaks one paragraph
// per SpeechSynthesisUtterance (chained via onend) rather than one long
// utterance, so the caller can highlight the paragraph currently being
// read and so Pause/Resume land on a paragraph boundary.
const TTS = (() => {
  let queue = [];
  let queueIndex = -1;
  let state = 'idle'; // 'idle' | 'speaking' | 'paused'
  let callbacks = {};

  function available() {
    return 'speechSynthesis' in window;
  }
  function getState() {
    return state;
  }

  // Some environments report speechSynthesis as available but never
  // actually produce audio (e.g. zero installed voices) — onstart/onend
  // then never fire and the UI would be stuck "speaking" forever. This
  // watchdog treats a silent utterance as a failure instead.
  const WATCHDOG_MS = 4000;

  function speakNext() {
    queueIndex += 1;
    if (queueIndex >= queue.length) {
      state = 'idle';
      if (callbacks.onEnd) callbacks.onEnd();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(queue[queueIndex]);
    utterance.rate = 1;
    let started = false;
    const watchdog = setTimeout(() => {
      if (started || state === 'idle') return;
      state = 'idle';
      speechSynthesis.cancel();
      if (callbacks.onFailure) callbacks.onFailure();
    }, WATCHDOG_MS);
    utterance.onstart = () => {
      started = true;
      clearTimeout(watchdog);
      if (callbacks.onParagraphStart) callbacks.onParagraphStart(queueIndex);
    };
    utterance.onend = () => {
      clearTimeout(watchdog);
      if (state !== 'idle') speakNext();
    };
    speechSynthesis.speak(utterance);
  }

  // paragraphs: string[]. cbs: { onParagraphStart(index), onEnd(), onFailure() }.
  function speak(paragraphs, cbs = {}) {
    if (!available()) return false;
    stop();
    queue = paragraphs;
    queueIndex = -1;
    callbacks = cbs;
    state = 'speaking';
    speakNext();
    return true;
  }
  function pause() {
    if (state !== 'speaking') return;
    speechSynthesis.pause();
    state = 'paused';
  }
  function resume() {
    if (state !== 'paused') return;
    speechSynthesis.resume();
    state = 'speaking';
  }
  function stop() {
    if (state === 'idle') return;
    state = 'idle';
    speechSynthesis.cancel();
  }

  return { available, speak, pause, resume, stop, getState };
})();
