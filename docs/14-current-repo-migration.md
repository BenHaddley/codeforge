# 14 — Current Repository → Proposed Structure

The public repository currently exposes a simple static structure:

```text
css/
index.html
library.html
quests.html
track-python-crash-course.html
```

The Python track already has the beginnings of the real product: a CodeMirror editor, Pyodide execution, XP/progress and original quests aligned to Python Crash Course.

## Avoid a big-bang rewrite

Recommended migration:

```text
codeforge/
├── index.html                    # keep landing page working initially
├── library.html                  # keep while migrating
├── quests.html                   # keep while migrating
├── track-python-crash-course.html# redirect/bridge later
├── app/
│   ├── lesson.html               # new generic lesson player
│   ├── js/
│   │   ├── app.js
│   │   ├── lesson-loader.js
│   │   ├── progress-store.js
│   │   ├── tts.js
│   │   ├── video.js
│   │   ├── pyodide-worker.js
│   │   └── grading.js
│   └── css/
│       ├── win98.css
│       ├── layout.css
│       └── editor.css
├── content/
│   └── python-fundamentals/
├── assets/
│   ├── icons/
│   └── sounds/
├── scripts/
│   └── validate-content.mjs
└── docs/
```

## Later TypeScript/Vite transition

When the generic lesson player becomes difficult to maintain in plain JS, migrate **the app folder** to Vite + TypeScript rather than rewriting the product concept again.

A sensible later structure:

```text
src/
├── components/
├── features/
│   ├── lessons/
│   ├── editor/
│   ├── runner/
│   ├── progress/
│   ├── notes/
│   └── profile/
├── content/
├── stores/
├── workers/
└── styles/
```

The important architectural boundary is **content ≠ UI ≠ execution ≠ progress**. If those are separated now, framework migration later is manageable.
