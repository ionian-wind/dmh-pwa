# Map Studio — feature parity checklist

Legend: **P0** = foundation / must precede drawing, **P1** = core parity, **P2** = advanced parity, **P3** = polish/optional.

A checked box means “planned and specified”; implementation state is tracked separately.

## Implementation status snapshot

Updated 2026-11-10. This is a snapshot, not a replacement for the detailed tables below.

- **Implemented:** editor shell, library and multi-map projects, Pixi canvas, infinite canvas, pan/zoom/fit, background/grid, dungeon presets, rectangle/circle/polygon/path/wall tools, draw/erase, snapping, rough and corner radius, undo/redo, autosave, PNG/WebP/JPG/PDF export, apply-to-location, text/door/stairs/image objects, object selection/move/resize/rotate, multi-object selection with combined bounds and group resize/rotate, marquee selection, shape selection, layer tree with folders and drag sorting, layer visibility/lock/opacity/floor/wall/grid settings, outer-wall hatching, inner floor grids, background dot grids, wall shadows, shading, layer/object blend modes, touch/pointer input foundation.
- **Partial:** image workflow (upload and placement exist, no image library/favorites), text editing (prompt-based, not inline), door/stairs styling (variants/steps only), presets (built-in only, no custom preset management), layer/object context menus (core actions only), grouping and clipboard, mobile layouts.
- **Not implemented:** custom textures, lighting/fog, touch-first sheets, crash recovery UI, onboarding.
- **Deferred proposals:** `.ds` import/export, Watabou/donjon imports, isometric view and hex grids. See `proposals/`.
- **Deferred proposal:** random dungeon generation is documented in [proposals/random-dungeon.md](proposals/random-dungeon.md) and is not part of the current implementation task.

## 1. Editor shell and navigation

| ID       | Feature                      | Behavior to match                                                                           | Phase |
| -------- | ---------------------------- | ------------------------------------------------------------------------------------------- | ----- |
| SHELL-1  | Full-screen studio           | Editor owns the viewport with its own top menu, left panel, right panel and bottom toolbar. | P0    |
| SHELL-2  | File menu                    | New map, open library, save/export. `.ds` save/import is a deferred proposal.               | P1    |
| SHELL-3  | Edit menu                    | Undo, redo, cut/copy/paste, delete, duplicate.                                              | P0/P1 |
| SHELL-4  | View menu                    | Light/dark UI, hide UI, show/hide grids. Isometric is a deferred proposal and out of scope. | P1    |
| SHELL-5  | Help menu                    | Link to local feature documentation and keyboard shortcut reference.                        | P1    |
| SHELL-6  | Save status                  | Unsaved / saving / saved / error indicator, plus local autosave state.                      | P1    |
| SHELL-7  | Zoom controls                | Wheel, pinch, `+`/`-`, fit-to-map, 100%, zoom-to-selection.                                 | P0    |
| SHELL-8  | Pan                          | Middle mouse, space+drag, two-finger drag, pan tool, edge auto-pan while dragging.          | P0    |
| SHELL-9  | UI visibility                | Hide all chrome while keeping canvas active; restore with a floating button/shortcut.       | P1    |
| SHELL-10 | Responsive layout            | Desktop side panels → tablet drawers → mobile bottom sheets.                                | P0    |
| SHELL-11 | Document tabs / map switcher | Multiple maps in one project, with add/rename/duplicate/delete/import.                      | P2    |
| SHELL-12 | Dirty-state guard            | Close/refresh prompt for unsaved changes; autosave minimizes risk.                          | P1    |
| SHELL-13 | Recovery                     | Restore last autosaved state after a crash; keep local revision history (last N snapshots). | P2    |
| SHELL-14 | Onboarding                   | First-run quick start overlay and dismissible hints.                                        | P3    |

## 2. Toolbar and tools

| ID      | Tool                               | Required behavior                                                                                                 | Settings                                                                                 | Phase |
| ------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----- |
| TOOL-1  | Pan                                | Click-drag; temporary pan via space/middle mouse/two fingers.                                                     | none                                                                                     | P0    |
| TOOL-2  | Object                             | Select/move/resize/rotate images, text, doors, stairs, lights, groups and folders. Box + shift/ctrl multi-select. | snap?                                                                                    | P1    |
| TOOL-3  | Rectangle                          | Drag a rectangle; shared walls when adjacent; overlap merges; draw/erase; rough outline pass; rounded corners.    | mode, snap, division, rough, corner radius                                               | P1    |
| TOOL-4  | Circle / regular polygon           | Drag radius; live radius label in cells; sides 1 = circle; point/edge orientation; rough outline.                 | mode, snap, division, sides, draw-to, rough                                              | P1    |
| TOOL-5  | Path                               | Click points; freehand drag; double-click finish; self-overlap as brush; radius; smooth curves; draw/erase.       | mode, snap, division, radius, rough, smooth                                              | P1    |
| TOOL-6  | Polygon                            | Click points; freehand when snap off; close shape; smooth curved edges; draw/erase; rough.                        | mode, snap, division, rough, smooth                                                      | P1    |
| TOOL-7  | Wall                               | Add standalone wall/line annotations; click/drag; smooth; dashed; draw/erase; rough.                              | mode, snap, division, rough, smooth, dash                                                | P1    |
| TOOL-8  | Select (geometry)                  | Draw a polygon/freehand region to select dungeon geometry; copy/cut/delete; paste with transform; erase-paste.    | mode, snap, division                                                                     | P2    |
| TOOL-9  | Door                               | Click two points to set position/width; variants; fill/stroke; rough; placed as object.                           | snap, division, variant, fill, stroke, rough                                             | P1    |
| TOOL-10 | Stairs                             | Three clicks: top step width + bottom step position; steps per cell; stroke; rough.                               | snap, division, steps, stroke, rough                                                     | P1    |
| TOOL-11 | Text                               | Click to place; type inline; font, size, color, alignment, shadow; edit by second click.                          | snap, division, font, size, color, alignment, shadow                                     | P1    |
| TOOL-12 | Stamp                              | Select image, then click/drag to scatter random duplicates.                                                       | snap, division, size min/max, rotation min/max, repeat ms, color, color variance, shadow | P2    |
| TOOL-13 | Eyedropper (implied by styling)    | Pick a style/color from canvas into the current tool settings.                                                    | n/a                                                                                      | P2    |
| TOOL-14 | Measure (implied by radius labels) | Optional ruler in cells/feet; does not mutate the document.                                                       | unit, grid                                                                               | P3    |
| TOOL-15 | Temporary tool override            | Hold a modifier (e.g. Space) to pan, Alt to sample, Shift for constrained angles.                                 | n/a                                                                                      | P1    |

### Global drawing behavior

- **Draw/Erase mode** per tool (`E`).
- **Snap** on/off (`S`) with division `1/1 … 1/9` (`Shift+S` then digit).
- **Rough mode** levels off/1/2/3 (`Shift+R`), with a post-draw cursor-distance step.
- **Smooth mode** overriding straight segments (documented as overriding snap).
- **Remove last point** (`Z`) during multi-point drawing.
- **Finish** with double-click; cancel with `Escape`.
- **Constrain** angles with Shift; constrain square/circle with Shift.
- **Live labels** for radius/cells and angle.
- **Preview** rendered in an overlay; commit only on finish, one undo entry per completed shape.
- **Touch**: tap points, drag freehand, double-tap finish, long-press cancel/menu.

## 3. Tool settings panel

| ID     | Setting             | Behavior                                                                       | Phase |
| ------ | ------------------- | ------------------------------------------------------------------------------ | ----- |
| SET-1  | Mode                | Draw / Erase.                                                                  | P1    |
| SET-2  | Snap + Division     | Snap to fractional grid; per-tool persistence.                                 | P1    |
| SET-3  | Rough               | Off/1/2/3 and post-draw roughening.                                            | P2    |
| SET-4  | Smooth              | Curved segments; hide/disable snap when active.                                | P2    |
| SET-5  | Radius              | Path radius in cells; `[`/`]`; typed value.                                    | P1    |
| SET-6  | Sides               | Regular polygon 1–12; `[`/`]`; typed value.                                    | P1    |
| SET-7  | Draw to             | Point / Edge orientation.                                                      | P1    |
| SET-8  | Corner radius       | Rounded rectangle corners in cells.                                            | P1    |
| SET-9  | Dash                | Wall dash on/off and dash size.                                                | P1    |
| SET-10 | Steps per cell      | Stairs density.                                                                | P1    |
| SET-11 | Door variant        | Two visual variants.                                                           | P1    |
| SET-12 | Colors              | Fill/stroke/background color with alpha; recent colors; hex input; eyedropper. | P1    |
| SET-13 | Text typography     | Font family, size, color, alignment, drop shadow.                              | P1    |
| SET-14 | Stamp randomization | Size range, rotation range, repeat speed, color variance, shadow.              | P2    |
| SET-15 | Preserve per tool   | Tool settings survive tool switches and map reopen (per user config).          | P2    |

## 4. Sidebar menu features

| ID     | Panel            | Required behavior                                                                                                                                                                | Phase |
| ------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| SIDE-1 | Scrawl / Presets | Dungeon presets, world-building presets, custom presets. Hover actions: add layer / apply to current. Preview thumbnails.                                                        | P1/P2 |
| SIDE-2 | Images           | Sections: Favorites, Custom Images, Free/Built-in Images. Search, creator/category filter, collapse sections, tooltips. Click to place; drag/drop uploads at pointer; favorites. | P1/P2 |
| SIDE-3 | Clipboard        | Session list of copied geometry fragments with thumbnails; click to paste; clear; survives tool changes but not reload (or persisted locally as enhancement).                    | P2    |
| SIDE-4 | Textures         | Paper texture overlay on the whole map: on/off, texture grid, scale, opacity, attribution.                                                                                       | P2    |
| SIDE-5 | Lighting         | Enable lighting; add light presets (Light, Torch, Lamp, Continual Flame, Lantern, Other); radius, bright radius, color, intensity; move with Object tool.                        | P2/P3 |
| SIDE-6 | Random Dungeon   | Size, room count, room size, corridor length/width, layout, door density, room shapes, roughness; generate; confirm replace.                                                     | P2    |
| SIDE-7 | Export / Sharing | PNG/WebP/JPG/PDF/UVTT; filename; px/cell; export area; reset area; local share via file.                                                                                         | P1/P2 |
| SIDE-8 | Maps settings    | Project map list: add/rename/duplicate/delete/import maps.                                                                                                                       | P2    |
| SIDE-9 | Local library    | Thumbnail grid, recent order, open/rename/duplicate/delete, new map.                                                                                                             | P1    |

## 5. Layers

| ID       | Feature             | Behavior                                                                                                | Phase |
| -------- | ------------------- | ------------------------------------------------------------------------------------------------------- | ----- |
| LAYER-1  | Layer types         | Dungeon, background, fog of war, images folder/folders.                                                 | P1/P2 |
| LAYER-2  | Defaults            | New map creates a dungeon layer + background layer.                                                     | P1    |
| LAYER-3  | Create              | New layer from a preset (add above current).                                                            | P1    |
| LAYER-4  | Rename              | Double-click name.                                                                                      | P1    |
| LAYER-5  | Reorder             | Drag and drop, send to front/back.                                                                      | P1    |
| LAYER-6  | Folders             | Create, nest, drag layers/folders into folders, expand/collapse.                                        | P2    |
| LAYER-7  | Visibility          | Eye toggle; hiding folder hides children.                                                               | P1    |
| LAYER-8  | Lock                | Padlock per layer/folder; locked objects cannot be selected. Background lock prevents preset overwrite. | P1    |
| LAYER-9  | Duplicate / delete  | Context menu and panel actions.                                                                         | P1    |
| LAYER-10 | Multi-select        | Shift range + Ctrl/Cmd toggle; canvas and panel stay in sync; bulk duplicate/delete/move/group/lock.    | P2    |
| LAYER-11 | Active layer        | New drawings/objects go into the selected layer or selected folder.                                     | P1    |
| LAYER-12 | Canvas ↔ panel sync | Selecting object highlights its layer; selecting layer highlights its objects.                          | P2    |
| LAYER-13 | Layer settings      | See section 6.                                                                                          | P1    |
| LAYER-14 | Resizable panel     | Drag bottom edge/resize handle.                                                                         | P2    |

## 6. Layer settings and styles

| ID       | Setting            | Behavior                                                                                                                       | Phase |
| -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----- |
| STYLE-1  | Layer opacity      | Whole-layer opacity.                                                                                                           | P1    |
| STYLE-2  | Floor fill         | Color / transparent.                                                                                                           | P1    |
| STYLE-3  | Floor texture      | Masked procedural or uploaded texture: type, color/BW, scale, rotation, color blend.                                           | P2    |
| STYLE-4  | Walls              | Color, width, roughness, blocks-light toggle, optional hide section.                                                           | P1/P2 |
| STYLE-5  | Grid               | Type (square/hex/dots/none), variant, color, width, radius; per-layer and background.                                          | P1/P2 |
| STYLE-6  | Shadow             | Opacity, X/Y offset, color, blend mode.                                                                                        | P2    |
| STYLE-7  | Hatching           | Variant, size, stroke color, width.                                                                                            | P2    |
| STYLE-8  | Shading            | Size, roughness, fill color.                                                                                                   | P2    |
| STYLE-9  | Blend modes        | Normal, Add, Multiply, Screen for layer/objects.                                                                               | P2    |
| STYLE-10 | Background         | Color, opacity, square grid, background texture. Hex/isometric are deferred proposals.                                         | P1    |
| STYLE-11 | Fog of war         | Opacity, fog color, draw/erase fog geometry, export visibility.                                                                | P2    |
| STYLE-12 | Advanced/unpack    | A dungeon layer can be expanded into sublayers (floor/walls/grid/shadow/hatching/shading) with individual visibility/settings. | P3    |
| STYLE-13 | Preset application | Apply preset to current layer or add new layer; preview.                                                                       | P1/P2 |
| STYLE-14 | Custom presets     | Save current layer style, rename, update, delete.                                                                              | P2    |

## 7. Objects

| ID     | Feature        | Behavior                                                                 | Phase |
| ------ | -------------- | ------------------------------------------------------------------------ | ----- |
| OBJ-1  | Select         | Click, marquee, shift/ctrl; bounding box with 8 handles + rotate handle. | P1    |
| OBJ-2  | Move           | Drag or arrow keys; snapping; multi-object.                              | P1    |
| OBJ-3  | Resize         | Corner/edge handles; preserve aspect with Shift.                         | P1    |
| OBJ-4  | Rotate         | Rotate handle; snap to 15° with Shift; typed angle.                      | P1    |
| OBJ-5  | Group/Ungroup  | `G`, group selection container; nested groups.                           | P2    |
| OBJ-6  | Z-order        | Bring front/send back, context menu; per-layer order.                    | P1    |
| OBJ-7  | Flip           | Horizontal/vertical.                                                     | P1    |
| OBJ-8  | Duplicate      | Copy/paste, `Ctrl+D`, context menu; paste offset.                        | P1    |
| OBJ-9  | Delete         | Delete/Backspace; confirmation for multi-object? no, undoable.           | P1    |
| OBJ-10 | Context menu   | Duplicate, front/back, flip, delete; touch long-press.                   | P1    |
| OBJ-11 | Lock           | Per object; cannot select/move until unlocked.                           | P1    |
| OBJ-12 | Visibility     | Per object eye toggle in layer panel.                                    | P1    |
| OBJ-13 | Shadows        | Toggle, offset, color, opacity, blend mode; bulk apply.                  | P2    |
| OBJ-14 | Image tint     | Color overlay/HSL adjustment.                                            | P2    |
| OBJ-15 | Text editing   | Inline overlay editor, caret, IME support, multiline.                    | P1    |
| OBJ-16 | Door editing   | Variant, fill, stroke, rough after placement.                            | P1    |
| OBJ-17 | Stairs editing | Steps, stroke, rough after placement.                                    | P1    |
| OBJ-18 | Light editing  | Radius, bright radius, color, intensity after placement.                 | P2    |

## 8. Selection tool (geometry copy/paste)

| ID    | Feature               | Behavior                                                     | Phase |
| ----- | --------------------- | ------------------------------------------------------------ | ----- |
| SEL-1 | Region selection      | Polygon/freehand region over dungeon geometry.               | P2    |
| SEL-2 | Mini menu             | Copy, cut, delete above selection.                           | P2    |
| SEL-3 | Paste                 | Paste preview with move/resize/rotate/flip.                  | P2    |
| SEL-4 | Confirm/cancel        | Enter/Escape; touch buttons.                                 | P2    |
| SEL-5 | Erase paste           | Paste in erase mode to subtract copied region.               | P2    |
| SEL-6 | Clipboard panel       | Save selection to session clipboard with thumbnail.          | P2    |
| SEL-7 | Build outside dungeon | Paste selection on another layer/area as a stamp-like shape. | P2    |

## 9. Images

| ID     | Feature                | Behavior                                                                          | Phase |
| ------ | ---------------------- | --------------------------------------------------------------------------------- | ----- |
| IMG-1  | Built-in library       | Bundled images organized by category/creator, searchable, thumbnails, tooltips.   | P2    |
| IMG-2  | Upload                 | File picker and drag/drop; placed at pointer; dedupe by file hash where possible. | P1    |
| IMG-3  | Placement              | Click image then click canvas; object at pointer, default scale.                  | P1    |
| IMG-4  | Transform              | Move/scale/rotate/flip via Object tool.                                           | P1    |
| IMG-5  | Color                  | Tint/recolor in Layer Settings.                                                   | P2    |
| IMG-6  | Shadow                 | Drop shadow settings.                                                             | P2    |
| IMG-7  | Favorites              | Local favorites, no account.                                                      | P2    |
| IMG-8  | Locking                | Lock image layer.                                                                 | P1    |
| IMG-9  | Grouping               | Group multiple images.                                                            | P2    |
| IMG-10 | Bulk edit              | Multi-select and edit shared properties.                                          | P2    |
| IMG-11 | Missing asset recovery | Relink missing image files; placeholder display.                                  | P2    |

## 10. Textures, lighting and fog

| ID   | Feature             | Behavior                                                         | Phase |
| ---- | ------------------- | ---------------------------------------------------------------- | ----- |
| FX-1 | Paper texture       | Full-map overlay, texture selection, scale, opacity.             | P2    |
| FX-2 | Background textures | Procedural grass/water/snow/etc. + upload; scale/blend.          | P3    |
| FX-3 | Lighting enable     | Global toggle; only rendered when enabled.                       | P2    |
| FX-4 | Light presets       | Light/Torch/Lamp/Continual Flame/Lantern/Other with 5e radii.    | P2    |
| FX-5 | Light zones         | Bright radius at 100%, dim to outer radius at 50%, fade to zero. | P2    |
| FX-6 | Light movement      | Object tool.                                                     | P2    |
| FX-7 | Light blocking      | Per dungeon layer “blocks light”; wall occlusion.                | P3    |
| FX-8 | Fog layer           | Draw/erase fog; editor shows fog; export options.                | P2    |

## 11. Save, library, import and export

| ID    | Feature                | Behavior                                                                           | Phase |
| ----- | ---------------------- | ---------------------------------------------------------------------------------- | ----- |
| IO-1  | Local project library  | Thumbnail grid, recent first, new/open/rename/duplicate/delete.                    | P1    |
| IO-2  | Autosave               | Debounced local save with status; crash recovery snapshots.                        | P1    |
| IO-3  | Manual `.ds` save/open | Deferred proposal — see `proposals/ds-import-export.md`.                           | —     |
| IO-4  | Multi-map project      | Add/rename/duplicate/delete maps inside a project; import maps from another `.ds`. | P2    |
| IO-5  | PNG                    | Export area, px/cell, filename.                                                    | P1    |
| IO-6  | WebP/JPG               | Same pipeline, quality controls for lossy.                                         | P2    |
| IO-7  | PDF                    | Paper size, margin, print resolution, cell size; tiled pages.                      | P2    |
| IO-8  | UVTT                   | Image + walls/doors/lights in Universal VTT JSON zip.                              | P3    |
| IO-9  | Local share            | Export a bundle/link-free copy; no public URL.                                     | P2    |
| IO-10 | Apply to location      | Bake image and update `LocationMap.fileId`; preserve markers/areas.                | P1    |
| IO-11 | Watabou import         | Deferred proposal — see `proposals/generator-imports.md`.                          | —     |
| IO-12 | donjon import          | Deferred proposal — see `proposals/generator-imports.md`.                          | —     |
| IO-13 | Print/PDF preview      | Show export bounds overlay and computed dimensions.                                | P2    |

## 12. Random dungeon (deferred proposal)

> Out of current scope. See [proposals/random-dungeon.md](proposals/random-dungeon.md).

| ID     | Feature               | Behavior                                                                                      | Phase |
| ------ | --------------------- | --------------------------------------------------------------------------------------------- | ----- |
| RND-1  | Generate              | Replace current map after confirmation; one undo entry? (generation is a new document state). | P2    |
| RND-2  | Size                  | Small/medium/large; small fits Roll20 50×50 equivalent.                                       | P2    |
| RND-3  | Room count            | Few/some/many/lots.                                                                           | P2    |
| RND-4  | Room size             | Cramped/standard/spacious.                                                                    | P2    |
| RND-5  | Corridor length/width | Compact/sprawling; narrow/wide.                                                               | P2    |
| RND-6  | Layout                | Straight/forking/balanced/winding.                                                            | P2    |
| RND-7  | Door density          | None to many.                                                                                 | P2    |
| RND-8  | Room shapes           | Square/irregular/rounded multi-select.                                                        | P2    |
| RND-9  | Roughness             | None to heavy.                                                                                | P2    |
| RND-10 | Seed/reproduce        | Show/edit seed; regenerate identical layout.                                                  | P2    |
| RND-11 | Editable output       | Generated rooms are normal geometry/objects, fully editable.                                  | P2    |

## 13. Keyboard and gestures

| Category           | Desktop                                     | Touch equivalent         |
| ------------------ | ------------------------------------------- | ------------------------ |
| Pan                | Middle drag, Space+drag                     | Two-finger drag          |
| Zoom               | Wheel, pinch (trackpad), `+`/`-`            | Pinch                    |
| Undo/redo          | `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` / `Ctrl+Y` | Buttons                  |
| Save               | `Ctrl/Cmd+S`, `Shift+Ctrl/Cmd+S`            | File menu                |
| Open               | `Ctrl/Cmd+O`                                | Library button           |
| Tools              | `R`, `C`, `W`, `D`, `T`, `B+1..0/-`         | Toolbar                  |
| Mode               | `E`                                         | Tool-settings toggle     |
| Snap               | `S`, `Shift+S` + digit                      | Toggle + division picker |
| Rough              | `Shift+R`                                   | Tool-settings toggle     |
| Smooth             | per-tool toggle                             | Tool-settings toggle     |
| Radius/sides/steps | `[`/`]`, digits                             | Slider/stepper           |
| Remove point       | `Z`                                         | Undo-point button        |
| Copy/cut/paste     | `Ctrl/Cmd+C/X/V`                            | Selection menu           |
| Group              | `G`                                         | Selection menu           |
| Delete             | Backspace/Delete                            | Selection menu           |
| Z-order            | `[`/`]`                                     | Context menu             |
| Nudge              | Arrow keys                                  | Drag with snap           |
| Confirm paste      | Enter                                       | Check button             |
| Cancel             | Escape                                      | X button                 |
| Context menu       | Right-click                                 | Long-press               |

## 14. Accessibility and localization

- Every icon-only control has an `aria-label` and tooltip; visible focus rings.
- Panels are reachable and dismissible by keyboard; focus trap only in modals.
- Canvas editor exposes an accessible “object list” panel (layers) as the keyboard alternative to direct manipulation.
- Color is never the only indicator (selected, locked, hidden have shapes/icons).
- All strings go through `vue-i18n`; Russian and English at minimum.
- Reduced motion disables decorative animations (light shimmer, panel transitions).

## 15. Deferred/post-parity ideas

- Collaboration, comments, version diffing.
- Public gallery and share links.
- VTT integrations.
- Auto-tiling/terrain transitions beyond stylized floors.
- 3D preview.
