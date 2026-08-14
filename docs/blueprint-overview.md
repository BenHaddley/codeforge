# Code Forge — Product Blueprint + UI Prototype

This archive turns the current **Code Forge** idea into a buildable product plan.
It is designed around the existing public repository at `BenHaddley/codeforge`, the uploaded Boot.dev research notes, and the supplied Windows 98/early-2000s training-software reference image.

## The product in one sentence

**Code Forge is a desktop-software-styled coding school where every concept is taught, demonstrated, practiced, tested, and recorded in the same workspace.**

The core lesson loop is:

1. **Read** an original explanation.
2. **Listen** to that explanation with text-to-speech if wanted.
3. **Inspect** a short code example.
4. **Watch** a relevant segment from an external educator, embedded from the original source.
5. **Predict** or answer one quick concept check.
6. **Build** the assignment in the IDE on the right.
7. **Run** as often as needed.
8. **Submit** against tests.
9. **Use hints** if stuck; the full solution is a last resort.
10. **Earn XP**, save progress, and unlock the next lesson.

The first concrete lesson designed in this archive is **Python Fundamentals → Chapter 7 → While Loops**.

## What is inside

- `prototype/` — a static, interactive Windows-98-style lesson workspace.
- `content/` — a proposed data-driven lesson format, including a complete while-loops example.
- `docs/` — product structure, pedagogy, UI rules, roadmap, copyright boundaries, TTS/video approach, gamification, authoring flow and deployment plan.
- `architecture/` — proposed database schema, API contract and repository structure.
- `reference/` — the supplied visual reference image.

## Try the prototype

Open `prototype/index.html` in a browser. The visual shell works locally. The Python `Run` and `Submit` buttons load Pyodide from its CDN, so those actions require internet access.

The Bro Code video is not copied into this archive. The prototype embeds the original YouTube video using a start/end window for the while-loops chapter.

## Important content rule

Code Forge should **not copy textbook prose**. For a book-aligned track, store only chapter/section references and write original explanations, examples, checks and assignments. Text-to-speech should read Code Forge's own lesson text, not a reproduced chapter.
