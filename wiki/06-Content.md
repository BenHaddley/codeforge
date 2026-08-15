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
    {
      "id": "ch01", "number": 1, "title": "Getting Started",
      "lessons": [
        { "id": "py-ch01-what-is-python", "number": "1.1", "title": "What Is Python?",
          "path": "ch01-getting-started/01-what-is-python.lesson.json" }
      ]
    },
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

- Chapters without lessons can exist, but the current Python Fundamentals
  track is populated with lesson entries across chapters 1-15.
- `path` is resolved relative to `content/python-fundamentals/`.
- The course drawer only expands the chapter containing the current lesson.

## `*.lesson.json`

Full reference examples are in `content/python-fundamentals/ch*/`. Every field
below is used by `lesson-loader.js`, `home.js` or `grading.js`:

| Field | Used by | Notes |
|---|---|---|
| `id`, `title`, `number`, `xp` | course drawer, homepage dashboard, pane titles, XP award | `xp` only ever awarded once per `id` (`ProgressStore.markComplete`) |
| `sourceAlignment.{title,chapter,creator}` | `renderLessonScreen` source-note | Book companions show chapter; video companions show creator |
| `explanation.paragraphs[]`, `.rule` | lesson pane text, TTS input | TTS reads exactly these, nothing else — see `docs/12-copyright-source-boundaries.md` |
| `examples[].{title,code,note}` | Example blocks | Every example is rendered as a recessed non-editable code block with a Copy button |
| `videos[0].*` | `CFVideoPlayer.mount()` | Uses `videoId`, `startSeconds`, `endSeconds`, `creator`, `title`; `embedUrl` remains metadata/compatibility |
| `checks[].{question,options,correctIndex,feedback}` | quiz screen | Rendered one at a time after assignment completion or direct `#quiz` navigation |
| `assignment.{title,brief,requirements[]}` | assignment box copy | Display-only |
| `assignment.starterCode` | editor seed + homepage code preview fallback | Used as the `ProgressStore` fallback when no draft is saved |
| `assignment.solutionCode` | Solution button | Shown only after a `confirm()` |
| `assignment.requirementChecks[]` | `Grading.checkRequirements` | `{id, label, pattern, mustMatch}` — regex against comment-stripped source |
| `assignment.testHarness` | `Grading.submit` | Raw Python appended after learner code; must end by printing `__CF_TEST_OUTPUT__` then `print(repr(<captured stdout>))` |
| `assignment.expectedOutput` | `Grading.submit` | Exact string match against the harness's captured/decoded output |
| `assignment.outputCheckLabel` | test-results line | Human label for the behavioral check row |
| `assignment.timeoutMs` | `RunnerClient.run` | Per-assignment override; only matters once Pyodide is warm (see [05-Execution.md](05-Execution.md)) |
| `hints[]` | Hint button | Each click reveals one more hint in the Hints tab; resets on page reload |
| `nextLessonId` | completion dialog | `Next Lesson` navigates to `?lesson=<nextLessonId>` when present |

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
JS-evaluates the following Python `repr()` string literal.

## Content rule, again

Per `docs/12-copyright-source-boundaries.md`: `explanation`, `examples`,
`assignment`, `hints` must be original Code Forge writing, even for a
book-companion lesson. `sourceAlignment` is *only* metadata (title/author/
chapter/URL) — never chapter prose.
