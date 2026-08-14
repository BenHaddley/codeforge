# 06 — Content Format

Two JSON shapes, both under `content/python-fundamentals/`. This is the
*only* thing you need to touch to add a lesson — see
[04-LessonPlayer.md](04-LessonPlayer.md) for why.

## `track.json`

```json
{
  "id": "python-fundamentals",
  "title": "Python Fundamentals",
  "chapters": [
    { "id": "ch01", "number": 1, "title": "Getting Started" },
    {
      "id": "ch07", "number": 7, "title": "User Input & While Loops",
      "lessons": [
        { "id": "py-ch07-while-loops", "number": "7.2", "title": "While Loops",
          "path": "ch07-user-input-and-while-loops/02-while-loops.lesson.json" }
      ]
    }
  ]
}
```

- Chapters *without* a `lessons` array render in the tree as a plain
  (non-expanding) folder — that's how chapters 1–6 and 8–14 currently show
  up: placeholders with no content yet.
- `path` is resolved relative to `content/python-fundamentals/`.
- The tree only ever expands the chapter containing the *current* lesson
  — see `renderTree()` in `lesson-loader.js`.

## `*.lesson.json`

Full reference is `content/python-fundamentals/ch07-user-input-and-while-
loops/02-while-loops.lesson.json` — every field below is used by
`lesson-loader.js` / `grading.js`, nothing is dead:

| Field | Used by | Notes |
|---|---|---|
| `id`, `title`, `number`, `xp` | tree, pane titles, XP award | `xp` only ever awarded once per `id` (`ProgressStore.markComplete`) |
| `sourceAlignment.{title,chapter}` | `renderLesson` source-note | Only shown if `sourceAlignment` is present at all |
| `explanation.paragraphs[]`, `.rule` | lesson pane text, TTS input | TTS reads exactly these, nothing else — see `docs/12-copyright-source-boundaries.md` |
| `examples[0].{code,note}` | "Example" block + Load-into-IDE button | Only `examples[0]` is rendered — array exists for future multi-example lessons but isn't iterated yet |
| `videos[0].*` | `Video.render()` | `embedUrl` is used verbatim as the iframe `src` — must already be a `youtube-nocookie.com/embed/...` URL with `start`/`end`; nothing derives it from `videoId` at render time |
| `checks[0].{question,options,correctIndex,feedback}` | quiz pane | Only the first check is rendered — same one-of-many limitation as `examples` |
| `assignment.{title,brief,requirements[]}` | assignment box copy | Display-only |
| `assignment.starterCode` | editor seed | Used as the `ProgressStore` fallback when no draft is saved |
| `assignment.solutionCode` | Solution button | Shown only after a `confirm()` |
| `assignment.requirementChecks[]` | `Grading.checkRequirements` | `{id, label, pattern, mustMatch}` — regex against comment-stripped source |
| `assignment.testHarness` | `Grading.submit` | Raw Python appended after learner code; must end by printing `__CF_TEST_OUTPUT__` then `print(repr(<captured stdout>))` |
| `assignment.expectedOutput` | `Grading.submit` | Exact string match against the harness's captured/decoded output |
| `assignment.outputCheckLabel` | test-results line | Human label for the behavioral check row |
| `assignment.timeoutMs` | `RunnerClient.run` | Per-assignment override; only matters once Pyodide is warm (see [05-Execution.md](05-Execution.md)) |
| `hints[]` | Hint button | Each click advances one step, clamped at the last hint — `hintIndex` is a module-level variable in `lesson-loader.js`, so it resets on page reload, not on lesson switch (there's only one lesson today, so this hasn't mattered yet) |
| `nextLessonId` | *(none yet)* | Captured in content, not read by any code yet — see the gap noted in [04-LessonPlayer.md](04-LessonPlayer.md) |

## Writing a new `testHarness`

Pattern used by the While Loops lesson — call the learner's function with
a *different* input than any example shown, capture its stdout, and print
it in a form the loader can `eval` back:

```python
import io, contextlib
_cf_buf = io.StringIO()
with contextlib.redirect_stdout(_cf_buf):
    forge_countdown(3)
_cf_result = _cf_buf.getvalue()
print("__CF_TEST_OUTPUT__")
print(repr(_cf_result))
```

Keep the `__CF_TEST_OUTPUT__` marker and `repr()` call exactly as shown —
`grading.js`'s `extractCapturedOutput()` looks for that literal marker and
Python-evals the following line as a JS string.

## Content rule, again

Per `docs/12-copyright-source-boundaries.md`: `explanation`, `examples`,
`assignment`, `hints` must be original Code Forge writing, even for a
book-companion lesson. `sourceAlignment` is *only* metadata (title/author/
chapter/URL) — never chapter prose.
