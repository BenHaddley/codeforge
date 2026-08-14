# 02 — Architecture

## File map

```text
codeforge/
├── index.html, library.html, quests.html   Marketing pages (Win98 shell, static)
│
├── app/
│   ├── lesson.html                         Generic lesson player shell (empty containers, filled by JS)
│   ├── css/
│   │   ├── win98.css                       Chrome: titlebar/menubar/toolbar/pane/tree/dialog/statusbar
│   │   ├── layout.css                      Lesson-workspace grid (3-column desktop + mobile tab fallback)
│   │   ├── editor.css                      Code editor, console/output tabs, quiz pane
│   │   └── site.css                        Single-pane layout for the marketing pages
│   └── js/
│       ├── app.js                          Generic chrome: clock, menu/window-control click feedback
│       ├── progress-store.js               localStorage wrapper: draft/notes/XP/completion per lesson
│       ├── tts.js                          speechSynthesis wrapper for the Listen button
│       ├── video.js                        Renders a lesson's YouTube embed from its videos[] data
│       ├── pyodide-worker.js               Web Worker: loads Pyodide, executes code, captures stdout/stderr
│       ├── runner-client.js                Main-thread worker manager: warmup, timeout, kill-and-respawn
│       ├── grading.js                      Turns an assignment's requirementChecks/testHarness into a verdict
│       └── lesson-loader.js                Fetches track.json + lesson.json, renders every pane, wires buttons
│
├── content/
│   └── python-fundamentals/
│       ├── track.json                      Chapter list + which chapters have lessons and where
│       └── ch07-user-input-and-while-loops/
│           └── 02-while-loops.lesson.json  The one real lesson
│
├── docs/                                    Imported product blueprint (vision/IA/roadmap/etc.) — planning, not code
├── wiki/                                    This wiki — how the code works
└── README.md
```

## How a page boots

**Marketing pages** (`index.html` etc.): load `win98.css` + `site.css`,
then `app/js/app.js`. That's it — no content fetching, no lesson state.

**`app/lesson.html`**: loads `win98.css` + `layout.css` + `editor.css`,
then five scripts in dependency order, then `lesson-loader.js` which runs
immediately on load (no DOMContentLoaded wrapper — the `<script>` tags sit
at the end of `<body>`, so the DOM already exists):

```text
progress-store.js   →  no dependencies
tts.js               →  no dependencies
video.js              →  no dependencies
runner-client.js      →  no dependencies (spawns the worker immediately)
grading.js            →  depends on RunnerClient
lesson-loader.js       →  depends on all of the above; does the actual work
app.js                 →  generic chrome, loaded last, independent of lesson state
```

`lesson-loader.js` reads `?lesson=<id>` from the URL (defaults to
`py-ch07-while-loops`), fetches `content/python-fundamentals/track.json`,
finds which chapter/lesson entry matches that id, fetches that lesson's
JSON, and renders it. See [04-LessonPlayer.md](04-LessonPlayer.md) for the
render pipeline and [05-Execution.md](05-Execution.md) for what happens
when Run/Submit is clicked.

## Why the CSS is split four ways

`win98.css` holds only *reusable chrome* (nothing lesson-specific or
marketing-specific) so both page families can share it without pulling in
layout they don't need. `layout.css` and `editor.css` are lesson-workspace
only; `site.css` is marketing-page only. This split is what `docs/05-ui-
design-system.md` and `docs/14-current-repo-migration.md` called for —
the intent is that a future `app/playground.html` or `app/profile.html`
can reuse `win98.css` without also inheriting the 3-column lesson grid.

## The content ≠ UI boundary

`lesson-loader.js` never hardcodes lesson text, and `grading.js` never
hardcodes an assignment's pass/fail rule — both are generic renderers
driven entirely by the JSON in `content/`. Adding chapter 8 means adding a
`content/python-fundamentals/ch08-.../*.lesson.json` file and a `lessons`
entry in `track.json`; it does not mean touching `app/js/`. See
[06-Content.md](06-Content.md).
