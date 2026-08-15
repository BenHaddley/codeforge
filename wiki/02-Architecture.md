# 02 — Architecture

## File map

```text
codeforge/
├── index.html                              Win98 homepage progress dashboard
├── library.html, quests.html               Site shell pages
│
├── app/
│   ├── lesson.html                         Generic LessonWorkspace shell (empty containers, filled by JS)
│   ├── css/
│   │   ├── win98.css                       Chrome: titlebar/menubar/toolbar/pane/tree/dialog/statusbar
│   │   ├── site.css                        Shared site-page layout
│   │   ├── home.css                        Homepage dashboard panels/lists/progress widgets
│   │   ├── layout.css                      LessonWorkspace split pane + responsive tabs
│   │   ├── editor.css                      Code editor, console/output tabs
│   │   ├── screens.css                     Internal quiz/results screens
│   │   ├── paperclip.css                   Embedded tutor pane
│   │   ├── video-player.css                Win95 YouTube player chrome
│   │   └── win98-window.css                Floating popup window chrome
│   └── js/
│       ├── app.js                          Generic chrome: clock, menu/window-control click feedback
│       ├── home.js                         Homepage renderer: track.json + ProgressStore state
│       ├── progress-store.js               localStorage wrapper: drafts/attempts/XP/streak/completion/current lesson
│       ├── course-drawer.js                Slide-in course navigator for lesson.html
│       ├── panel-resizer.js                Draggable lesson/code split, persisted as a percent
│       ├── tts.js                          Listen button + client-side Kokoro warmup
│       ├── youtube-player.js               Renders a lesson's YouTube clip with Win95 controls
│       ├── win98-window.js                 Floating Win98 popup windows (stdin prompt)
│       ├── pyodide-worker.js               Web Worker: loads Pyodide, executes code, captures stdout/stderr
│       ├── runner-client.js                Main-thread worker manager: warmup, timeout, kill-and-respawn
│       ├── grading.js                      Turns an assignment's requirementChecks/testHarness into a verdict
│       ├── paperclip/                      Paperclip client: state/context/api/ui/client
│       └── lesson-loader.js                Fetches track.json + lesson.json, renders workspace, wires buttons
│
├── content/
│   └── python-fundamentals/
│       ├── track.json                      Chapter list + which chapters have lessons and where
│       └── ch*/                            Per-lesson JSON files for the published track
│
├── server/                                  Zero-dependency Node static server + Paperclip API
│
├── docs/                                    Imported product blueprint (vision/IA/roadmap/etc.) — planning, not code
├── wiki/                                    This wiki — how the code works
└── README.md
```

## How a page boots

**Homepage** (`index.html`): loads `win98.css`, `site.css`, `home.css`, then
`progress-store.js`, `home.js`, and `app.js`. `home.js` fetches
`content/python-fundamentals/track.json`, flattens the lessons, reads
per-lesson localStorage state through `ProgressStore`, chooses the active
lesson, and fills the dashboard panels. The homepage is stateful UI, not a
placeholder marketing page.

**Site shell pages** (`library.html`, `quests.html`): load the shared Win98
site CSS and `app.js`; these remain mostly static navigation/document pages.

**`app/lesson.html`**: loads the Win98 shell CSS, lesson layout/editor/video/
Paperclip CSS, then scripts in dependency order. `lesson-loader.js` runs
immediately on load (no DOMContentLoaded wrapper — the `<script>` tags sit at
the end of `<body>`, so the DOM already exists):

```text
progress-store.js     → no dependencies
tts.js                → no dependencies
youtube-player.js     → no dependencies
course-drawer.js      → no dependencies
panel-resizer.js      → attaches the lesson/code divider
win98-window.js       → floating stdin prompt windows
runner-client.js      → spawns the Pyodide worker immediately
grading.js            → depends on RunnerClient
paperclip/*.js        → state/context/api/ui/client for the tutor
lesson-loader.js      → depends on all of the above; does the actual work
app.js                → generic chrome, loaded last, independent of lesson state
```

`lesson-loader.js` reads `?lesson=<id>` from the URL (defaults to
`py-ch01-what-is-python`), fetches `content/python-fundamentals/track.json`,
finds which chapter/lesson entry matches that id, fetches that lesson's
JSON, and renders it. See [04-LessonPlayer.md](04-LessonPlayer.md) for the
render pipeline and [05-Execution.md](05-Execution.md) for what happens
when Run/Submit is clicked.

## Why the CSS is split by purpose

`win98.css` holds only *reusable chrome* (nothing lesson-specific or
site-page-specific) so both page families can share it without pulling in
layout they don't need. `site.css` is shared by the non-lesson site pages;
`home.css` is only the dynamic dashboard; `layout.css`, `editor.css`,
`video-player.css` and `paperclip.css` are LessonWorkspace-specific. This
split is what `docs/05-ui-design-system.md` and
`docs/14-current-repo-migration.md` called for — future pages can reuse
`win98.css` without also inheriting the lesson split-pane layout.

## The content ≠ UI boundary

`lesson-loader.js` never hardcodes lesson text, and `grading.js` never
hardcodes an assignment's pass/fail rule — both are generic renderers
driven entirely by the JSON in `content/`. Adding chapter 8 means adding a
`content/python-fundamentals/ch08-.../*.lesson.json` file and a `lessons`
entry in `track.json`; it does not mean touching `app/js/`. See
[06-Content.md](06-Content.md).
