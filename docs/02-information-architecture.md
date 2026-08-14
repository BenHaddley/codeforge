# 02 — Information Architecture

## Top-level product areas

The desktop shell should expose the product as tools in an installed application rather than conventional web navigation.

### Lessons
The main curriculum tree and learning workspace.

### Search
Search concepts, lessons, code examples, notes and glossary entries.

### Notes
Learner-created notes, ideally tied to a lesson and optionally a line or code snapshot.

### Tools
Quick access to playground, Python console, formatter, regex tester, JSON viewer and later language-specific utilities.

### Help
Keyboard shortcuts, troubleshooting, how grading works, accessibility and source acknowledgements.

### Run
Executes current code without grading.

### Submit
Runs assignment tests and records completion if they pass.

### Hint
Shows a progressive hint ladder. Hints should escalate from conceptual to structural; avoid dumping the answer.

### Solution
Available only after a deliberate confirmation. Viewing a solution can reduce bonus XP but should never shame the learner or block progress.

### Print
Creates a clean printable lesson/notes view, matching the old training-software motif.

## Curriculum hierarchy

```text
Learning Path
└── Track / Course
    └── Chapter
        └── Lesson
            ├── Explanation
            ├── TTS narration
            ├── Example(s)
            ├── External video segment(s)
            ├── Knowledge check(s)
            ├── Assignment
            ├── Starter code
            ├── Tests
            ├── Hint ladder
            └── Completion reward
```

## Proposed routes

Even if the first build is static, design the information architecture around stable URLs:

```text
/                              Home / launcher
/learn                         Learning paths
/learn/python                  Python track
/learn/python/ch07/while-loops Lesson workspace
/playground/python             Scratch Python IDE
/quests                        Cross-track challenges
/projects                      Larger portfolio work
/library                       Books/resources the user is working from
/notes                         Learner notes
/profile                       Progress character sheet
/achievements                  Badges
/leaderboard                   Optional social ranking
/settings                      TTS, editor, accessibility, privacy
/help                          Help/manual
```

## Desktop-shell layout

```text
┌ Code Forge — title bar ──────────────────────────────────────┐
│ File  Edit  View  Lesson  Tools  Help                       │
├ toolbar ─────────────────────────────────────────────────────┤
│ Lessons Search Notes Tools | Help | Run Submit Hint Solution │
├──────────────┬────────────────────────┬───────────────────────┤
│ lesson tree  │ lesson/document pane   │ IDE                   │
│              │                        │                       │
│              │                        │                       │
├──────────────┼────────────────────────┼───────────────────────┤
│ progress /   │ video or quiz /        │ output / tests        │
│ track info   │ assignment details     │                       │
├──────────────┴────────────────────────┴───────────────────────┤
│ status bar: Ready | Python | progress | XP | local time      │
└───────────────────────────────────────────────────────────────┘
```

The screen should feel like an application workspace, not a vertically scrolling article.
