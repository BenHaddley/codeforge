importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');

let pyodideReadyPromise = null;

function getPyodide() {
  if (!pyodideReadyPromise) pyodideReadyPromise = loadPyodide();
  return pyodideReadyPromise;
}

self.onmessage = async (e) => {
  const { id, code, type } = e.data;
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
    await pyodide.runPythonAsync(code);
    self.postMessage({ id, ok: true, output });
  } catch (err) {
    self.postMessage({ id, ok: false, output: output + String(err), error: String(err) });
  }
};
