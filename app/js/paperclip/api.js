// Thin client for the Paperclip API. No provider credentials ever live
// here — the server owns the keys and the model choice.
const PaperclipApi = (() => {
  const ENDPOINT = '/api/paperclip';
  const REQUEST_TIMEOUT_MS = 45000;

  async function sendRequest(payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      let data = null;
      try {
        data = await res.json();
      } catch (err) {
        data = null;
      }
      if (data && data.ok && typeof data.content === 'string') {
        return { ok: true, content: data.content, provider: data.provider, model: data.model, latencyMs: data.latencyMs };
      }
      if (data && data.error && data.error.kind) {
        return { ok: false, errorKind: data.error.kind, errorMessage: data.error.message || '' };
      }
      return { ok: false, errorKind: 'provider_unavailable', errorMessage: `Unexpected response (HTTP ${res.status})` };
    } catch (err) {
      if (err.name === 'AbortError') return { ok: false, errorKind: 'timeout', errorMessage: 'Request timed out.' };
      return { ok: false, errorKind: 'network', errorMessage: 'Could not reach the tutor service.' };
    } finally {
      clearTimeout(timer);
    }
  }

  return { sendRequest };
})();