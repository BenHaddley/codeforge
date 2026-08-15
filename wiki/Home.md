# Code Forge — Wiki

Implementation reference for the code actually written in this repo. For the
product plan / pedagogy / roadmap this code was built from, see `docs/`
(imported from the blueprint archive) — this wiki instead documents **how
the code works**, file by file, so future sessions don't have to re-derive
it by reading every source file.

## Pages

1. [Overview](01-Overview.md) — what's built, in one page
2. [Architecture](02-Architecture.md) — full file map and how the pieces connect
3. [UI Shell](03-UIShell.md) — the Win98 CSS design system
4. [Lesson Player](04-LessonPlayer.md) — how `lesson.html` renders a lesson from JSON
5. [Execution & Grading](05-Execution.md) — the Pyodide worker, timeout/warmup, test harness
6. [Content Format](06-Content.md) — `track.json` / `*.lesson.json` schema, how to add a lesson
7. [Dev Log](07-DevLog.md) — session-by-session record of what changed and why
8. [Paperclip](08-Paperclip.md) — the embedded AI tutor, server-side provider abstraction
9. [Text-to-Speech](09-TextToSpeech.md) — the Listen button, fully client-side via Kokoro (WASM), no server

## Quick facts

- No build step for the frontend. The Node server is only needed for
  Paperclip AI/provider routes; static hosting still serves the UI.
- `index.html` is now a real progress dashboard: it loads `track.json`,
  `ProgressStore`, saved drafts, opened lessons, XP, streak and completion
  state. It is not placeholder marketing copy.
- `library.html` and `quests.html` still use the shared Win98 site shell.
- `app/lesson.html` is one merged LessonWorkspace: lesson/video/assignment/
  Paperclip on the left, IDE/output/tests on the right, with mobile tabs
  only below the responsive breakpoint.
- `content/python-fundamentals/track.json` now references the published
  Python Fundamentals lesson set across chapters 1-15.
- Run locally with AI/server routes: `node server/server.js`, then open
  `http://localhost:8787/`. Static-only demos can use
  `python3 -m http.server`, but Paperclip will be unavailable.
