# 01 — Overview

Code Forge is a desktop-software-styled coding-lesson site. It was rebuilt
from scratch on 2026-08-15 on top of a product blueprint (`docs/`), replacing
an earlier flat-HTML prototype. The frontend has no build step; the optional
Node server adds Paperclip AI and API routes.

## What exists right now

- **Homepage progress dashboard** (`index.html`) — a Win98 app window that
  loads `content/python-fundamentals/track.json` plus localStorage progress
  through `app/js/home.js` and `ProgressStore`. It shows the actual active
  lesson, draft preview, XP, streak, completed lessons, current chapter
  quest, recent lesson activity and targeted quick links.
- **Site shell pages** (`library.html`, `quests.html`) — Win98-styled pages
  sharing `win98.css`/`site.css` and generic chrome from `app/js/app.js`.
- **One generic LessonWorkspace** (`app/lesson.html`) that renders *any*
  lesson matching the JSON shape in `content/`, driven by
  `app/js/lesson-loader.js`.
- **Published Python Fundamentals content** across chapters 1-15 in
  `content/python-fundamentals/track.json` and per-lesson JSON files. The
  lesson player fetches these files rather than hardcoding lesson prose.
- **Merged lesson/code flow**: lesson explanation, examples, video,
  assignment and Paperclip scroll on the left; the IDE, Run/Submit/Hint/
  Solution buttons and Output/Tests/Hints panes stay visible on the right.
- **Real Python execution** in a Web Worker via
  [Pyodide](https://pyodide.org), loaded from a CDN, with a
  warmup/timeout scheme so a learner's infinite loop can't hang the tab.
- **LocalStorage progress**: editor drafts, notes, attempts, last opened
  lesson, XP, streak, completion and completed timestamps are saved
  per-lesson (`app/js/progress-store.js`). No accounts or cloud sync yet.
- **Paperclip AI tutor**: an embedded Win95 pane in the lesson column that
  knows the current lesson, editor code, latest run/submit result and safe
  test summary without exposing hidden grading material.

## What's *not* built yet

Achievements/character-sheet profile, search, accounts/cloud sync,
multi-language execution and server-side grading are not built. The content
model (`content/`) is designed so adding lessons means adding JSON files and
track entries, not new HTML pages or new lesson-player code — see
[06-Content.md](06-Content.md).

## Design constraint worth remembering

`docs/12-copyright-source-boundaries.md` is a hard rule, not a suggestion:
no book/video prose gets copied into lesson content. Companion tracks
(currently *Python Crash Course*) get chapter/creator citations and
Code Forge's own original text, examples, and tests. TTS
(`app/js/tts.js`) only ever reads that original text back.
