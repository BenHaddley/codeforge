// Manages the Pyodide Web Worker so a learner's infinite loop can never
// freeze the page: execution runs off-thread, and a hung request kills and
// respawns the worker rather than waiting forever.
//
// Pyodide's first load downloads its WASM runtime from a CDN, which can
// take much longer than any reasonable execution timeout. A warmup message
// starts that download as soon as the lesson loads (while the learner is
// still reading), and run() only applies the short execution-guard timeout
// once the worker has confirmed the runtime is ready — before that it
// falls back to a generous cold-start allowance instead of killing a
// download that just hasn't finished yet.
const RunnerClient = (() => {
  const COLD_START_TIMEOUT_MS = 30000;
  let worker = null;
  let nextId = 1;
  let pyodideReady = false;
  const pending = new Map();

  function spawn() {
    worker = new Worker('js/pyodide-worker.js');
    worker.onmessage = (e) => {
      const { id, ok, output, ready } = e.data;
      if (ready) {
        pyodideReady = true;
        return;
      }
      pyodideReady = true;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      clearTimeout(entry.timer);
      entry.resolve({ ok, output, timedOut: false });
    };
    worker.onerror = (e) => {
      for (const [id, entry] of pending) {
        clearTimeout(entry.timer);
        entry.resolve({ ok: false, output: 'Worker error: ' + e.message, timedOut: false });
      }
      pending.clear();
    };
  }

  function respawn() {
    if (worker) worker.terminate();
    pyodideReady = false;
    spawn();
  }

  spawn();

  function warmup() {
    worker.postMessage({ type: 'warmup' });
  }

  function run(code, { timeoutMs = 8000 } = {}) {
    const id = nextId++;
    const effectiveTimeout = pyodideReady ? timeoutMs : Math.max(timeoutMs, COLD_START_TIMEOUT_MS);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        respawn();
        resolve({
          ok: false,
          output: pyodideReady
            ? 'Execution timed out — check for a loop whose condition never becomes false.'
            : 'Execution timed out — the Python runtime is still downloading. Try again in a moment.',
          timedOut: true,
        });
      }, effectiveTimeout);
      pending.set(id, { resolve, timer });
      worker.postMessage({ id, code });
    });
  }

  return { run, warmup };
})();
