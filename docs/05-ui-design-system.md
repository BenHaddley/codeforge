# 05 — UI Design System: “Installed in 1999, Runs in 2026”

## Design rule

Code Forge should look like productivity/training software from the Windows 95/98/2000 era, but behave like a modern accessible web application.

## Palette

Core colors:
- desktop/window gray: `#c0c0c0`
- dark title blue: `#000080`
- active-title bright blue: `#1084d0`
- white content surface: `#ffffff`
- black text: `#000000`
- disabled gray: `#808080`
- link/selection blue: `#0000aa`
- code comment green: `#008000`
- error maroon: `#800000`

## Typography

UI chrome:
```css
font-family: Tahoma, "MS Sans Serif", Arial, sans-serif;
```

Code/output:
```css
font-family: "Courier New", monospace;
```

Use local/system fonts only. Do not bundle old Microsoft font files.

## Bevel language

Raised control:
- top/left: white;
- bottom/right: dark gray/black.

Sunken control:
- reverse those edges.

This should be encoded into reusable CSS utilities, not rewritten per component.

## Component vocabulary

- `app-window`
- `titlebar`
- `menubar`
- `toolbar`
- `tool-button`
- `window-pane`
- `pane-titlebar`
- `tree-view`
- `sunken-panel`
- `tabs`
- `status-bar`
- `progress-segments`
- `dialog`
- `property-sheet`

## Density

The supplied reference succeeds because almost every region has a job. Code Forge should avoid modern dashboard habits such as enormous cards and excessive whitespace.

Desktop target:
- 100% viewport height;
- no body scrolling during a lesson;
- panes scroll internally;
- main split can later become draggable.

## Responsive fallback

Below ~900px, the desktop metaphor should become a tabbed workspace:

```text
[Lesson] [Video] [Code] [Output]
```

Do not try to squeeze three desktop panes onto a phone.

## Motion

Keep motion small:
- button press: 80–120ms;
- XP increment: brief counter animation;
- lesson completion: checkmark + one short sound if enabled;
- avoid modern glass/blur animations.

## Optional sound design

If added, imitate generic interface feedback rather than copying Windows system sounds:
- click;
- success chime;
- compile/error blip;
- level-up sting.
