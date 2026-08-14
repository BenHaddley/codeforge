# 13 — Build Roadmap

The current public repository is already a useful prototype: it has static pages for Home, Library, Quests and a Python Crash Course track, and the track already includes a CodeMirror editor, local progress and browser-side Python via Pyodide.

The next step should therefore be **structural consolidation**, not starting over from zero.

## Milestone 0 — Preserve current prototype

- tag current state as a baseline;
- add a README with screenshots and local-running instructions;
- keep existing static pages working while the new lesson player is built.

## Milestone 1 — Classic UI shell

- [ ] build reusable Windows-style shell CSS;
- [ ] title bar, menu bar, toolbar and status bar;
- [ ] reusable pane component;
- [ ] tree-view curriculum navigation;
- [ ] desktop layout + mobile tab fallback;
- [ ] migrate one lesson into the shell.

**Exit condition:** the supplied reference look is recognisable and usable.

## Milestone 2 — Data-driven lesson player

- [ ] define `track.json` and lesson schema;
- [ ] load lesson from JSON;
- [ ] explanation renderer;
- [ ] example renderer;
- [ ] video segment component;
- [ ] quiz component;
- [ ] assignment panel;
- [ ] hint ladder;
- [ ] next/previous lesson navigation.

**Exit condition:** adding a new lesson requires content data, not a new HTML page.

## Milestone 3 — Execution worker

- [ ] move Pyodide into Web Worker;
- [ ] stdout/stderr capture;
- [ ] interrupt/timeout by worker restart;
- [ ] Run;
- [ ] Submit;
- [ ] test results UI;
- [ ] autosave editor draft.

**Exit condition:** an infinite `while True` cannot freeze the page.

## Milestone 4 — While Loops vertical slice

- [ ] original lesson text;
- [ ] TTS;
- [ ] example code;
- [ ] embedded Bro Code while-loop chapter;
- [ ] concept check;
- [ ] Forge Countdown assignment;
- [ ] tests;
- [ ] hints;
- [ ] completion state + XP.

**Exit condition:** a new learner can complete the entire intended Code Forge loop in one screen.

## Milestone 5 — Complete Python Fundamentals

Recommended chapter sequence:
1. Getting Started
2. Variables & Types
3. Operators & Expressions
4. Control Flow
5. Functions
6. Scope
7. User Input & While Loops
8. Lists / Collections
9. Dictionaries
10. Modules
11. Errors / Exceptions
12. Files
13. Testing
14. Mini Project

Do not feel obligated to reproduce a book's exact structure. The track can cite chapter alignment while Code Forge maintains its own pedagogy.

## Milestone 6 — Progress system

- [ ] IndexedDB/local progress model;
- [ ] XP event ledger;
- [ ] level calculation;
- [ ] achievements;
- [ ] profile/character sheet;
- [ ] notes;
- [ ] search.

## Milestone 7 — Accounts and sync

Only now add a remote backend:
- authentication;
- cloud progress sync;
- multi-device drafts/notes;
- server-authoritative XP.

A hosted Postgres/auth service is the quickest path; self-hosting can come later if it is a product requirement.

## Milestone 8 — Multi-language execution

Add server-side isolated runners for:
- JavaScript/TypeScript;
- Go;
- SQL;
- C;
- Rust;
- shell/Linux exercises.

## Milestone 9 — Community/product layer

- projects;
- public profiles;
- optional leaderboard;
- guilds/groups only if there is real demand;
- certificates only after the assessment model deserves them.

## Recommended immediate sprint

Build only these four things next:
1. classic desktop shell;
2. JSON lesson loader;
3. Pyodide worker with timeout;
4. complete While Loops lesson.

That gives you a vertical slice that proves the product rather than a pile of disconnected features.
