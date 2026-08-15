// Runs Kokoro's model load + generate() off the main thread. This is the
// actual fix for a real, documented kokoro-js failure mode: generate() runs
// synchronously with no yielding, so calling it on the main thread freezes
// the whole tab for the duration of inference — long enough on constrained
// hardware that the browser's own unresponsive-page recovery kills and
// reloads the tab (see https://github.com/open-webui/open-webui/issues/10009,
// the same symptom reproduced live in this project). Isolating it in a
// Worker keeps the UI responsive during synthesis and lets the client
// (tts.js) genuinely terminate a hung request via worker.terminate(),
// rather than merely giving up on waiting for one.
const KOKORO_CDN = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js';
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const DTYPE = 'q8';

let modelPromise = null;
function loadModel() {
  if (!modelPromise) {
    modelPromise = import(KOKORO_CDN).then(({ KokoroTTS }) =>
      KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: DTYPE,
        device: 'wasm',
        progress_callback: (p) => {
          self.postMessage({ type: 'progress', progress: p.progress || 0 });
        },
      })
    );
  }
  return modelPromise;
}

self.onmessage = async (e) => {
  const { id, type, text, voice } = e.data;
  if (type === 'warmup') {
    try {
      await loadModel();
      self.postMessage({ ready: true });
    } catch (err) {
      // Swallow warmup failures silently, same as pyodide-worker.js — the
      // next real generate request retries the load and surfaces the error.
    }
    return;
  }
  try {
    const tts = await loadModel();
    const raw = await tts.generate(text, { voice });
    self.postMessage({ id, ok: true, blob: raw.toBlob() });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
