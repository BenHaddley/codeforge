# 04 — Lesson Player (`app/js/lesson-loader.js`)

This is the file that turns `content/*.json` into the on-screen lesson
workspace. Everything else in `app/js/` is a service it calls into.

## Boot sequence (`init()`)

1. Read `window.CF_LESSON_ID` — set at module top-level from `?lesson=`
   in the URL, defaulting to `py-ch07-while-loops`. Set *before* `init()`
   runs so `app.js`'s notes-dialog handler (which reads it lazily on
   click) always sees the right id.
2. `fetch` `content/python-fundamentals/track.json`.
3. `findLessonRef(track, id)` walks every chapter's `lessons[]` array
   looking for a matching id, returns `{chapter, lesson}` (the `lesson`
   here is the *track.json entry*, i.e. `{id, number, title, path}`, not
   the full lesson content yet).
4. `fetch` the actual lesson JSON at `content/python-fundamentals/<path>`.
5. Render, in order: tree → progress bar → lesson pane → video → quiz →
   XP display → editor → hint/solution/listen/notes wiring → Run/Submit
   listeners → keyboard shortcuts → `RunnerClient.warmup()`.

If no lesson matches the id, it stops and shows an error in the console
pane rather than throwing — the whole `init()` call is wrapped in
`.catch()` at the bottom of the file.

## Render functions, one per pane

| Function | Fills |
|---|---|
| `renderTree(track, chapterId, lessonId)` | `#lessonTree` — folder row per chapter; only the current chapter expands to show its `lessons[]`; chapters with no `lessons[]` are clickable but just set a status message (no content yet) |
| `renderProgress(track, chapter)` | `#progressSegbar` / `#progressChapter` / `#progressPercent` — segment `i < currentIndex` gets `.filled`, `i === currentIndex` gets `.active` |
| `renderLesson(lesson)` | `#lessonPaneTitle` + `#lessonText` — source-note, paragraphs, rule callout, first example (+ "Load Example" button), assignment box |
| `renderVideo(lesson)` | `#videoContainer` via `Video.render()`, label into `#videoPaneLabel` |
| `renderQuiz(lesson)` | `#quizPane` — builds radios from `checks[0]` only (multi-check lessons would need this extended) |

All lesson text goes through `escapeHtml()` before being interpolated
into `innerHTML` — content is trusted (it's authored, not user input),
but this is cheap insurance since the render path is template-string
based, not DOM-node-based.

## Editor + persistence

`setupEditor(lesson)`:
- Seeds the textarea from `ProgressStore.getDraft(lesson.id,
  assignment.starterCode)` — so a returning learner sees their in-progress
  code, not the starter every time.
- On every `input` event: recomputes line numbers (`#lineNumbers`, plain
  1..N text) and writes the draft back to `ProgressStore`.
- No debounce — `localStorage.setItem` on every keystroke. Fine at this
  scale (one lesson, small strings); would need debouncing if lesson text
  got large or lessons multiplied a lot.

## Run vs Submit

- **Run** (`runCode`): sends the editor's raw contents to
  `RunnerClient.run()`, dumps stdout/stderr to the console pane. No XP,
  no persistence beyond the draft.
- **Submit** (`submitCode`): calls `ProgressStore.incrementAttempts()`,
  then `Grading.submit()` (see [05-Execution.md](05-Execution.md)),
  formats a `[PASS]`/`[FAIL]` line per check, and on a full pass calls
  `ProgressStore.markComplete(lesson.id, lesson.xp)` — which is
  idempotent, so re-submitting a completed lesson doesn't re-award XP.

Keyboard shortcuts are bound once in `init()`: `Ctrl+Enter` → Run,
`Ctrl+Shift+Enter` → Submit (checked in that order so Submit doesn't also
fire Run).

## Adding a second lesson to an existing chapter

Nothing in this file assumes one lesson per chapter — `renderTree` already
maps over `chapter.lessons[]`. Add a second `{id, number, title, path}`
entry to `track.json`'s `ch07.lessons[]`, add the lesson JSON file, done.
Cross-lesson navigation (`nextLessonId` in the lesson schema) is captured
in content but **not wired up yet** — there's no "Next Lesson" button in
the UI. That's the first gap to close if a second lesson gets built.
