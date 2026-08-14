# 06 — Data-Driven Content Model

Do not keep the course permanently hard-coded inside one HTML file.

The current public repository already has a track page that declares quests directly in JavaScript. That is fine for a prototype, but the next structural move should be separating **content data** from **the lesson player**.

## Proposed folder pattern

```text
content/
└── python-fundamentals/
    ├── track.json
    ├── ch01-getting-started/
    ├── ch02-variables/
    ├── ...
    └── ch07-user-input-and-while-loops/
        ├── chapter.json
        ├── 01-user-input.lesson.json
        ├── 02-while-loops.lesson.json
        └── assets/
```

## Lesson object

```json
{
  "id": "py-ch07-while-loops",
  "title": "While Loops",
  "kind": "lesson",
  "xp": 50,
  "sourceAlignment": {
    "title": "Python Crash Course, 3rd Edition",
    "chapter": "7",
    "concept": "User Input and while Loops"
  },
  "explanation": {
    "format": "markdown",
    "content": "Original Code Forge text...",
    "tts": true
  },
  "examples": [],
  "videos": [],
  "checks": [],
  "assignment": {},
  "hints": [],
  "nextLessonId": "py-ch07-break-and-flags"
}
```

## Why JSON first

For the current static/GitHub-Pages style project, JSON has advantages:
- no CMS required;
- course changes are version-controlled in Git;
- content can be reviewed in pull requests;
- the same player renders every lesson;
- later, a build script can validate every lesson against a JSON Schema.

Markdown/MDX can be introduced later if writing long explanations in JSON becomes annoying.

## Content invariants

A publishable assignment lesson must have:
- stable ID;
- title;
- objective;
- original explanation;
- starter code;
- at least one validation test;
- at least two hints;
- next-step mapping;
- attribution metadata for external references.
