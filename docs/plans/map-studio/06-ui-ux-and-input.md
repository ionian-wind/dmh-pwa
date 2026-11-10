# Map Studio — UI, UX and input

## 1. Layout principles

- The canvas is always the primary surface.
- Desktop chrome is persistent but collapsible; tablet chrome is drawers; mobile chrome is bottom sheets + compact toolbar.
- Every icon-only action has a tooltip and an accessible label.
- Panels never cover the active selection if it can be avoided; when they must, the canvas pans to keep the selection visible.
- No modal for routine tool settings; use inline panels. Modals are only for destructive/import/export/unsaved flows.

## 2. Desktop layout (≥ 1200 px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ File  Edit  View  Help                    [map name]     [save status] │
├───────────────┬──────────────────────────────────────────┬───────────────┤
│ Left panel    │                                          │ Right panel   │
│ 300–340 px    │                 Canvas                   │ 320–380 px    │
│               │                                          │  Layers       │
│ Presets       │                                          │  Layer        │
│ Images        │                                          │  Settings     │
│ Clipboard     │                                          │               │
│ Textures      │                                          │               │
│ Lighting      │                                          │               │
│ Random        │                                          │               │
│ Export        │                                          │               │
│ Maps          │                                          │               │
├───────────────┴──────────────────────────────────────────┴───────────────┤
│                         Floating bottom toolbar                          │
│  Pan Object Rect Circle Path Polygon Wall Select Door Stairs Text Stamp  │
│  [tool settings popover / inline row]                    zoom 100%  grid │
└──────────────────────────────────────────────────────────────────────────┘
```

- Left panel has an icon rail + content panel. Clicking an active icon collapses the content.
- Right panel is resizable (drag divider). Bottom edge of the Layers list is resizable.
- Toolbar is centered; tool settings expand above it or in the left panel top.
- Top bar is compact: menus left, map/project name centered, save status + undo/redo + UI hide right.
- Canvas has a margin so the drawing is not hidden behind panels; fit-to-map accounts for panel widths.

## 3. Tablet layout (600–1199 px)

- Top bar: back to library, undo/redo, save status, overflow menu.
- Left/right panels become overlay drawers triggered by icon buttons; max width 360 px; dim the canvas with scrim; swipe/edge drag to close.
- Toolbar remains at the bottom; tool settings open as a floating card above the toolbar.
- Resizable split is not available; drawers overlay.
- Selection action bar replaces the context menu where possible.

## 4. Mobile layout (< 600 px)

- Full-screen canvas.
- Top compact bar: back, map name, undo, redo, overflow.
- Bottom toolbar: horizontally scrollable/paged tool icons with 44 px targets; active tool pinned; a “more” button reveals hidden tools.
- Tool settings open as a bottom sheet (drag handle, snap points 30/60/90%).
- Layers/Settings open as full-height bottom sheets with a persistent “Canvas” peek.
- Left feature panels (Presets/Images/etc.) open as bottom sheets; selection and layer settings can coexist in a two-step sheet.
- Floating action bar above the toolbar for selection actions (copy/cut/delete/group/duplicate).
- Zoom controls as a floating pill (+ / − / fit) if pinch is not enough.
- Keyboard-safe area: when the text editor opens, the canvas shifts so the edited text remains visible above the keyboard.
- Landscape: toolbar moves to the left edge if width is sufficient; otherwise stays bottom.

## 5. Top menu

### File

- New map (project), New project, Open library, Save, Save as, Import `.ds`, Import image(s), Export, Apply to location, Return to library.
- Recent: last used maps (local).
- Save status and “Saved to device” text.

### Edit

- Undo, Redo, Cut, Copy, Paste, Duplicate, Delete, Select all objects, Deselect, Preferences.

### View

- Theme (system/light/dark), Hide UI, Show grid, Show all grids, Isometric, Fit to map, Zoom 100%, Zoom to selection, Show fog preview.

### Help

- Quick start, keyboard shortcuts, feature docs, about/versions.

Menus are accessible (`role=menu`, arrow keys, Escape). On mobile they become a single overflow sheet.

## 6. Left sidebar features

Rail icons (order):

1. Presets (Scrawl)
2. Images
3. Clipboard
4. Textures
5. Lighting
6. Random Dungeon
7. Export
8. Maps/Library

Each panel is independent and remembers its scroll/expanded sections.

### Presets panel

- Sections: Dungeon Presets, World Building, Custom.
- Preset card: thumbnail, name; hover/focus reveals “Add layer” and “Apply to current” buttons; mobile: tap opens a small action sheet.
- Disabled/hidden when no active dungeon layer (apply button disabled with explanation).
- Custom: “Save current style”, rename inline, update/delete actions.

### Images panel

- Search field; creator/category filter.
- Collapsible Favorites / Custom / Built-in.
- Thumbnail grid; hover tooltip with name; star to favorite; upload button.
- Selected image has a clear state; tapping selects for placement/stamp.
- Empty states explain upload/favorites.
- Drag/drop onto canvas places at pointer; drop onto panel imports.

### Clipboard panel

- Grid/list of geometry fragments with thumbnail, name (optional), source layer style badge.
- Click pastes; delete/clear actions; “Clear all” with confirm.
- Session-only by default; optional persistence toggle.

### Textures panel

- Toggle “Texture on”.
- Texture grid with attribution; scale/opacity sliders.
- Preview updates live on canvas.

### Lighting panel

- Global toggle.
- “Add light” form: preset select, radius, bright radius, color, intensity, Add button.
- List of placed lights with enable/delete/select actions.
- Light presets table with 5e values shown.
- “Blocks light” is a layer setting, with a link/hint.

### Random Dungeon panel

- Settings form (size, room count/size, corridors, layout, doors, room shapes, roughness).
- Seed field with copy/randomize; Generate button with confirm.
- Warning that generation replaces the current map.
- Plugins/import area for Watabou/donjon.

### Export panel

- Type selector: PNG, WebP, JPG, PDF, UVTT.
- Filename.
- Pixels per cell (default 70; validation).
- Output dimensions and warning if too large.
- Export area overlay toggle + numeric x/y/w/h; reset.
- PDF-only: paper size, margin, print resolution, cell size.
- Actions: Export, Copy image (if supported), Save as project bundle, Apply to location.
- Local share explanation: file download only.

### Maps panel

- Project map list; add, rename, duplicate, delete, reorder.
- Import maps from another `.ds` file; thumbnails.
- Current map highlighted.

## 7. Right sidebar: Layers and Layer Settings

### Layers panel

- Header: “Layers”, add folder, add layer, move up/down.
- Rows: folder icon (open/closed state), type icon, name, visibility eye, lock, overflow menu. There is no separate expand arrow: clicking a folder row toggles it.
- Drag handle on hover; row drag reorders within parent and into folders.
- The panel is wide enough for settings and short enough to leave the canvas visible. Only the layer tree scrolls; layer/object properties remain fixed and fully visible.
- Active row highlight; multi-select with Shift/Ctrl/Cmd.
- Context menu: rename, duplicate, delete, send to front/back, group into folder, lock/unlock, hide/show.
- Footer: total objects/shapes count and performance hint.
- Mobile: full-height sheet, rows 48 px, swipe actions for hide/lock/delete.

### Layer Settings

- Header changes with selection: layer name or “N objects selected”.
- Sections collapse independently; visibility eyes on sections.
- Dungeon layer: Opacity, Floor texture, Walls, Floor, Grid, Shadow, Hatching, Shading, Advanced.
- Background: Opacity, Color, Isometric, Background texture, Grid.
- Fog: Opacity, Fog color, Blend, Advanced.
- Object: type-specific fields (image tint/shadow, text typography, door, stairs, light).
- Multi-selection: only common fields shown; edit applies to all.
- Live preview; values update canvas immediately; history coalesces slider drags.

## 8. Bottom toolbar and tool settings

- Tools laid out in documented order: Pan, Object, Rectangle, Circle/Regular Polygon, Path, Polygon, Wall, Select, Door, Stairs, Text, Stamp.
- Active tool has a filled background and accessible pressed state.
- Tool overflow is available on narrow screens; each tool also in a “Tools” menu for keyboard/screen readers.
- Tool settings:
  - Desktop: inline strip above toolbar (wrap to two rows) or a popover anchored to a settings button.
  - Tablet: floating card above toolbar.
  - Mobile: bottom sheet.
- Settings are grouped: Mode/Snap/Division universal; tool-specific sections; a “Reset tool settings” action.
- Circle/regular polygon adds a Sides slider plus numeric input (1 = circle) and a Draw to selector (Point or Edge).
- Polygon adds a Smooth toggle; with Snap off, dragging draws a freehand polygon.
- Text adds font family, size, colour, alignment and drop-shadow controls to the tool settings.
- Sliders and number inputs have paired controls; units shown in cells (and optional ft/m via project settings).
- Keyboard shortcuts are shown in tooltips.

## 9. Selection UX

- Single object: bounding box, 4 corner resize handles, rotate handle, quick action bar (duplicate, delete, front/back, more).
- Multi-object: one combined bounding box around every selected object plus corner resize and rotate handles. Resizing scales all selected objects from the group bounds; rotating turns every selected object around the group center while preserving relative positions.
- Multi-object settings panel: shows the shared properties (opacity, rotation, and type-specific fields only when every selected object has the same type) with mixed values marked “Mixed”. Batch actions: duplicate, bring forward/backward, flip horizontal/vertical and delete.
- Mixed selections are transformed as one axis-aligned group; text/image boxes and door/stair geometry all participate.
- Geometry selection: outline + mini menu above bounds (Copy/Cut/Delete).
- Paste mode: preview follows pointer; action bar shows Confirm/Cancel; arrow keys nudge; Enter/Escape; touch buttons.
- Context menu anchored to pointer, flips to stay on screen.
- Locked/hidden objects cannot be selected; selecting from the layer panel scrolls/zooms to the object.

## 10. Dialogs

- New map/project: name, size preset/custom width×height, grid type, starting preset.
- Import `.ds`: file picker/drop, preview report, target project/map, import mode (new project / new map).
- Export: as panel, but a modal preview for large exports and warnings.
- Apply to location: choose location (default current), pixels per cell, replace existing background confirmation, preserve markers/areas notice.
- Unsaved changes: Save / Discard / Cancel; “Save” honors autosave then closes.
- Delete project/map/layer: confirm with name and consequence; undo where possible.

## 11. Input and gestures

### Pointer

- One pointer: active tool.
- Two pointers: pinch zoom + pan; suppress tool gesture if second pointer arrives before commit.
- Long-press (touch, ~500 ms): context menu or selection menu.
- Double-tap: finish multi-point shape / enter text edit.
- Pen: pressure ignored for now; eraser tip can act as erase mode if supported.

### Mouse

- Left: draw/select; middle: pan; right: context menu; wheel: zoom; space: temporary pan; Alt: sample color/disable snap (decide per tool); Shift: constrain; Ctrl/Cmd: multi-select.

### Keyboard

See `01-feature-parity.md` section 13. Additional editor-wide:

- `Ctrl/Cmd+0`: fit map; `Ctrl/Cmd+1`: 100%; `Ctrl/Cmd+Shift+G`: ungroup? (G toggles group per docs).
- `R`/`C`/`W`/`D`/`T` select tools directly; `B` then `1–0`/`-` selects Pan, Object, Rectangle, Circle, Path, Polygon, Wall, Door, Stairs or Text.
- `E` toggles draw/erase; `S` toggles snap; `Shift+S` then `1–9` sets the division; `Shift+R` toggles rough mode.
- `G` groups/ungroups the selection; arrows nudge by `0.1` cell (Shift = `1`); `[`/`]` send to back/front; `Ctrl/Cmd+C`/`X`/`V` copy, cut and paste objects or selected geometry.
- Space+drag and middle-mouse drag pan temporarily; `=`/`+` zoom in and `-`/`_` zoom out from the viewport centre.
- `Escape`: cancel current gesture → clear selection → close panel.
- `Enter`: confirm multi-point shape/paste/text.
- `Tab`/`Shift+Tab`: cycle panels/controls; arrow keys navigate layer tree.
- `[`/`]`: context-dependent radius/sides/steps/z-order (documented in tooltips).
- `Delete`/`Backspace`: delete selection (not while text editing).

### Preventing conflicts

- Keyboard handling is disabled while focus is in an input/textarea/contenteditable.
- `touch-action: none` on canvas; wheel with Ctrl prevented for browser zoom inside the studio.
- Browser back navigation guard for unsaved changes.

## 12. Touch-specific affordances

- 44 px minimum targets; visible spacing between object handles.
- Larger selection outlines; handles outside the object bounds.
- Long-press context menu; action sheet for destructive actions.
- Toolbar is scrollable, not cramped; a “more tools” button if needed.
- Panels remember position but never cover the active selection; auto-pan when opening a sheet.
- Pinch zoom keeps the pinch midpoint anchored.
- No hover-only information: tooltips appear on long-press/focus, or are shown in settings.
- Text editing uses an HTML overlay with native keyboard and autocorrect; disable autocapitalize/autocorrect for map labels (configurable).
- Undo/redo always visible in the top bar.
- Haptics (optional, if supported) on snap/commit.

## 13. Accessibility

- Canvas has `role="application"` with instructions and an accessible name (“Map drawing canvas”).
- All toolbar/menu/panel controls are real buttons/inputs with labels and visible focus.
- Layer tree is the keyboard/screen-reader equivalent of canvas objects; supports rename, reorder (Alt+Arrow), hide/lock, select.
- Tool state exposed via `aria-pressed`/`aria-selected`.
- Announcements: save status, autosave errors, generation result, export result, mode changes (draw/erase), number of selected objects.
- Color pickers expose text inputs for hex values.
- Reduced motion: disable canvas animations/shimmer and panel transitions; keep essential feedback.
- High contrast: stronger handles, outlines and focus rings.
- Zoom up to 3200% for low-vision users; UI scale follows browser zoom.

## 14. Internationalization

- Dedicated `mapStudio` namespace in `src/i18n/locales/en.json` and `ru.json`.
- No concatenated sentences; use ICU plurals for “N objects selected”, “N rooms”.
- Units: cells by default; project setting can label cells as 5 ft/1.5 m; formatting via i18n.
- Keyboard shortcut labels adapt to macOS (`⌘`) vs Windows/Linux (`Ctrl`).
- Fonts: UI font from app theme; map fonts independent and not localized.

## 15. Error and empty states

- Empty library: create/open/import actions.
- Empty map: short quick-start hint + “draw a room” hint.
- No presets/images search results: clear filters action.
- Missing asset: inline warning on object + relink action.
- Autosave error: persistent banner with retry and “download project” fallback.
- Renderer unavailable: full-screen explanation with browser requirements and export? (cannot export without renderer).
- Export too large: warning with suggested lower PPC or area; PDF tiling option.

## 16. Visual design tokens

- Studio uses the app theme tokens (`--color-background`, `--color-text`, `--color-border-light`, primary/accent).
- Canvas surround uses a neutral checker/void; map background is document-defined.
- Toolbar/panels use compact density: 32 px rows desktop, 40–44 px touch.
- Icons from the Tabler Quasar icon set (`tabler-*`) where applicable.
- Panel transitions respect reduced motion.
- Focus rings must remain visible over the canvas; selection colors adapt to light/dark UI but not exported.

## 17. UX acceptance criteria

- A first-time user can draw a two-room dungeon with a door in under two minutes using only the visible toolbar.
- On a phone, the same flow works without a keyboard and without hover.
- Every action in the feature checklist is reachable in ≤ 2 taps/clicks from the main canvas or a panel.
- No destructive action lacks undo or confirmation.
- Opening any panel on mobile keeps the current selection visible.
