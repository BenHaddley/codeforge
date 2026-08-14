# Future API Contract

The static Pyodide version does not need a server API. This contract exists so the product can grow without changing the lesson model.

> Implemented now (see docs/16-paperclip-ai-tutor.md): the Paperclip tutor
> endpoint below is live in `server/`, served by `node server/server.js`.

## `POST /api/paperclip`

Sends the learner's question plus Code Forge's normalized workspace context.
Provider credentials stay on the server; the browser never holds keys.

Request:
```json
{
  "studentMessage": "why does it keep running?",
  "context": {
    "course": "Python Fundamentals",
    "lesson": "7.2 While Loops",
    "lessonId": "py-ch07-while-loops",
    "learningObjectives": ["..."],
    "lessonSummary": "...",
    "assignment": { "title": "Forge Countdown", "brief": "...", "requirements": ["..."] },
    "editor": { "code": "...", "version": 17, "updatedSinceLastMessage": true },
    "lastRun": { "status": "timeout", "stdout": "5\n5\n5\n..." },
    "testSummary": { "summary": "0 / 3 tests passed.", "failureCategory": "probable infinite loop" },
    "assignmentComplete": false,
    "assistanceLevel": 1,
    "history": [ { "role": "user", "content": "..." } ]
  }
}
```

Hidden grading material (solutionCode, testHarness, expectedOutput) is
never present in `context`.

Response (success):
```json
{
  "ok": true,
  "content": "Your loop condition depends on `count`...",
  "provider": "opencode",
  "model": "deepseek-v4-flash-free",
  "latencyMs": 1900,
  "usage": { "prompt_tokens": 800, "completion_tokens": 90, "total_tokens": 890 }
}
```

Response (failure):
```json
{
  "ok": false,
  "error": { "kind": "provider_unavailable", "message": "The tutor service is temporarily unavailable. Your lesson and code have not been affected." }
}
```

Error kinds: `invalid_request`, `rate_limited`, `invalid_key`,
`provider_unavailable`, `timeout`, `malformed`, `empty`. The client renders
friendly Win98-style messages and never invents tutor answers.

## `POST /api/run`
For scratch execution; no progress mutation.

Request:
```json
{
  "language": "python",
  "code": "print('hello')",
  "stdin": ""
}
```

Response:
```json
{
  "status": "ok",
  "stdout": "hello\n",
  "stderr": "",
  "runtimeMs": 23
}
```

## `POST /api/lessons/:lessonId/submit`

Request:
```json
{
  "contentVersion": 3,
  "language": "python",
  "code": "..."
}
```

Response:
```json
{
  "passed": true,
  "tests": [
    {"name": "counts down from three", "passed": true}
  ],
  "xpAwarded": 50,
  "totalXp": 1250,
  "nextLessonId": "py-ch07-break-and-flags"
}
```

## `GET /api/me/progress`
Returns authoritative completion and XP data.

## `PUT /api/me/notes/:noteId`
Syncs a lesson note.

## Principle

The browser may request XP-worthy actions. Only the server decides whether XP is awarded.
