# Map Studio — implementation checklist

This is the working checklist for the Map Studio. Tasks are marked as they are
implemented. The design documents are the source of truth for behavior.

Status: **in progress — editor surface, object interactions, shape selection, multi-select, infinite canvas and drag-sortable layer tree working**

## M0 — Foundation and vertical slice

### Dependencies and feature wiring

- [x] Add `pixi.js`, `polygon-clipping`, and `jspdf` dependencies
- [x] Add `VITE_FEATURE_MAP_STUDIO` to the feature catalog and `FeatureId`
- [x] Add map-studio integration, routes and navigation entry
- [x] Add map-studio i18n namespace
- [x] Add feature-flag build verification coverage

### Domain and persistence

- [x] Add document types (`StudioProject`, `StudioMap`, layers, shapes, styles)
- [x] Add factories and normalization for new maps/projects
- [x] Add `map_studio_*` Dexie stores and migration 21
- [x] Add project/map repository (CRUD, thumbnails, snapshots)
- [x] Add Pinia studio store with dirty state and undo/redo foundation
- [x] Add autosave composable with status

### Renderer and editor shell

- [x] Add Pixi application host and camera (pan/zoom/resize)
- [x] Add background/grid renderer
- [x] Add dungeon layer renderer (floor + walls)
- [x] Add rectangle tool with draw preview and commit
- [x] Add toolbar (pan, rectangle) and tool settings (snap/division)
- [x] Add layers panel with active layer, visibility and lock
- [x] Add editor route and library route
- [x] Add save/export PNG and apply-to-location bridge

### Verification

- [x] Unit tests for document normalization and shape validation
- [x] Repository tests with fake IndexedDB
- [x] Component tests for library/editor basics and map-studio panels
- [x] Manual desktop smoke test
- [x] Type check, tests, coverage and production build

## M1 — Core drawing

- [x] Geometry pipeline: union/difference, shared walls, boundary extraction
- [x] Rectangle tool: erase, rough post-draw strength, rounded preview, corner radius, shared-wall merging
- [x] Circle / regular polygon tool: sides slider/input, 1 = circle, point/edge orientation, live radius label, `[`/`]` and digit shortcuts
- [x] Path tool: click points, snap-off freehand, radius and `[`/`]` adjustment, smooth Catmull-Rom paths, post-draw rough strength
- [x] Polygon tool: click points, double-click/Enter close, click-first-point close, freehand drag when snap is off, smooth curved walls
- [x] Wall tool: click/freehand points, smooth curves, post-draw rough, dash and dash size, custom width
- [x] Draw/erase mode, snap/division, corner radius and rough levels
- [x] Undo/redo for every drawing mutation
- [x] Classic dungeon preset + basic layer settings
- [x] Keyboard shortcuts for drawing tools

## M2 — Editor surface

- [x] Layer create/rename/reorder/delete/folders (drag-sorting with `@vue-dnd-kit/core` v3)
- [x] Explicit add-folder button, per-layer menu (rename, move to root, delete), scrolling layer tree separate from settings
- [x] Folder rows use `folder-open`/`folder` icons and toggle on row click (no separate chevron)
- [x] Full layer settings (floor/walls/grid/background)
- [x] Object tool: click/Shift-click selection, marquee, grouped selection, live drag, group resize/rotate, nudge, copy/paste, context menu, z-order
- [x] Grouping/ungrouping, z-order, flip, duplicate and object context menu
- [x] Multi-object selection: combined selection bounds, group resize and group rotate
- [x] Multi-object batch panel: common opacity/rotation/type fields and batch duplicate, z-order, flip and delete actions
- [ ] Images panel, upload, drag/drop, favorites
- [x] Text tool: click-to-place inline editing, second-click edit, font/size/colour/alignment, drop shadow, object settings
- [x] Door tool: two-point placement, two variants, fill/stroke colours, rough outline, endpoint handles, object settings, UVTT portals
- [x] Stairs tool: three-point placement, steps-per-cell, stroke, rough, bracket/digit shortcuts, object settings
- [x] Geometry select tool: region select, mini menu, copy/cut/delete, paste preview with move/resize/rotate/flip, named Clipboard panel
- [x] Local library, autosave, multiple maps (crash recovery pending)
- [ ] `.ds` import/export baseline

## M3 — Styling

- [ ] Dungeon, world-building and custom presets
- [ ] Hatching, shading, shadows and blend modes
- [ ] Floor/background textures and paper overlay
- [ ] Isometric and hex grids
- [ ] Static layer render textures and performance pass

## M4 — Lighting and fog

- [ ] Lighting panel, presets and light objects
- [ ] Radial light rendering and ambient darkness
- [ ] Wall occlusion / blocks-light
- [ ] Fog of war layer and preview/export

## M5 — Advanced IO

- [ ] Watabou and donjon imports
- [x] PDF and UVTT export
- [x] Infinite canvas: viewport-driven background/grid, unlimited pan/zoom, content-bounds export and fit
- [x] Map-studio view split into header, presets, layers, layer settings and object settings components
- [x] UI/UX tests for folder creation, layer menus, visibility/lock, presets, layer style editing and object settings
- [x] Multi-map projects (project bundles pending)

## M6 — Touch, accessibility, polish

- [ ] Responsive desktop/tablet/mobile layouts
- [ ] Touch drawing, gesture handling and large handles
- [ ] Keyboard/screen-reader accessibility pass
- [ ] Onboarding, empty/error states and i18n
- [ ] Full manual QA and performance verification

## Progress log

| Date       | Item                         | Notes                                                                                                                                                                                                                                                         |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-10 | Plan moved into repo         | Design docs complete                                                                                                                                                                                                                                          |
| 2026-11-10 | M0 foundation                | Feature flag/routes, document model, Dexie repository, store/history/autosave, Pixi host/camera, grid/background, basic rectangle drawing, layers panel, PNG export, desktop smoke test                                                                       |
| 2026-11-10 | M2 interactions              | Live object drag/resize/rotate, all-object rotation, shape selection, layer sorting/folders, marquee and multi-object drag                                                                                                                                    |
| 2026-11-10 | Infinite canvas              | Background/grid follow the viewport, drawing and hit-testing work outside the starting frame, export and fit use content bounds (2020 tests / 243 files; coverage branches 87.02%)                                                                            |
| 2026-11-10 | Layer drag sorting           | Replace native layer drag/drop with `@vue-dnd-kit/core`: drag rows before/after, drop into folder middles, keep folder subtrees together, and align up/down buttons with sibling order (2031 tests / 245 files; coverage branches 87.04%)                     |
| 2026-11-10 | DnD v3 migration             | Migrate playlists and the map-studio layer tree to `@vue-dnd-kit/core` 3.1.0 with `DnDProvider`, `makeSortableList`/`makeSortableItem` and `makeSortableTree`                                                                                                 |
| 2026-11-10 | Layer UX + split             | Add-folder button, per-row rename/move/delete menu, folder-aware tree sorting, wider shorter layer panel with only the tree scrolling, and split the editor into header/presets/layers/settings components (2043 tests / 246 files; coverage branches 87.01%) |
| 2026-11-10 | Multi-select group bounds    | One outline and one handle set around all selected objects; group resize scales from the combined bounds and group rotate turns every object around the group centre                                                                                          |
| 2026-11-10 | Folder icon UX + plan update | Remove folder chevron; open/closed folder icons and row-click toggling; document current implemented/partial/missing parity and UI behavior                                                                                                                   |
| 2026-11-10 | Scope cleanup                | Moved random dungeon generation out of the implementation plan and milestones into `proposals/random-dungeon.md`; current scope is the editor, styling, lighting/fog and advanced IO                                                                          |
| 2026-11-10 | Multi-select batch panel     | Show shared properties for a multi-selection, mark mixed values, and provide batch duplicate/order/flip/delete actions (2064 tests / 248 files; coverage branches 87.02%)                                                                                     |
| 2026-11-10 | Circle tool parity           | Add sides (1 = circle, 3+ = regular polygon), point/edge orientation, snapped center/radius, live radius label, real polygon preview, and sides/rough shortcuts                                                                                               |
| 2026-11-10 | Polygon tool parity          | Add snap-off freehand polygons, close by clicking the first point, Enter/Z editing, and smooth curved polygon rings                                                                                                                                           |
| 2026-11-10 | Rectangle tool parity        | Add rounded drag preview, B+3/B+4/B+5/B+6/B+7/B+9/B+0/B+- shortcuts, E/S/Shift+S shortcuts, and post-draw rough strength for rectangle/circle/polygon (2069 tests / 248 files; coverage branches 87.02%)                                                      |
| 2026-11-10 | Path tool parity             | Add snap-off freehand paths, smooth Catmull-Rom expansion, radius bracket shortcuts, centreline preview and post-draw rough strength (2069 tests / 248 files; coverage branches 87.02%)                                                                       |
| 2026-11-10 | Pan and zoom parity          | Add B+1 pan, Space+drag temporary pan, middle-mouse pan confirmation, and `=`/`+`/`-` keyboard zoom (2071 tests / 248 files; coverage branches 87.04%)                                                                                                        |
| 2026-11-10 | Text tool validation         | Add inline placement/edit overlay, text tool style settings (font, size, colour, alignment, shadow), rendered alignment/shadow, and text bounds from content (2071 tests / 248 files; coverage branches 87.04%)                                               |
| 2026-11-10 | Object tool validation       | Add Shift-click multi-select, groups (`G`), arrow nudging, copy/paste, `[`/`]` z-order and a right-click object context menu (2075 tests / 248 files; coverage branches 87.02%)                                                                               |
| 2026-11-10 | Select tool validation       | Add separate Select tool with polygon/freehand regions, selection mini menu, geometry clipboard copy/cut/delete and draw/erase paste (2083 tests / 248 files; coverage branches 87.02%)                                                                       |
| 2026-11-10 | Wall tool validation         | Add snap-off freehand walls, smooth curves, post-draw rough, dashed strokes with continuous dash phase, and width/dash tool settings (2083 tests / 248 files; coverage branches 87.02%)                                                                       |
| 2026-11-10 | Clipboard and paste preview  | Add named clipboard clips with thumbnails, preview paste with move/resize/rotate/flip, Enter commit and Escape cancel                                                                                                                                         |
| 2026-11-10 | Door tool validation         | Add door variant, fill, stroke and rough tool settings, render both variants with styled panels, and mirror the fields in object settings (2086 tests / 248 files; coverage branches 87.00%)                                                                  |
| 2026-11-10 | Stairs tool validation       | Add steps-per-cell, stroke and rough tool settings, step shortcuts, styled rendering and object settings (2089 tests / 248 files; coverage branches 87.00%)                                                                                                   |
| 2026-11-10 | Left-side tool settings      | Move tool settings out of the bottom toolbar into the left sidebar under Presets/Clipboard; bottom toolbar now contains tools only (2091 tests / 249 files; coverage branches 87.00%)                                                                         |
| 2026-11-10 | Door gaps and UVTT           | Add independent door endpoint handles, UVTT portal export, and finish the left-sidebar tool settings layout                                                                                                                                                   |
