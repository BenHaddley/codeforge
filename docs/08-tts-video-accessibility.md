# 08 — TTS, Video and Accessibility

## Text-to-speech

For the first version, use the browser Web Speech synthesis capability where available.

Controls:
- Listen / Pause / Resume / Stop;
- voice selection in Settings;
- speed: 0.75×, 1×, 1.25×, 1.5×, 2×;
- highlight the current paragraph if practical.

The spoken source should be the **same original Code Forge explanation shown on screen**.

Fallback: if speech synthesis is unavailable, hide/disable the button and keep the full lesson readable.

## Video design

Video is a supplement, not the canonical source of the lesson.

Store external clips as metadata:

```json
{
  "provider": "youtube",
  "videoId": "ix9cRaBkVe0",
  "startSeconds": 6715,
  "endSeconds": 7133,
  "label": "Bro Code: while loops",
  "required": false
}
```

Benefits:
- one lesson can use a precise relevant segment;
- no copyrighted video file is stored in the repository;
- timestamps can be updated independently;
- the lesson remains functional if the video is skipped.

## Privacy-friendly embed

Prefer `youtube-nocookie.com` embed URLs. Still explain in the privacy/help page that loading an external player contacts a third party.

## Captions

Use the player's own caption controls where available. Never scrape and republish a creator's transcript as course text.

## Keyboard support

Every toolbar action should have a keyboard shortcut:
- `Ctrl+Enter` — Run
- `Ctrl+Shift+Enter` — Submit
- `Ctrl+H` — Hint
- `Ctrl+L` — Listen/Pause lesson
- `Ctrl+S` — Save draft locally

All panes and controls need visible focus states even if the classic UI style is being used.
