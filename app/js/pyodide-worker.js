importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');

let pyodideReadyPromise = null;

function getPyodide() {
  if (!pyodideReadyPromise) pyodideReadyPromise = loadPyodide();
  return pyodideReadyPromise;
}

self.onmessage = async (e) => {
  const { id, code, type, stdinLines } = e.data;
  if (type === 'warmup') {
    try {
      await getPyodide();
      self.postMessage({ ready: true });
    } catch (err) {
      // Swallow warmup failures silently; the next real run will retry the load.
    }
    return;
  }
  let output = '';
  try {
    const pyodide = await getPyodide();
    pyodide.setStdout({ batched: (s) => { output += s + '\n'; } });
    pyodide.setStderr({ batched: (s) => { output += s + '\n'; } });
    // input() reads from Pyodide's virtual stdin one line at a time. There's
    // no interactive back-and-forth here (a Worker can't synchronously wait
    // on the main thread without SharedArrayBuffer + Atomics, which this
    // static site doesn't have the cross-origin-isolation headers for), so
    // the caller pre-collects every line the program will need — via the
    // Win98 stdin prompt in lesson-loader.js — and we just hand them out in
    // order. A program that calls input() more times than lines were
    // supplied gets null back, which surfaces as a normal Python EOFError.
    const queue = Array.isArray(stdinLines) ? stdinLines.slice() : [];
    pyodide.setStdin({ stdin: () => (queue.length ? queue.shift() : null) });
    await pyodide.runPythonAsync(code);
    self.postMessage({ id, ok: true, output });
  } catch (err) {
    self.postMessage({ id, ok: false, output: output + String(err), error: String(err) });
  }
};
