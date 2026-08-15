// Reads Code Forge's own lesson text aloud — never book/video transcript
// text, see docs/12-copyright-source-boundaries.md.
//
// Hybrid engine, in priority order:
//   1. Native browser speechSynthesis — zero download, starts near-instantly,
//      on any OS/browser that ships English system voices (most desktop
//      Chrome/Edge/Safari/Firefox installs do). This is the common case.
//   2. Kokoro (https://github.com/hexgrad/kokoro), an 82M-parameter TTS
//      model run fully client-side via Transformers.js/ONNX Runtime Web
//      (WASM) — used only when no native English voice is available (e.g.
//      the headless/minimal Linux Chromium this was first discovered on).
//      The ~90MB quantized weights download once and are cached by the
//      browser like any other asset; sw.js caches the Kokoro CDN + HF Hub
//      requests explicitly so repeat visits never re-download it. Model
//      load and generate() run in tts-worker.js, not here — generate() is
//      synchronous with no yielding, and running it on the main thread
//      freezes the whole tab for the duration of inference (a documented
//      kokoro-js failure mode: https://github.com/open-webui/open-webui/issues/10009,
//      reproduced live in this project — a single paragraph froze the tab
//      long enough to trigger the browser's own unresponsive-page reload).
//      Isolating it in a Worker keeps the UI responsive during synthesis
//      and lets a hung request actually be killed via worker.terminate()
//      (see respawnWorker()) instead of just abandoned mid-freeze.
// Both paths are 100% client-side — no backend, no API key, no server —
// which is what makes Listen work on a plain static host (GitHub Pages).
// A prior server-proxied approach was rejected for exactly this reason.
const TTS = (() => {
  const VOICE_KEY = 'codeforge:tts:voice';
  // Kokoro fallback shortlist, not the full kokoro-js voice list — most of
  // that list is graded C or below (see the kokoro-js README's voice
  // table). Each entry here is a top or near-top grade for its accent/
  // gender pair.
  const KOKORO_VOICES = [
    { id: 'af_heart', label: 'Heart (US, female)' },
    { id: 'af_bella', label: 'Bella (US, female)' },
    { id: 'am_michael', label: 'Michael (US, male)' },
    { id: 'bf_emma', label: 'Emma (UK, female)' },
  ];
  const MAX_NATIVE_VOICES = 10;

  const VOICES = KOKORO_VOICES.map((v) => ({ ...v })); // mutable — same array identity exported below
  function setVoiceList(list) {
    VOICES.length = 0;
    list.forEach((v) => VOICES.push(v));
  }

  function getVoice() {
    const saved = localStorage.getItem(VOICE_KEY);
    return VOICES.some((v) => v.id === saved) ? saved : VOICES[0].id;
  }
  function setVoice(id) {
    if (VOICES.some((v) => v.id === id)) localStorage.setItem(VOICE_KEY, id);
  }

  let audioEl = null;
  let queue = [];
  let queueIndex = -1;
  let state = 'idle'; // 'idle' | 'speaking' | 'paused'
  let callbacks = {};
  let generation = 0; // bumped on speak()/stop() to invalidate in-flight work
  const cache = new Map(); // paragraph index -> Promise<Blob> (Kokoro only)

  let progressCallback = null;

  let engine = null; // 'native' | 'kokoro', decided once by readyPromise
  const nativeVoiceMap = new Map(); // voice id -> SpeechSynthesisVoice

  function detectNativeVoices() {
    return new Promise((resolve) => {
      if (typeof speechSynthesis === 'undefined') {
        resolve([]);
        return;
      }
      const existing = speechSynthesis.getVoices();
      if (existing.length) {
        resolve(existing);
        return;
      }
      let done = false;
      const finish = (voices) => {
        if (done) return;
        done = true;
        speechSynthesis.removeEventListener('voiceschanged', onChange);
        resolve(voices);
      };
      const onChange = () => finish(speechSynthesis.getVoices());
      speechSynthesis.addEventListener('voiceschanged', onChange);
      // Some browsers never fire voiceschanged when there are genuinely
      // zero voices — this timeout is what lets the Kokoro fallback engage.
      setTimeout(() => finish(speechSynthesis.getVoices()), 500);
    });
  }

  const ready = detectNativeVoices().then((voices) => {
    const english = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
    if (english.length) {
      engine = 'native';
      const deduped = [];
      const seen = new Set();
      english.forEach((v) => {
        const id = `native:${v.voiceURI || v.name}`;
        if (seen.has(id)) return;
        seen.add(id);
        deduped.push(v);
        nativeVoiceMap.set(id, v);
      });
      setVoiceList(deduped.slice(0, MAX_NATIVE_VOICES).map((v) => ({ id: `native:${v.voiceURI || v.name}`, label: `${v.name} (${v.lang})` })));
    } else {
      engine = 'kokoro';
      setVoiceList(KOKORO_VOICES.map((v) => ({ ...v })));
    }
  });

  function available() {
    return true;
  }
  function getState() {
    return state;
  }

  // Worker client — mirrors runner-client.js's spawn/respawn-on-timeout
  // pattern used for the Python/JS execution workers. A hung request kills
  // and restarts the worker rather than waiting forever.
  const SYNTH_TIMEOUT_MS = 60000; // generous: cold WASM compile + a full paragraph on slow hardware
  let worker = null;
  let nextRequestId = 1;
  const pendingRequests = new Map(); // id -> { resolve, reject, timer }

  function spawnWorker() {
    worker = new Worker('js/tts-worker.js');
    worker.onmessage = (e) => {
      const { id, ok, blob, error, ready: workerReady, type, progress } = e.data;
      if (workerReady) return; // warmup complete — nothing to resolve, just informational
      if (type === 'progress') {
        if (progressCallback) progressCallback({ progress });
        return;
      }
      const entry = pendingRequests.get(id);
      if (!entry) return;
      pendingRequests.delete(id);
      clearTimeout(entry.timer);
      if (ok) entry.resolve(blob);
      else entry.reject(new Error(error || 'Narration failed.'));
    };
    worker.onerror = (e) => {
      for (const [, entry] of pendingRequests) {
        clearTimeout(entry.timer);
        entry.reject(new Error('Voice worker error: ' + e.message));
      }
      pendingRequests.clear();
    };
  }

  function respawnWorker() {
    if (worker) worker.terminate();
    spawnWorker();
  }

  // Start downloading/compiling the Kokoro model before the learner clicks
  // Listen, so the wait (if any) happens while they're reading. Only
  // engages once we know native voices aren't available — most learners
  // never spawn the worker at all.
  function warmup(onProgress) {
    if (onProgress) progressCallback = onProgress;
    ready.then(() => {
      if (engine !== 'kokoro') return;
      if (!worker) spawnWorker();
      worker.postMessage({ type: 'warmup' });
    });
  }

  function synthesizeToBlob(text) {
    if (!worker) spawnWorker();
    const id = nextRequestId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingRequests.delete(id);
        respawnWorker();
        reject(new Error('Narration timed out. Try again.'));
      }, SYNTH_TIMEOUT_MS);
      pendingRequests.set(id, { resolve, reject, timer });
      worker.postMessage({ id, type: 'generate', text, voice: getVoice() });
    });
  }

  // The ONNX Runtime Web (WASM) session isn't safe for concurrent
  // generate() calls — kokoroPlayIndex() prefetches the current AND next
  // paragraph back-to-back, and firing two overlapping generate() calls
  // on the same session hangs silently (no rejection, nothing to catch —
  // confirmed live: an isolated single generate() call resolved in ~3s,
  // but two fired together never resolved at all). Chain synthesis calls
  // so only one is ever in flight — including across the worker boundary,
  // since the worker's onmessage handler is itself async and two messages
  // arriving close together would otherwise start two overlapping
  // generate() calls inside the same worker. Still runs ahead of playback
  // since the chain keeps advancing while the current paragraph plays.
  let synthChain = Promise.resolve();
  function synthesizeSerialized(text) {
    const result = synthChain.then(() => synthesizeToBlob(text));
    synthChain = result.catch(() => {});
    return result;
  }

  function prefetch(index) {
    if (index < 0 || index >= queue.length || cache.has(index)) return;
    cache.set(index, synthesizeSerialized(queue[index]));
  }

  function ensureAudioEl() {
    if (audioEl) return audioEl;
    audioEl = new Audio();
    audioEl.addEventListener('ended', () => {
      if (state !== 'idle') advance();
    });
    return audioEl;
  }

  async function kokoroPlayIndex(index, gen) {
    prefetch(index);
    prefetch(index + 1);
    let blob;
    try {
      blob = await cache.get(index);
    } catch (err) {
      if (gen !== generation) return;
      state = 'idle';
      if (callbacks.onFailure) callbacks.onFailure(err.message);
      return;
    }
    if (gen !== generation) return;

    const el = ensureAudioEl();
    if (el.src) URL.revokeObjectURL(el.src);
    el.src = URL.createObjectURL(blob);
    try {
      await el.play();
    } catch (err) {
      if (gen !== generation) return;
      state = 'idle';
      if (callbacks.onFailure) callbacks.onFailure('Playback was blocked by the browser.');
      return;
    }
    if (gen !== generation) return;
    if (callbacks.onParagraphStart) callbacks.onParagraphStart(index);
  }

  function nativePlayIndex(index, gen) {
    const utterance = new SpeechSynthesisUtterance(queue[index]);
    const voice = nativeVoiceMap.get(getVoice());
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      if (gen !== generation) return;
      if (callbacks.onParagraphStart) callbacks.onParagraphStart(index);
    };
    utterance.onend = () => {
      if (gen !== generation) return;
      advance();
    };
    utterance.onerror = () => {
      // Also fires on our own stop()/speak() calling cancel() — the
      // generation guard filters those out same as any other stray event.
      if (gen !== generation) return;
      state = 'idle';
      if (callbacks.onFailure) callbacks.onFailure('Narration failed.');
    };
    speechSynthesis.speak(utterance);
  }

  async function playIndex(index, gen) {
    await ready;
    if (gen !== generation) return;
    if (engine === 'native') nativePlayIndex(index, gen);
    else kokoroPlayIndex(index, gen);
  }

  function advance() {
    queueIndex += 1;
    if (queueIndex >= queue.length) {
      state = 'idle';
      stopKeepAlive();
      if (callbacks.onEnd) callbacks.onEnd();
      return;
    }
    playIndex(queueIndex, generation);
  }

  // Chrome silently stops an in-progress speechSynthesis utterance after
  // ~15s unless it's pinged with pause()/resume() periodically — a
  // long-documented Chrome bug, not specific to this app. Only ever
  // no-ops on the Kokoro path.
  let keepAliveTimer = null;
  function startKeepAlive() {
    stopKeepAlive();
    keepAliveTimer = setInterval(() => {
      if (engine === 'native' && state === 'speaking') {
        speechSynthesis.pause();
        speechSynthesis.resume();
      }
    }, 5000);
  }
  function stopKeepAlive() {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
  }

  // paragraphs: string[]. cbs: { onParagraphStart(index), onEnd(), onFailure(message) }.
  // Must be called synchronously from a user-gesture handler (a click),
  // never after an `await` — see primeAudioEl() below.
  function speak(paragraphs, cbs = {}) {
    stop();
    generation += 1;
    queue = paragraphs;
    queueIndex = -1;
    callbacks = cbs;
    cache.clear();
    state = 'speaking';
    primeAudioEl(); // harmless no-op if we end up on the native engine
    startKeepAlive();
    advance();
    return true;
  }

  // Chrome only allows <audio>.play() during/soon-after a real user
  // gesture. The Kokoro path has to synthesize each paragraph first
  // (async), and that wait loses the gesture window before playback ever
  // starts. Calling play() synchronously here — even though it immediately
  // fails with no source loaded — "spends" the gesture on this element,
  // after which Chrome allows further play() calls on the *same element*
  // from async code. Documented Chrome workaround, not specific to this
  // app. Called unconditionally since the engine (native vs Kokoro) isn't
  // known synchronously at click-time.
  function primeAudioEl() {
    const el = ensureAudioEl();
    el.play().catch(() => {});
  }

  function pause() {
    if (state !== 'speaking') return;
    if (engine === 'native') {
      speechSynthesis.pause();
    } else {
      if (!audioEl) return;
      audioEl.pause();
    }
    state = 'paused';
  }
  function resume() {
    if (state !== 'paused') return;
    if (engine === 'native') {
      speechSynthesis.resume();
    } else {
      if (!audioEl) return;
      audioEl.play();
    }
    state = 'speaking';
  }
  function stop() {
    if (state === 'idle') return;
    state = 'idle';
    generation += 1;
    stopKeepAlive();
    if (engine === 'native' && typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
    if (audioEl) {
      audioEl.pause();
      audioEl.removeAttribute('src');
      audioEl.load();
    }
  }

  return { available, speak, pause, resume, stop, getState, warmup, VOICES, getVoice, setVoice, ready };
})();
