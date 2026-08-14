# 03 — Lesson Learning Loop

## The recommended lesson sequence

### 1. Orient — 15 to 30 seconds
Show the learner exactly what they are about to gain.

Example: "Use a `while` loop when you need code to repeat until a condition changes."

### 2. Read / Listen — 2 to 5 minutes
Present a concise original explanation in the center-left document pane. A **Listen** button uses text-to-speech on the same text.

Good lesson copy should:
- explain the mental model first;
- use one main idea at a time;
- include a common failure mode;
- end with a simple rule of thumb;
- avoid duplicating the wording of source books.

### 3. Inspect an example — 1 to 3 minutes
Show 5–20 lines of code and annotate why it works. Let the learner load the example into the editor with a button, but do not overwrite their existing assignment code without confirmation.

### 4. Watch a focused reinforcement clip — 2 to 7 minutes
Embed only the relevant chapter of an external video through the provider's player. Do not download or rehost it.

For the Bro Code Python 2024 video currently proposed for Chapter 7, the public chapter list places **while loops at 01:51:55**, with the next chapter beginning at **01:58:53**. The prototype therefore embeds that segment window.

### 5. Predict before coding — 30 to 60 seconds
One tiny concept check forces active recall.

Examples:
- What makes this loop stop?
- What happens if the condition never becomes false?
- Which variable must change?

### 6. Assignment — 5 to 20 minutes
A small concrete task appears while the IDE remains visible.

Assignments should define:
- objective;
- required behavior;
- example I/O where useful;
- constraints;
- starter code;
- visible tests;
- hidden/validation tests when grading is server-side.

### 7. Run
Learner runs code as often as needed. Running has no penalty.

### 8. Submit
Submission runs tests and records the result. Failure feedback should explain **which behavior failed**, not reveal the implementation.

### 9. Hint ladder
Suggested structure:
1. Restate the idea.
2. Point at the part of the program to inspect.
3. Suggest a Python construct or condition.
4. Show pseudocode.
5. Show a small analogous example.
6. Full solution, only on deliberate request.

### 10. Complete
On success:
- animate/check the lesson node;
- award XP once;
- save completion time and attempts;
- show a one-sentence takeaway;
- enable **Next Lesson**.

## Lesson state machine

```text
LOCKED
  ↓ prerequisite met
AVAILABLE
  ↓ opened
IN_PROGRESS
  ├─ read/listen
  ├─ example viewed
  ├─ video viewed/skipped
  ├─ knowledge check
  └─ coding attempts
  ↓ tests pass
PASSED
  ↓ completion recorded
COMPLETE
```

Video should be a reinforcement step, not a gate. A learner who prefers text or cannot access YouTube must still be able to complete the lesson.
