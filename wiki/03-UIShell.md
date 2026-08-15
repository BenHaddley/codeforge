# 03 — UI Shell (`app/css/win98.css`)

The Windows-98-training-software look, encoded as reusable classes so it
never gets rewritten per page. Palette and component vocabulary follow
`docs/05-ui-design-system.md`.

## Structural components

| Class | What it is |
|---|---|
| `.desktop` | Full-viewport teal background, centers `.app-window` |
| `.app-window` | The bevelled outer window — every page has exactly one |
| `.titlebar` | Blue gradient bar, `.title-left` (icon+name) / `.window-controls` (_, □, ×) |
| `.menubar` | File/Edit/View/... row — decorative except the Home `<a>` on `lesson.html` |
| `.toolbar` | Icon+label buttons (`.tool`); `.separator` divides groups; `.brandmark` is the anvil logo pinned right |
| `.pane` / `.pane-title` / `.pane-body` | The bevelled sub-window unit everything else lives in |
| `.tree` / `.tree-row` / `.tree-children` | Curriculum tree in the slide-in course drawer |
| `.statusbar` + `.statusbar-4` / `.statusbar-2` | Bottom bar; pick the modifier matching how many cells the page needs |

`.tool` is used for both `<button>` (lesson toolbar actions) and `<a>`
(marketing-page nav) — it sets `color:inherit;text-decoration:none` so
anchors don't get link-blue/underline by default.

## Bevel convention

Raised (buttons, panes): `border-color: #fff #000 #000 #fff` (light
top/left, dark bottom/right). Sunken (inputs, textareas, the tree):
`border: 2px inset #fff`. `:active` states on buttons flip the border and
nudge the content `translate(1px,1px)` to fake a press. Don't invent a
third bevel direction — everything reuses these two.

## Layout files that build on top of win98.css

- **`site.css`** — shared outer layout for non-lesson pages.
- **`home.css`** — homepage dashboard panels: Continue Learning, Featured
  Course, Forge Status, Recent Lessons, Quick Launch and Win95 progress
  bars/lists. It reuses `.pane`/`.classic-button` instead of inventing a
  second card system.
- **`layout.css`** — LessonWorkspace split pane: left lesson/Paperclip
  column, draggable divider, right IDE/output column, completion dialog and
  the mobile-only Lesson/Code tab fallback.
- **`editor.css`** — `.editor-shell` (line-numbers + textarea grid),
  `.console`, `.tabs`.
- **`screens.css`** — internal quiz/results screens only. The old separate
  practice screen CSS was removed when lesson and code merged into one page.
- **`video-player.css`** — Win95-styled YouTube player frame and controls.
- **`paperclip.css`** — the embedded Paperclip tutor pane inside the lesson
  column.

## Known limitation

No dark-mode / theme variants — the Win98 palette is fixed regardless of
OS theme, which is intentional (it's the point of the aesthetic) but
worth knowing if a future page tries to respect `prefers-color-scheme`.
