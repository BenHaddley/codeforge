// Paperclip server configuration, read from environment variables.
// Never hard-code provider credentials here — see .env.example at the
// repo root. The browser never sees these values; only this server does.
'use strict';

function envStr(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}
function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

const config = {
  host: envStr('HOST', '127.0.0.1'),
  port: envInt('PORT', 8787),

  paperclip: {
    // Primary provider. Built-in adapters: "opencode" (OpenCode Zen),
    // "groq", "mock" (deterministic, for development/tests).
    provider: envStr('PAPERCLIP_PROVIDER', 'opencode'),
    model: envStr('PAPERCLIP_MODEL', 'deepseek-v4-flash-free'),

    // Optional second provider tried only when the primary fails.
    fallbackProvider: envStr('PAPERCLIP_FALLBACK_PROVIDER', ''),
    fallbackModel: envStr('PAPERCLIP_FALLBACK_MODEL', ''),

    apiKey: envStr('PAPERCLIP_API_KEY', envStr('OPENCODE_API_KEY', '')),

    opencodeBaseUrl: envStr('PAPERCLIP_OPENCODE_BASE_URL', 'https://opencode.ai/zen/v1'),
    groqBaseUrl: envStr('PAPERCLIP_GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
    groqModel: envStr('PAPERCLIP_GROQ_MODEL', 'llama-3.3-70b-versatile'),
    groqApiKey: envStr('PAPERCLIP_GROQ_API_KEY', ''),

    // Local inference (Ollama / LM Studio / llama.cpp / vLLM) via their
    // OpenAI-compatible endpoints. No API key required.
    localBaseUrl: envStr('PAPERCLIP_LOCAL_BASE_URL', 'http://127.0.0.1:11434/v1'),
    localModel: envStr('PAPERCLIP_LOCAL_MODEL', 'qwen2.5-coder:14b'),

    timeoutMs: envInt('PAPERCLIP_TIMEOUT_MS', 30000),
    maxOutputTokens: envInt('PAPERCLIP_MAX_OUTPUT_TOKENS', 600),
    maxMessageLength: envInt('PAPERCLIP_MAX_MESSAGE_LENGTH', 2000),
    maxContextBytes: envInt('PAPERCLIP_MAX_CONTEXT_BYTES', 60000),
    maxHistoryMessages: envInt('PAPERCLIP_MAX_HISTORY_MESSAGES', 8),

    // Per-IP sliding-window request limit for this shared free API.
    rateLimitWindowMs: envInt('PAPERCLIP_RATE_LIMIT_WINDOW_MS', 60000),
    rateLimitMax: envInt('PAPERCLIP_RATE_LIMIT_MAX', 12),
  },
};

module.exports = config;