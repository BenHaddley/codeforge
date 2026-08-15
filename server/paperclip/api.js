// POST /api/paperclip handler. Receives normalized Code Forge context from
// the client, enforces limits, assembles the tutor prompt, and calls the
// configured provider chain. Provider credentials never leave this server.
'use strict';

const config = require('./config');
const { buildMessages } = require('./prompt');
const { ProviderError, buildChain, chatWithChain } = require('./provider');
const { RateLimiter } = require('./rate-limit');

const limiter = new RateLimiter({
  windowMs: config.paperclip.rateLimitWindowMs,
  max: config.paperclip.rateLimitMax,
});

const ERROR_MESSAGES = {
  invalid_key: 'The tutor service rejected its API key. Contact the site operator.',
  rate_limited: "You've hit the shared free-tier request limit for Paperclip — this resets within a minute. It's not broken, just busy; wait a moment and try again.",
  provider_unavailable: 'The tutor service is temporarily unavailable. Your lesson and code have not been affected.',
  timeout: 'The tutor service took too long to respond. Try again in a moment.',
  malformed: 'The tutor service returned an unreadable response. Try again.',
  empty: 'The tutor service returned an empty response. Try again.',
};

function fail(kind, detail) {
  return { ok: false, error: { kind, message: ERROR_MESSAGES[kind] || ERROR_MESSAGES.provider_unavailable, detail: detail || null } };
}

function validateBody(body) {
  if (!body || typeof body !== 'object') return 'request body must be a JSON object';
  const msg = body.studentMessage;
  if (typeof msg !== 'string' || msg.trim().length === 0) return 'studentMessage is required';
  if (msg.length > config.paperclip.maxMessageLength) return `studentMessage must be at most ${config.paperclip.maxMessageLength} characters`;
  const ctx = body.context;
  if (!ctx || typeof ctx !== 'object') return 'context is required';
  if (ctx.history && !Array.isArray(ctx.history)) return 'history must be an array';
  return null;
}

async function handlePaperclipRequest(body, meta) {
  const invalid = validateBody(body);
  if (invalid) return { ok: false, error: { kind: 'invalid_request', message: invalid } };

  if (!limiter.allow(meta.ip)) {
    return fail('rate_limited', 'per-IP request limit reached');
  }

  const contextBytes = Buffer.byteLength(JSON.stringify(body.context), 'utf8');
  if (contextBytes > config.paperclip.maxContextBytes) {
    return fail('provider_unavailable', 'context too large');
  }

  const chain = buildChain(config.paperclip);
  if (chain.length === 0) {
    return fail('provider_unavailable', `no provider configured for PAPERCLIP_PROVIDER=${config.paperclip.provider}`);
  }
  // Local inference and the mock provider need no hosted API key.
  if (!['mock', 'local'].includes(config.paperclip.provider) && !config.paperclip.apiKey) {
    return fail('invalid_key', 'PAPERCLIP_API_KEY is not set on the server');
  }

  const started = Date.now();
  let used = null;
  try {
    const messages = buildMessages({
      context: body.context,
      history: body.context.history || [],
      studentMessage: body.studentMessage.trim(),
    });
    // Local models are slow (seconds per token on CPU/limited VRAM), so
    // give them a generous ceiling; hosted providers keep the strict default.
    const timeoutMs =
      config.paperclip.provider === 'local'
        ? Math.max(config.paperclip.timeoutMs, 300000)
        : config.paperclip.timeoutMs;
    const result = await chatWithChain(
      chain,
      {
        messages,
        maxTokens: config.paperclip.maxOutputTokens,
        temperature: 0.4,
        timeoutMs,
      },
      (entry) => { used = entry; }
    );
    return {
      ok: true,
      content: result.content,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - started,
      usage: result.usage,
    };
  } catch (err) {
    const kind = err instanceof ProviderError ? err.kind : 'provider_unavailable';
    if (meta.log) meta.log({ event: 'provider failure', kind, provider: used && used.provider, error: err.message });
    return fail(kind, err.message);
  }
}

module.exports = { handlePaperclipRequest };