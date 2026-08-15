# 07 — Dev Log

Append new entries at the top. One entry per work session.

---

## 2026-08-15 — Homepage dashboard + single-page LessonWorkspace refactor

**Context.** After Paperclip and local-provider work, the user asked for the
lesson and code to live on the same page and for the homepage to reflect what
the learner is actually doing instead of showing placeholders.

**What changed.** `app/lesson.html` is now one continuous workspace: left
column contains lesson explanation, examples, video, assignment and
Paperclip; right column contains `main.py`, Run/Submit/Hint/Solution and
Output/Tests/Hints. The old separate practice-screen path is no longer the
primary flow. Passing an assignment opens a Win95 completion dialog with XP,
Review, Knowledge Check and Next Lesson actions. The split defaults to 50/50,
persists as a percentage and clamps 35-70%; narrow screens use Lesson/Code
tabs while keeping the editor DOM alive.

`index.html` was turned into a real dashboard. `app/js/home.js` fetches
`track.json`, reads local progress through `ProgressStore`, and renders the
actual active lesson, draft preview, XP, streak, completed lesson count,
current chapter quest, recent lesson activity and quick links. No fake
lesson titles or fake XP/streak values remain.

`ProgressStore` now records draft presence, attempts, last opened lesson,
opened/completed timestamps, XP, streak and completion. `lesson-loader.js`
calls `ProgressStore.touchLesson()` on boot so the homepage can resume the
real current lesson.

**Resolved old gaps.** `nextLessonId` is now wired through the completion
dialog; all `examples[]` render; all `checks[]` render one at a time in the
quiz screen; the published track now includes lessons across chapters 1-15.

**Verified working:** `npm run test:browser`, `npm run test:paperclip`, plus
real-browser Playwright checks in Brave and Firefox for the homepage dashboard
and LessonWorkspace desktop/mobile behavior.

---

## 2026-08-15 — Full rebuild on the blueprint (Milestones 1–4)

**Context.** Repo previously held a flat prototype (`index.html`,
`library.html`, `quests.html`, `track-python-crash-course.html`,
`css/style.css` — CodeMirror + Pyodide, quests hardcoded in JS). Session
started by gutting all five files to blank Win98-less skeletons (kept nav
shell, stripped content) at the user's request, uncommitted.

User then supplied a product blueprint archive
(`~/Downloads/codeforge-blueprint.zip`) containing `docs/` (product
vision, IA, UI system, content model, execution/grading design, copyright
boundaries, roadmap), a working static prototype (`prototype/index.html`
+ `app.js` + `styles.css` — a single hardcoded While-Loops lesson matching
the supplied Win98-CD-ROM reference screenshot), and seed `content/`
JSON (`track.json` + one `.lesson.json`). Asked to rebuild the repo on
top of it. Given the blueprint's own roadmap goes further than the
prototype (JSON-driven loader, worker-based execution), asked the user to
pick a scope; they chose **Full roadmap slice (Milestones 1–4)** over
"ship the prototype as-is" or "prototype + loader only".

**What was built.** Full breakdown in [02-Architecture.md](02-
Architecture.md) through [06-Content.md](06-Content.md). Short version:
split the prototype's single CSS file into `win98.css` (reusable chrome,
generalized for reuse across pages) / `layout.css` (lesson grid) /
`editor.css` (editor+console+quiz) / `site.css` (new — for the marketing
pages, which didn't exist as Win98 shells in the prototype). Turned the
prototype's hardcoded lesson markup + `app.js` into a generic
`lesson-loader.js` driven by `content/*.json`, with `grading.js` and
`runner-client.js` split out so requirement-checking, execution, and
rendering aren't one file. Moved Pyodide off the main thread into
`pyodide-worker.js`. Restyled `index.html`/`library.html`/`quests.html` to
the Win98 shell (`site.css`) instead of the old dark/cyberpunk theme.
Deleted the superseded `track-python-crash-course.html` and
`css/style.css`. Copied the blueprint's `docs/` and reference screenshot
into the repo for future reference; added a root `README.md`.

**Bugs found during in-browser testing (claude-in-chrome), fixed before
commit:**

1. **Execution timeout fired before Pyodide finished downloading.** First
   Run/Submit always failed with "Execution timed out" — the flat 8s
   timeout was racing Pyodide's CDN download, not the learner's code. Root
   cause: no distinction between "runtime still loading" and "runtime
   stuck." Fixed by adding a `warmup` message type to the worker, a
   `pyodideReady` flag in `runner-client.js`, and a 30s cold-start
   allowance that only applies until the runtime confirms ready — see
   [05-Execution.md](05-Execution.md). `lesson-loader.js` now calls
   `RunnerClient.warmup()` at the end of `init()` so the download starts
   while the learner is still reading, not when they first click Run.
2. **Nested `<a>` inside `.track-card`** in `quests.html` — the outer
   `<a class="track-card">` wrapped an inner `<a href="...github...">`,
   which is invalid HTML5; Chrome's parser auto-closed the outer anchor
   early, visually splitting the card in two. Fixed by moving the GitHub
   link out of the card into its own paragraph below.
3. **`.quiz-pane` had no `overflow` rule** — a longer quiz question plus
   feedback text could overflow past its fixed-height grid row into the
   status bar. Added `overflow:auto`.

**Verified working:** lesson loads and renders from JSON; editor accepts
input and persists drafts across reload; Submit runs the real Python test
harness in the worker and reports per-check PASS/FAIL; completing the
assignment awards +50 XP exactly once and persists across reload
(`ProgressStore.markComplete` idempotency confirmed by reloading after a
pass); quiz grades correctly against `correctIndex`; nav is consistent
across all four pages; no console errors.

**Committed** as `30fd48a` — *"Rebuild Code Forge as a Win98-shell,
data-driven lesson platform"*. Not pushed to `origin` yet (user asked to
keep it local for now). Local server for manual testing:
`python3 -m http.server 8934` from repo root.

**Known gaps at that time** (these are preserved for historical context; the
2026-08-15 dashboard/LessonWorkspace entry above resolves several of them):
- No "Next Lesson" navigation UI — `nextLessonId` exists in the lesson
  schema but nothing reads it.
- Only `examples[0]` and `checks[0]` are ever rendered, even though both
  are arrays in the schema — fine while there's one lesson with one of
  each, will need loader changes if a lesson wants two examples or two
  checks.
- `hintIndex` in `lesson-loader.js` is a module-level variable, not
  per-lesson state — doesn't matter yet with one lesson, will need to move
  into `ProgressStore` once there's lesson-switching without a full reload.
- Chapters 1–6, 8–14 are inert placeholders in the tree (no `lessons[]`
  in `track.json`) — next real content work is picking the next chapter
  to build.
