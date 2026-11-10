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
- [x] Rectangle tool: erase, rough, corner radius
- [x] Circle / regular polygon tool: sides slider/input, 1 = circle, point/edge orientation, live radius label, `[`/`]` and digit shortcuts
- [x] Path tool (click points, radius; freehand/smooth still pending)
- [x] Polygon tool
- [x] Wall tool (points; dash/smooth still pending)
- [x] Draw/erase mode, snap/division, corner radius and rough levels
- [x] Undo/redo for every drawing mutation
- [x] Classic dungeon preset + basic layer settings
- [x] Keyboard shortcuts for drawing tools

## M2 — Editor surface

- [x] Layer create/rename/reorder/delete/folders (drag-sorting with `@vue-dnd-kit/core` v3)
- [x] Explicit add-folder button, per-layer menu (rename, move to root, delete), scrolling layer tree separate from settings
- [x] Folder rows use `folder-open`/`folder` icons and toggle on row click (no separate chevron)
- [x] Full layer settings (floor/walls/grid/background)
- [x] Object tool: selection, live drag, resize/rotate handles for text/images, rotation for doors/stairs, shape selection, marquee and multi-object drag
- [ ] Grouping, z-order, flip, duplicate, context menu (z-order/flip/duplicate done)
- [x] Multi-object selection: combined selection bounds, group resize and group rotate
- [x] Multi-object batch panel: common opacity/rotation/type fields and batch duplicate, z-order, flip and delete actions
- [ ] Images panel, upload, drag/drop, favorites
- [x] Text tool: click + prompt placement (inline editing pending)
- [x] Door tool: two-point placement (variants pending)
- [x] Stairs tool: three-point placement (style editing pending)
- [ ] Geometry select tool, copy/cut/paste, clipboard (shape selection done)
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
- [x] PDF export (UVTT pending)
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
