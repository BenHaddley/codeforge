# 11 — Course Authoring Workflow

## Phase 1 — Git-authored content

The repository itself is the CMS.

Workflow:
1. create lesson JSON from template;
2. write original explanation;
3. add original example;
4. add external references/timestamps;
5. write assignment and tests;
6. run `npm run validate-content` later;
7. preview lesson;
8. commit/PR.

This is the best fit while Code Forge is still a small project.

## Phase 2 — Local authoring app

Build an internal editor that writes the same lesson JSON format:

```text
┌ New Lesson ────────────────────────────────┐
│ Title: [While Loops____________________]   │
│ Chapter: [7____________________________]   │
│ XP: [50]                                   │
│                                             │
│ [Explanation] [Examples] [Video] [Quiz]    │
│ [Assignment] [Tests] [Hints] [Preview]     │
│                                             │
│                         [Validate] [Save]   │
└─────────────────────────────────────────────┘
```

## Quality checklist

Before publishing:
- explanation is original;
- every external asset has attribution metadata;
- video still loads;
- assignment can be solved from what has been taught;
- starter code executes;
- expected solution passes tests;
- an obvious wrong solution fails tests;
- infinite-loop timeout works;
- TTS does not read raw code punctuation unless explicitly requested;
- keyboard-only learner can complete the lesson.
