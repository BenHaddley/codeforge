# 07 — Code Execution and Grading

## Phase 1: Python in the browser

The current repository already uses **Pyodide**, so keep that advantage for the first serious release.

Recommended architecture:

```text
Main UI thread
   │
   ├── editor state
   ├── lesson state
   └── Run / Submit request
          │
          ▼
   Dedicated Web Worker
          │
          ├── loads Pyodide
          ├── executes learner code
          ├── captures stdout/stderr
          └── runs test harness
```

Do not execute long-running Python on the UI thread. A learner can accidentally write an infinite loop; the app needs to remain responsive.

## Timeout strategy

Because arbitrary Python can hang:
1. launch execution in a worker;
2. start a timer in the main thread;
3. if execution exceeds the lesson timeout, terminate the worker;
4. create a fresh worker/Pyodide runtime;
5. return a friendly "Execution timed out — check for a loop that never changes" message.

This is particularly useful in the **while loops** lesson because the failure mode becomes teachable.

## Run versus Submit

### Run
- executes learner code;
- shows stdout/stderr;
- no XP;
- no completion state.

### Submit
- executes code;
- runs validation tests;
- records attempt;
- shows pass/fail by requirement;
- awards completion once.

## Client-side test limitation

On a purely static site, "hidden" tests are not actually secret because the browser receives the JavaScript. This is acceptable for a self-directed learning tool, but not for competitive grading.

When Code Forge needs trustworthy grading or multiple languages, move submission to an isolated execution service.

## Phase 2: server-side runner

```text
Browser
  ↓
Submission API
  ↓
Queue
  ↓
Sandbox worker/container
  ↓
stdout/stderr + test results
  ↓
Progress service
```

At that stage enforce:
- CPU timeout;
- wall-clock timeout;
- memory cap;
- output cap;
- no network by default;
- ephemeral filesystem;
- per-language runtime image;
- rate limits.

## Anti-cheat stance

Do not over-invest in anti-cheat for a learning product. The meaningful protections are:
- server decides XP;
- completion is idempotent;
- server-side tests for public leaderboards;
- AI/hint usage can be recorded for analytics, not punishment.
