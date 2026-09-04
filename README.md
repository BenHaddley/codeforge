# Code Forge

A desktop-software-styled coding school: every lesson stays in one workspace —
read, listen, watch a focused clip, predict, then write and run real code
against real tests. See [docs/01-product-vision.md](docs/01-product-vision.md)
for the full pitch.

## Run it locally

No build step. Two options:

**With the Paperclip AI tutor** (recommended — serves both the site and
`POST /api/paperclip`):

```bash
cp .env.example .env        # set PAPERCLIP_API_KEY (see below)
npm install
node server/server.js
# then open http://localhost:8787/
```

Node 18+ is required. The server uses a small WebSocket dependency for the
optional Ansible lab terminal.

**Static only** (no AI):

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

Opening `index.html` directly via `file://` also works, except the lesson
workspace (`app/lesson.html`) fetches its content as JSON, which most
browsers block over `file://` — use a local server for that page.

`Run` and `Submit` in the lesson workspace load [Pyodide](https://pyodide.org)
from a CDN into a Web Worker, so those require internet access. The Listen
button works the same way in either mode — it's fully client-side (no
server, no API key; see [wiki/09-TextToSpeech.md](wiki/09-TextToSpeech.md)),
so it also works on a plain static host like GitHub Pages. Only Paperclip
needs the Node server.

## Paperclip — the AI tutor

Paperclip is the embedded tutor docked at the bottom of the lesson
workspace. It automatically knows the current lesson, assignment, editor
code, latest run result, test summary and completion state — the learner
just types a question. It never grades: only the deterministic Pyodide
tests award XP or completion.

Configure the free model in `.env` (copy from `.env.example`):

```text
PAPERCLIP_PROVIDER=opencode
PAPERCLIP_MODEL=deepseek-v4-flash-free     # free OpenCode Zen tier
PAPERCLIP_API_KEY=...
```

Get a key at https://opencode.ai/auth. Keys live only on the server; the
browser never sees them. `PAPERCLIP_PROVIDER=mock` runs the whole tutor
flow offline with no key for development. Full design:
[docs/16-paperclip-ai-tutor.md](docs/16-paperclip-ai-tutor.md) and
[wiki/08-Paperclip.md](wiki/08-Paperclip.md).

```bash
npm run test:paperclip       # offline server self-test (no deps)
npm install                  # dev deps for the browser-flow test
npm run test:browser         # jsdom browser-flow test (mock provider, offline)
npm run content:validate     # validate lesson schemas, links, clips and checkpoints
# open /app/lesson.html?paperclipDebug=1 to inspect the exact context sent
```

## Ansible lab

Ansible lessons expose a Terminal tab backed by a disposable Docker lab:
one controller plus `web01`, `web02`, and `db01` on an internal network.

```bash
npm run lab:up       # build/start the lab
npm run dev          # serve Code Forge + the terminal WebSocket
npm run lab:down     # stop/remove lab containers
npm run lab:reset    # discard container state and rebuild
```

Files created in `labs/ansible/workspace/` persist on the host. The training
password in its inventory is deliberately trivial and safe only because target
SSH ports are never published. See [docs/17-ansible-lab.md](docs/17-ansible-lab.md).

The Ansible curriculum has two complementary routes: the complete book-aligned
track and a purpose-built 18-step LearnLinuxTV guided video course. Every guided
episode has original teaching material, caption-aligned checkpoints, prediction
and troubleshooting questions, a distinct assignment, and a terminal mission.
Core missions can verify inventory connectivity, package idempotence, and nginx
state against the disposable lab.

## Structure

```text
index.html, library.html, quests.html   marketing/nav pages (Win98 shell)
app/lesson.html                          the generic lesson player
app/js/                                  shell + lesson-player logic
app/js/paperclip/                        Paperclip client (context, state, ui, api, client)
app/css/                                 win98.css (chrome) / layout.css (grid) / editor.css / site.css / paperclip.css
server/                                  zero-dependency Node server: static files + /api/paperclip
labs/ansible/                            disposable controller + three managed nodes
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
- Three complete curricula are published: Python Fundamentals, JavaScript
  Fundamentals, and Ansible for DevOps, plus a playlist-ordered guided route
  through the Ansible material.
- Paperclip (embedded AI tutor) is built: docked Win98 panel, structured
  lesson/editor/run/test context, server-side provider abstraction with a
  free OpenCode Zen model, per-lesson conversation memory, and
  deterministic-only grading. See `docs/16-paperclip-ai-tutor.md`.
- See [docs/13-roadmap.md](docs/13-roadmap.md) for what's next (more
  chapters, progress/achievements, accounts, multi-language execution).

## Content rule

Code Forge does not copy textbook or video prose — companion tracks cite
the chapter/creator and write original explanations, examples and tests.
See [docs/12-copyright-source-boundaries.md](docs/12-copyright-source-boundaries.md).
