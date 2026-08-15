# 04 — Lesson Player (`app/js/lesson-loader.js`)

`lesson-loader.js` turns `content/*.lesson.json` into the single-page
LessonWorkspace. It does not hardcode lesson prose: it fetches `track.json`,
loads the selected lesson JSON, renders the lesson flow, wires the IDE, and
hands execution/grading to the worker services.

## Workspace Shape

Desktop (`>1050px`) is one page, not separate Lesson and Practice pages:

- Left pane: lesson title, attribution/source note, explanation paragraphs,
  rule callout, all example code blocks, video, assignment, and the embedded
  Paperclip tutor pane.
- Divider: `#lessonColResizer`, persisted as `codeforge:panelWidth:lesson`,
  defaults to 50/50 and clamps the left pane between 35% and 70%.
- Right pane: `#previewEditor` (`main.py`), Run/Submit/Hint/Solution buttons,
  and collapsible Output/Tests/Hints tabs.

Mobile/narrow layout keeps the same DOM alive and shows only one column at a
time through the `#workspaceSwitch` Lesson/Code buttons. The editor is not
recreated, so draft state is preserved while switching tabs.

Quiz and Results still exist as internal screens (`#screen-quiz`,
`#screen-results`), but they are no longer the primary lesson/practice flow.
Passing the assignment opens a Win95 completion dialog with XP, Review,
Knowledge Check and Next Lesson actions.

## Boot Sequence (`init()`)

1. Read `window.CF_LESSON_ID`, set from `?lesson=` at module top level. The
   current default is `py-ch01-what-is-python`.
2. Fetch `content/python-fundamentals/track.json`.
3. `findLessonRef(track, id)` walks every chapter's `lessons[]` array and
   returns the matching `{ chapter, lesson }` track entry.
4. Fetch the full lesson JSON at `content/python-fundamentals/<path>`.
5. `ProgressStore.touchLesson(lesson.id)` records this as the last opened
   lesson so the homepage dashboard can resume the actual current lesson.
6. Initialize `CourseDrawer` from the track.
7. Render the lesson flow into `#lessonText` and mount the video player if
   `videos[0]` exists.
8. Wire the workspace: editor persistence, line-number gutter, Run, Submit,
   Hint, Solution, output tabs, keyboard shortcuts and responsive tabs.
9. Wire quiz/results screens.
10. Initialize Paperclip with `Paperclip.init(track, chapter, lesson)`.
11. Show the requested hash screen (`#lesson`, `#quiz`, `#results`) or the
    lesson workspace by default.
12. Update status/XP/streak, warm Pyodide, and warm TTS if configured.

## Lesson Rendering

`renderLessonScreen()` fills `#lessonText` with:

- Source note from `sourceAlignment` (`chapter` for book companions,
  `creator` for video companions).
- `<h1>` lesson title.
- `explanation.paragraphs[]`, tagged for TTS highlighting.
- `explanation.rule` as a classic callout.
- Every item in `examples[]`, each as a recessed, non-editable code block
  with a Copy button.
- The first video in `videos[]`, mounted by `CFVideoPlayer.mount()` with a
  Hide/Show video toggle.
- Assignment title, brief and requirements.

All interpolated lesson text is passed through `escapeHtml()` before entering
`innerHTML`.

## Editor And Persistence

The single editor is `#previewEditor`.

- It is seeded from `ProgressStore.getDraft(lesson.id,
  assignment.starterCode)`.
- Every input updates line numbers and stores the draft immediately with
  `ProgressStore.setDraft()`.
- `ProgressStore.touchLesson()` records opened lessons for homepage resume.
- Line numbers are measured against a hidden mirror element so wrapped visual
  lines stay aligned with the gutter. In real browsers a `ResizeObserver`
  recalculates on editor width changes; jsdom tests skip it safely.
- `Ctrl+Enter` runs code. `Ctrl+Shift+Enter` submits.

## Run, Submit, Hints, Solution

- **Run** stores the draft, optionally prompts for `input()` values via a
  floating `Win98Window`, calls `RunnerClient.run()`, writes stdout/stderr to
  Output, records the run for Paperclip, and updates status.
- **Submit** stores the draft, increments attempts, calls `Grading.submit()`,
  writes test output, renders the Tests tab, records the submit result for
  Paperclip, and on pass calls `ProgressStore.markComplete(lesson.id,
  lesson.xp)`.
- **Hint** reveals one more entry from `lesson.hints[]` in the Hints tab.
- **Solution** asks for confirmation, then loads `assignment.solutionCode`
  into the editor and saves it as the draft.

`ProgressStore.markComplete()` is idempotent. Re-submitting a completed lesson
does not award XP again, but still shows the completion dialog.

## Completion Dialog And Navigation

On a passing submit, `showCompletionDialog()` appends a Win95 modal overlay:

- Shows the lesson title and either `+XP` or “already completed”.
- `Review` closes the dialog and keeps the learner in the workspace.
- `Knowledge Check` opens `#screen-quiz` if the lesson has `checks[]`.
- `Next Lesson` navigates to `?lesson=<nextLessonId>` when present; otherwise
  it leaves the learner on the current lesson and updates the status bar.

## Internal Quiz/Results Screens

The quiz screen renders all entries in `lesson.checks[]` one at a time.
Answers are marked in-place, feedback is shown from the lesson JSON, and the
final action opens Results. Results summarize the most recent submit result,
plus whether the knowledge check was answered correctly.
