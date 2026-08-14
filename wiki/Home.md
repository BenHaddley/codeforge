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

## Quick facts

- No build step, no dependencies to install. Static HTML/CSS/JS.
- Marketing pages (`index.html`, `library.html`, `quests.html`) + the app
  (`app/lesson.html`) share the same Win98 CSS shell but are otherwise
  independent — the marketing pages don't load any lesson JS.
- One lesson exists today: `python-fundamentals` → ch07 → *While Loops*.
- Run locally: `python3 -m http.server 8934` from the repo root, then open
  `http://localhost:8934/`. `app/lesson.html` needs the server (it `fetch`es
  JSON, which `file://` blocks); the marketing pages don't.
