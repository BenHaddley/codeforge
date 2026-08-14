# 01 — Overview

Code Forge is a static, desktop-software-styled coding-lesson site. It was
rebuilt from scratch in one session on 2026-08-15 on top of a product
blueprint (`docs/`), replacing an earlier flat-HTML prototype.

## What exists right now

- **Three marketing pages** (`index.html`, `library.html`, `quests.html`) —
  a single Win98 "app window" per page, static content, no JS beyond clock
  and menu/window-control placeholders (`app/js/app.js`).
- **One generic lesson player** (`app/lesson.html`) that renders *any*
  lesson matching the JSON shape in `content/`, driven by
  `app/js/lesson-loader.js`.
- **One real lesson**: `content/python-fundamentals/` → chapter 7 → *While
  Loops* — explanation, worked example, embedded YouTube clip, one
  multiple-choice check, an assignment (`forge_countdown`), a hint ladder,
  a solution reveal, and real grading via Pyodide.
- **Real Python execution** in a Web Worker via
  [Pyodide](https://pyodide.org), loaded from a CDN, with a
  warmup/timeout scheme so a learner's infinite loop can't hang the tab.
- **LocalStorage progress**: editor draft, notes, XP, and completion are
  saved per-lesson (`app/js/progress-store.js`). No backend, no accounts.

## What's *not* built yet

Everything past Milestone 4 in `docs/13-roadmap.md`: more chapters,
achievements/character-sheet profile, search, accounts/cloud sync,
multi-language execution, server-side grading. The content model
(`content/`) is designed so adding chapters means adding JSON files, not
new HTML pages or new lesson-player code — see
[06-Content.md](06-Content.md).

## Design constraint worth remembering

`docs/12-copyright-source-boundaries.md` is a hard rule, not a suggestion:
no book/video prose gets copied into lesson content. Companion tracks
(currently *Python Crash Course*) get chapter/creator citations and
Code Forge's own original text, examples, and tests. TTS
(`app/js/tts.js`) only ever reads that original text back.
