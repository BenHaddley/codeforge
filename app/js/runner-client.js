// Manages a language's execution Worker so a learner's infinite loop can
// never freeze the page: execution runs off-thread, and a hung request
// kills and respawns the worker rather than waiting forever.
//
// One factory, one client per track language — same contract either way
// (run/warmup), so lesson-loader.js can pick whichever one a track needs
// without caring how that language actually executes underneath.
function createRunnerClient(workerPath, { coldStartTimeoutMs = 0, coldStartMessage } = {}) {
  let worker = null;
  let nextId = 1;
  // Only Python has a runtime to download (Pyodide's WASM build, fetched
  // from a CDN on first use); a plain JS worker has nothing to warm up, so
  // it's considered "ready" immediately and never applies the longer
  // cold-start allowance below.
  let runtimeReady = coldStartTimeoutMs === 0;
  const pending = new Map();

  function spawn() {
    worker = new Worker(workerPath);
    worker.onmessage = (e) => {
      const { id, ok, output, ready } = e.data;
      if (ready) {
        runtimeReady = true;
        return;
      }
      runtimeReady = true;
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
    runtimeReady = coldStartTimeoutMs === 0;
    spawn();
  }

  spawn();

  function warmup() {
    worker.postMessage({ type: 'warmup' });
  }

  function run(code, { timeoutMs = 8000, stdinLines } = {}) {
    const id = nextId++;
    const effectiveTimeout = runtimeReady ? timeoutMs : Math.max(timeoutMs, coldStartTimeoutMs);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        respawn();
        resolve({
          ok: false,
          output: runtimeReady
            ? 'Execution timed out — check for a loop whose condition never becomes false.'
            : (coldStartMessage || 'Execution timed out. Try again in a moment.'),
          timedOut: true,
        });
      }, effectiveTimeout);
      pending.set(id, { resolve, timer });
      worker.postMessage({ id, code, stdinLines });
    });
  }

  return { run, warmup };
}

const RunnerClient = createRunnerClient('js/pyodide-worker.js', {
  coldStartTimeoutMs: 30000,
  coldStartMessage: 'Execution timed out — the Python runtime is still downloading. Try again in a moment.',
});
const JsRunnerClient = createRunnerClient('js/js-worker.js');
