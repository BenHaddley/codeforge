// Executes learner JavaScript off the main thread, mirroring
// pyodide-worker.js's contract exactly (same message shape, same
// ok/output/error response) so runner-client.js can drive either one
// identically. Unlike Python, JS needs no runtime to load — it's the
// Worker's own engine — so there's no warmup download and no cold-start
// timeout to account for.
self.onmessage = (e) => {
  const { id, code, type } = e.data;
  if (type === 'warmup') {
    self.postMessage({ ready: true });
    return;
  }
  let output = '';
  const record = (...args) => {
    output += args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ') + '\n';
  };
  try {
    // `console` is a parameter here, not the Worker's global — the
    // learner's code sees a console.log/warn/error that writes into our
    // captured buffer instead of the real (invisible, off-thread) console.
    // eslint-disable-next-line no-new-func
    const run = new Function('console', code);
    run({ log: record, warn: record, error: record, info: record });
    self.postMessage({ id, ok: true, output });
  } catch (err) {
    self.postMessage({ id, ok: false, output: output + String(err), error: String(err) });
  }
};
