# 09 — Text-to-Speech

The Listen button on the lesson workspace (`app/js/tts.js`). Runs entirely
**client-side** — no backend, no API key, no server involvement at all.
This is deliberate, and the result of two dead ends — see the history
below before touching this file.

## Why fully client-side

1. **Browser `speechSynthesis` doesn't work here.** Diagnosed live:
   `speechSynthesis.getVoices()` returned zero voices on the dev machine
   (Chromium on Linux/Manjaro), even though the system's own
   `espeak-ng`/`speech-dispatcher` worked fine standalone (`spd-say`
   produced real audio). Chromium's Web Speech Synthesis implementation on
   Linux just doesn't reliably expose system voices — confirmed this
   wasn't fixable client-side.
2. **A server-proxied approach (the next attempt) conflicts with the
   hosting goal.** Built a full `/api/tts` proxy with pluggable providers
   (a local VoxCPM2 Python service, ElevenLabs cloud) — see git history /
   `wiki/07-DevLog.md` for that whole arc. It worked, but the site is
   meant to be host-able on GitHub Pages, which serves static files only
   and cannot run *any* server code — not a Node proxy, not a Python
   service, nothing. That rules out every server-based TTS approach
   equally, cloud or local. VoxCPM2 specifically added a second problem
   even for non-static hosting: it needs a persistent GPU process, which
   no free/cheap backend host provides.
3. **The fix: don't need a server at all.** [Kokoro](https://github.com/hexgrad/kokoro)
   is an 82M-parameter TTS model small enough to run *in the browser* via
   [Transformers.js](https://huggingface.co/docs/transformers.js) /
   ONNX Runtime Web (WASM). No backend, works identically on GitHub Pages
   or anywhere else, sidesteps the Linux/Chromium `speechSynthesis` gap
   entirely (it's not using that API at all).

Paperclip (the AI tutor) is a different story — it genuinely needs a
server to hold the LLM provider's API key, which can never be safely
exposed to the browser. That's an unavoidable backend dependency; see
[08-Paperclip.md](08-Paperclip.md). TTS has no equivalent constraint,
which is exactly why it could move client-side and Paperclip can't.

## How it works (`app/js/tts.js`)

Loads `kokoro-js` from a CDN (`https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js`)
via a dynamic `import()` — same "no build step, load from CDN" pattern
already used for Pyodide and the YouTube IFrame API. Model:
`onnx-community/Kokoro-82M-v1.0-ONNX`, `dtype: "q8"` (quantized — good
quality/size tradeoff), `device: "wasm"` (works everywhere; `"webgpu"`
would be faster but isn't universally supported and we've already been
burned once this build by assuming a browser capability that turned out
missing). Voice: `af_heart`, the top-graded voice in kokoro-js's list.

The architecture is otherwise **identical** to the server-proxied version
it replaced — same paragraph queue, same pre-fetch-next-while-current-
plays, same `<audio>` element driving pause/resume, same
`generation`-counter staleness guard, same `primeAudioEl()` autoplay-
gesture fix (see the comment in the file — Chrome only allows
`<audio>.play()` during/soon after a real user gesture, and synthesis is
async, so the gesture window would otherwise expire before playback
starts; calling `.play()` synchronously and swallowing its immediate
failure "spends" the gesture on that element so later async `.play()`
calls are allowed). Only `fetchAudio()`/the actual byte-source changed:
was `fetch('/api/tts', ...)`, is now
`(await loadModel()).generate(text, {voice}).then(raw => raw.toBlob())`.

`TTS.warmup(onProgress)` — called once from `lesson-loader.js`'s `init()`
— starts the model download in the background as soon as the lesson
loads, same pattern as `RunnerClient.warmup()` for Pyodide's cold start.
`onProgress` receives `kokoro-js`'s raw progress-callback objects;
`lesson-loader.js` shows `Downloading voice model... N%` in the status
bar when a numeric `.progress` field is present.

## Adding a different voice or model

Both are constants at the top of `tts.js` (`MODEL_ID`, `DTYPE`, `VOICE`).
Full voice list and quality grades: the kokoro-js README, or
`tts.list_voices()` at runtime. Don't add a voice-picker UI without being
asked — it's one constant to change by hand today, not a feature gap.
