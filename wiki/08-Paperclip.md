# 08 — Paperclip: the embedded AI tutor

Paperclip is a docked, Win98-styled tutor panel at the bottom of the lesson
workspace (`app/lesson.html`). One text input. It already knows the lesson,
the assignment, the code in the editor, the latest run/submit result, the
test summary and whether the assignment passed — the learner never pastes
code or error text.

## Client (app/js/paperclip/)

| File | Job |
| ---- | --- |
| `state.js` | per-lesson conversation in localStorage, assistance level 0–4, editor code hashes, latest run result |
| `context.js` | builds the normalized context payload from the live lesson + editor DOM |
| `api.js` | `POST /api/paperclip`; no credentials live in the browser |
| `ui.js` | panel rendering: conversation, single input, thinking/error states, collapse |
| `client.js` | orchestration: send flow, 3 s cooldown, debug logging, exposes `Paperclip.init` / `Paperclip.recordRun` |

`lesson-loader.js` calls `Paperclip.init(track, chapter, lesson)` at boot
and `Paperclip.recordRun(result)` after every Run/Submit (results tagged
`source: 'run'` or `'submit'`).

## Server (server/)

Zero-dependency Node (18+) server that serves the static site **and** the
API, so `python3 -m http.server` still works for a no-AI static demo.

| File | Job |
| ---- | --- |
| `server.js` | static file server + `POST /api/paperclip` route |
| `paperclip/config.js` | env configuration |
| `paperclip/prompt.js` | the SYSTEM POLICY (tutor behaviour) + context templating |
| `paperclip/provider.js` | provider interface; adapters: opencode, groq, mock; fallback chain |
| `paperclip/api.js` | validation, rate limiting, friendly error mapping |
| `paperclip/rate-limit.js` | per-IP sliding window |
| `paperclip/self-test.js` | offline test suite (`npm test:paperclip`) |

## Request flow

```text
input text
  → client.send()            (cooldown check, busy guard)
  → PaperclipContext.build() (lesson/assignment/code/run/tests/complete/level/history)
  → PaperclipApi.fetch('/api/paperclip')
  → server api.js            (validate, rate-limit, size caps)
  → prompt.js buildMessages  (SYSTEM_POLICY + history + CONTEXT block + student message)
  → provider chain           (primary → fallback → friendly error)
  → response appended to conversation + localStorage
```

## Safety rules implemented

- Hidden material (`solutionCode`, `testHarness`, `expectedOutput`) never
  enters the context or the prompt (verified by tests).
- The LLM never grades: only `grading.js` + Pyodide decide completion/XP.
- Student code arrives as delimited data; the policy overrides any
  instruction inside it.
- Keys live only in server env vars; `.env.example` is committed, `.env`
  is not.

## Debugging

Open the lesson page with `?paperclipDebug=1` to get `[PAPERCLIP]` console
lines (provider, model, latency, context size, editor version, execution
status, assignment status) and a provider/model footer in the panel.