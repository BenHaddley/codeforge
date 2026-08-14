# 05 — Execution & Grading

Three files: `pyodide-worker.js` (runs in the worker), `runner-client.js`
(main-thread manager), `grading.js` (turns a run into a pass/fail verdict).
Follows `docs/07-code-execution-and-grading.md`.

## Why a Web Worker at all

Pyodide executes arbitrary learner Python synchronously. An accidental
`while True: pass` in the assignment would freeze the tab forever if run
on the main thread. Running it in a Worker means the UI thread stays
responsive even while learner code is stuck — and the main thread can
`terminate()` the worker to actually stop it (there's no way to interrupt
a runaway synchronous WASM loop otherwise).

## `pyodide-worker.js`

- `importScripts()`s Pyodide from jsDelivr CDN (`v0.26.4`) — this only
  works in a *classic* worker, not a module worker, which is why
  `runner-client.js` constructs it as `new Worker('js/pyodide-worker.js')`
  with no `{type:'module'}`.
- `getPyodide()` memoizes the `loadPyodide()` promise so the runtime only
  downloads/initializes once per worker instance.
- `onmessage` handles two message shapes:
  - `{type:'warmup'}` — just loads Pyodide and replies `{ready:true}`.
    Failures are swallowed silently (a later real run will just retry).
  - `{id, code}` — runs `code` via `runPythonAsync`, capturing stdout/
    stderr through `setStdout`/`setStderr` batched callbacks into one
    `output` string, replies `{id, ok, output}` (or `ok:false` +
    `err.toString()` appended on exception).

## `runner-client.js` — the warmup/timeout design

This is the piece that got fixed mid-build (see
[07-DevLog.md](07-DevLog.md) for the bug). The problem: Pyodide's *first*
load downloads its WASM runtime from the CDN, which can take much longer
than any reasonable per-execution timeout — a naive "kill after 8s" policy
kills the download before the runtime is even ready, so the very first
Run/Submit always fails.

The fix is a `pyodideReady` flag plus two timeout tiers:

```js
const COLD_START_TIMEOUT_MS = 30000;
const effectiveTimeout = pyodideReady ? timeoutMs : Math.max(timeoutMs, COLD_START_TIMEOUT_MS);
```

- `warmup()` fires once from `lesson-loader.js`'s `init()`, right after
  all buttons are wired — starts the Pyodide download in the background
  while the learner is still reading the lesson pane.
- Any message from the worker (a `ready` reply *or* a normal execution
  reply) flips `pyodideReady = true` — so even if warmup is still racing
  when the learner clicks Run, that Run's own successful completion marks
  the runtime ready for next time.
- `run(code, {timeoutMs})` picks the 30s allowance until the runtime is
  confirmed ready, then drops to the caller's real `timeoutMs` (the
  assignment's `timeoutMs`, default 8000) once it is — so a *stuck loop*
  after the runtime has loaded still gets killed quickly.
- On timeout: `respawn()` terminates the worker, resets `pyodideReady =
  false`, and constructs a fresh one. The next Run will cold-start again
  (by design — the old worker might be wedged inside WASM in a state
  that's not safely reusable).

`RunnerClient` is a page-level singleton (IIFE, one worker for the whole
`lesson.html` load) — it is not re-created per lesson, only per timeout/
respawn.

## `grading.js` — turning a run into PASS/FAIL

`Grading.submit(code, assignment)` does two independent checks and ANDs
them:

1. **Static requirement checks** — `assignment.requirementChecks[]`, each
   `{id, label, pattern, mustMatch}`. Regex-tested against the learner's
   code with `#.*$` comments stripped first (so `# use a while loop` in a
   comment can't satisfy a `mustMatch:true` check, and mentioning `for` in
   a comment can't fail a `mustMatch:false` check).
2. **Behavioral check** — appends `assignment.testHarness` (raw Python,
   authored in the content JSON) to the learner's code and runs it for
   real via `RunnerClient.run()`. The harness prints a
   `__CF_TEST_OUTPUT__` marker followed by `repr()` of captured stdout;
   `extractCapturedOutput()` finds that marker in the worker's output and
   `Function('return ' + tail)()` evaluates the Python `repr()` string
   back into a JS string (safe here because the input is our own harness
   output, not learner-controlled). Compared against
   `assignment.expectedOutput`.

`passed = runResult.ok && every(requirementResults) && outputPassed`. The
UI in `lesson-loader.js` renders one `[PASS]`/`[FAIL]` line per
requirement plus one for the output check plus one for "executes without
exception" — four lines for the current lesson, matching the original
prototype's test-results format.

## Limitation, by design

Since this is a static site, nothing here is actually secret — the
harness and expected output ship in a JSON file the browser downloads.
Fine for a self-directed learning tool (see `docs/07-code-execution-and-
grading.md`'s "client-side test limitation" section); would need to move
to a server-side runner before this could support competitive/graded use.
