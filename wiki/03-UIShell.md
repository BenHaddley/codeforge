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
| `.tree` / `.tree-row` / `.tree-children` | Curriculum tree in the Lessons pane |
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

- **`layout.css`** — the `.workspace` 3-column grid (`.left-column /
  .middle-column / .right-column`), the lesson-scroll/video-pane sizing,
  and the `@media (max-width:1050px)` fallback that collapses the desktop
  into a single scrolling column (drops `.left-column` entirely — the
  tree nav is desktop-only for now).
- **`editor.css`** — `.editor-shell` (line-numbers + textarea grid),
  `.console`, `.tabs`, `.quiz-pane`. `.quiz-pane` has `overflow:auto` —
  added after testing showed longer quiz questions could overflow into
  the status bar otherwise (see [07-DevLog.md](07-DevLog.md)).
- **`site.css`** — single `.doc-pane` layout for the three marketing
  pages: `.doc-scroll` for prose, `.track-card` for the quest-track link
  box, `.badge`/`.badge-row` for the feature-pill list on the homepage.

## Known limitation

No dark-mode / theme variants — the Win98 palette is fixed regardless of
OS theme, which is intentional (it's the point of the aesthetic) but
worth knowing if a future page tries to respect `prefers-color-scheme`.
