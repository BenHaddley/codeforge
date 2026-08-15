// Provider abstraction for Paperclip. Everything upstream (api.js,
// prompt.js) talks to providers through the same interface, so the hosted
// model can be swapped via environment variables without touching the
// tutor logic. See .env.example for configuration.
//
// interface PaperclipProvider {
//   name: string
//   model: string
//   async chat({ messages, maxTokens, temperature, timeoutMs })
//     -> { content, usage }            on success
//     -> throws ProviderError(kind)    on failure
// }
//
// Error kinds: 'invalid_key' | 'rate_limited' | 'provider_unavailable'
//              | 'timeout' | 'malformed' | 'empty'
'use strict';

const config = require('./config');

class ProviderError extends Error {
  constructor(kind, message) {
    super(message || kind);
    this.kind = kind;
  }
}

// ---------------------------------------------------------------------------
// Shared OpenAI-compatible chat-completions client (OpenCode Zen and Groq
// both expose this shape). Zero dependencies: uses global fetch (Node 18+).
// ---------------------------------------------------------------------------
async function openAiCompatibleChat({ baseUrl, apiKey, model, messages, maxTokens, temperature, timeoutMs }) {
  const endpoint = baseUrl.replace(/\/+$/, '').endsWith('/chat/completions')
    ? baseUrl.replace(/\/+$/, '')
    : `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new ProviderError('timeout', 'provider request timed out');
    throw new ProviderError('provider_unavailable', `network error: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403) {
    throw new ProviderError('invalid_key', `provider rejected the API key (HTTP ${res.status})`);
  }
  if (res.status === 429) {
    throw new ProviderError('rate_limited', `provider rate limit reached (HTTP 429)`);
  }
  if (!res.ok) {
    throw new ProviderError('provider_unavailable', `provider error (HTTP ${res.status})`);
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new ProviderError('malformed', 'provider returned non-JSON response');
  }

  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new ProviderError('empty', 'provider returned an empty response');
  }
  return { content: content.trim(), usage: data.usage || null };
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

class OpenCodeProvider {
  constructor(cfg) {
    this.name = 'opencode';
    this.model = cfg.model;
    this.baseUrl = cfg.opencodeBaseUrl;
    this.apiKey = cfg.apiKey;
  }
  async chat({ messages, maxTokens, temperature, timeoutMs }) {
    return openAiCompatibleChat({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      model: this.model,
      messages,
      maxTokens,
      temperature,
      timeoutMs,
    });
  }
}

class GroqProvider {
  constructor(cfg) {
    this.name = 'groq';
    this.model = cfg.groqModel;
    this.baseUrl = cfg.groqBaseUrl;
    this.apiKey = cfg.groqApiKey;
  }
  async chat({ messages, maxTokens, temperature, timeoutMs }) {
    return openAiCompatibleChat({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      model: this.model,
      messages,
      maxTokens,
      temperature,
      timeoutMs,
    });
  }
}

// Local inference via Ollama / LM Studio / llama.cpp / vLLM. All expose an
// OpenAI-compatible chat completions endpoint, so the same client works;
// local servers typically ignore the Authorization header.
class LocalProvider {
  constructor(cfg) {
    this.name = 'local';
    this.model = cfg.localModel;
    this.baseUrl = cfg.localBaseUrl;
  }
  async chat({ messages, maxTokens, temperature, timeoutMs }) {
    return openAiCompatibleChat({
      baseUrl: this.baseUrl,
      apiKey: 'local',
      model: this.model,
      messages,
      maxTokens,
      temperature,
      timeoutMs,
    });
  }
}

// Deterministic stand-in used for development and tests: no network, no
// key. It summarises the workspace context it received so a developer can
// verify that lesson/code/run state is actually reaching the tutor, then
// appends a canned hint. With PAPERCLIP_MOCK_FAILURE=1 it fails like an
// unavailable provider so error paths can be exercised.
class MockProvider {
  constructor(cfg) {
    this.name = 'mock';
    this.model = cfg.model || 'mock-tutor';
    this.fail = envFlag('PAPERCLIP_MOCK_FAILURE');
  }
  async chat({ messages }) {
    if (this.fail) {
      throw new ProviderError('provider_unavailable', 'mock provider configured to fail');
    }
    // The final user message carries the full context block + student
    // message; earlier user messages are conversation history.
    const last = messages.filter((m) => m.role === 'user').slice(-1)[0] || { content: '' };
    const studentIdx = last.content.indexOf('STUDENT MESSAGE');
    const contextText = studentIdx >= 0 ? last.content.slice(0, studentIdx) : last.content;
    const student = studentIdx >= 0 ? last.content.slice(studentIdx + 'STUDENT MESSAGE'.length).trim() : last.content;
    const summary = extractSummary(contextText);
    return {
      content:
        `[mock] Context received:\n` +
        `- lesson: ${summary.lesson}\n` +
        `- assignment complete: ${summary.complete}\n` +
        `- last run: ${summary.run}\n` +
        `- editor version: ${summary.version}\n\n` +
        `A real model would answer: "${student.slice(0, 120)}" — for example, check what changes inside the loop each pass.`,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }
}

function envFlag(name) {
  return ['1', 'true', 'yes'].includes(String(process.env[name] || '').toLowerCase());
}

function extractSummary(contextText) {
  const pick = (label) => {
    const m = contextText.match(new RegExp(`${label}\\s*:\\s*(.+)`));
    return m ? m[1].slice(0, 80) : '—';
  };
  return {
    lesson: pick('LESSON'),
    complete: pick('ASSIGNMENT STATUS'),
    run: pick('LAST EXECUTION'),
    version: pick('EDITOR VERSION'),
  };
}

// ---------------------------------------------------------------------------
// Factory + fallback chain
// ---------------------------------------------------------------------------

function buildProvider(name, cfg) {
  switch (name) {
    case 'opencode':
      return new OpenCodeProvider(cfg);
    case 'groq':
      return new GroqProvider(cfg);
    case 'local':
      return new LocalProvider(cfg);
    case 'mock':
      return new MockProvider(cfg);
    default:
      return null;
  }
}

function buildChain(cfg) {
  const chain = [];
  const primary = buildProvider(cfg.provider, cfg);
  if (primary) chain.push(primary);
  if (cfg.fallbackProvider) {
    const fallback = buildProvider(cfg.fallbackProvider, cfg);
    if (fallback) {
      if (cfg.fallbackModel) fallback.model = cfg.fallbackModel;
      chain.push(fallback);
    }
  }
  return chain;
}

// Try each provider in order. Returns the first successful response or the
// last error. Never retries the same provider repeatedly.
async function chatWithChain(chain, request, log) {
  let lastError = null;
  for (const provider of chain) {
    const started = Date.now();
    try {
      const result = await provider.chat(request);
      if (log) log({ provider: provider.name, model: provider.model, latencyMs: Date.now() - started });
      return { ...result, provider: provider.name, model: provider.model };
    } catch (err) {
      lastError = err instanceof ProviderError ? err : new ProviderError('provider_unavailable', String(err && err.message || err));
      if (log) log({ provider: provider.name, model: provider.model, errorKind: lastError.kind, latencyMs: Date.now() - started });
    }
  }
  throw lastError || new ProviderError('provider_unavailable', 'no provider configured');
}

module.exports = { ProviderError, buildChain, chatWithChain };