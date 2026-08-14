# Code Forge

A desktop-software-styled coding school: every lesson stays in one workspace —
read, listen, watch a focused clip, predict, then write and run real code
against real tests. See [docs/01-product-vision.md](docs/01-product-vision.md)
for the full pitch.

## Run it locally

No build step. Serve the repo root with any static server and open it:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

Opening `index.html` directly via `file://` also works, except the lesson
workspace (`app/lesson.html`) fetches its content as JSON, which most
browsers block over `file://` — use a local server for that page.

`Run` and `Submit` in the lesson workspace load [Pyodide](https://pyodide.org)
from a CDN into a Web Worker, so those require internet access.

## Structure

```text
index.html, library.html, quests.html   marketing/nav pages (Win98 shell)
app/lesson.html                          the generic lesson player
app/js/                                  shell + lesson-player logic
app/css/                                 win98.css (chrome) / layout.css (grid) / editor.css / site.css
content/python-fundamentals/             track.json + per-lesson JSON — the actual curriculum data
docs/                                    product/design/architecture docs and the UI reference image
```

Content is data, not hardcoded HTML — `app/js/lesson-loader.js` renders any
lesson matching the JSON shape in `content/`. See
[docs/06-content-model.md](docs/06-content-model.md) and
[docs/14-current-repo-migration.md](docs/14-current-repo-migration.md).

## Current state

- Milestone 1 (classic UI shell) and Milestone 2 (data-driven lesson player)
  are built.
- Milestone 3 (execution worker) is built: Pyodide runs in a Web Worker
  (`app/js/pyodide-worker.js` + `runner-client.js`) with a timeout that
  kills and respawns the worker so a learner's infinite loop can't freeze
  the page.
- Milestone 4 (While Loops vertical slice) is the one lesson currently in
  `content/`: `python-fundamentals` → Chapter 7 → While Loops.
- See [docs/13-roadmap.md](docs/13-roadmap.md) for what's next (more
  chapters, progress/achievements, accounts, multi-language execution).

## Content rule

Code Forge does not copy textbook or video prose — companion tracks cite
the chapter/creator and write original explanations, examples and tests.
See [docs/12-copyright-source-boundaries.md](docs/12-copyright-source-boundaries.md).
