# Future API Contract

The static Pyodide version does not need a server API. This contract exists so the product can grow without changing the lesson model.

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
