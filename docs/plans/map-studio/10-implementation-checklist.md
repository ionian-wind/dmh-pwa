# Map Studio — implementation checklist

This is the working checklist for the Map Studio. Tasks are marked as they are
implemented. The design documents are the source of truth for behavior.

Status: **in progress — editor surface, object interactions, shape selection, multi-select and infinite canvas working**

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
- [ ] Component tests for library/editor basics
- [x] Manual desktop smoke test
- [x] Type check, tests, coverage and production build

## M1 — Core drawing

- [x] Geometry pipeline: union/difference, shared walls, boundary extraction
- [x] Rectangle tool: erase, rough, corner radius
- [x] Circle / regular polygon tool
- [x] Path tool (click points, radius; freehand/smooth still pending)
- [x] Polygon tool
- [x] Wall tool (points; dash/smooth still pending)
- [x] Draw/erase mode, snap/division, corner radius and rough levels
- [x] Undo/redo for every drawing mutation
- [x] Classic dungeon preset + basic layer settings
- [x] Keyboard shortcuts for drawing tools

## M2 — Editor surface

- [x] Layer create/rename/reorder/delete/folders (drag-sorting with `@vue-dnd-kit/core`)
- [x] Full layer settings (floor/walls/grid/background)
- [x] Object tool: selection, live drag, resize/rotate handles for text/images, rotation for doors/stairs, shape selection, marquee and multi-object drag
- [ ] Grouping, z-order, flip, duplicate, context menu (z-order/flip/duplicate done)
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

## M5 — Random dungeon and advanced IO

- [ ] Random dungeon generator and settings
- [ ] Seeded generation and reproducibility
- [ ] Watabou and donjon imports
- [x] PDF export (UVTT pending)
- [x] Infinite canvas: viewport-driven background/grid, unlimited pan/zoom, content-bounds export and fit
- [ ] Multi-map projects and project bundles

## M6 — Touch, accessibility, polish

- [ ] Responsive desktop/tablet/mobile layouts
- [ ] Touch drawing, gesture handling and large handles
- [ ] Keyboard/screen-reader accessibility pass
- [ ] Onboarding, empty/error states and i18n
- [ ] Full manual QA and performance verification

## Progress log

| Date       | Item                 | Notes                                                                                                                                                                                                                                     |
| ---------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-10 | Plan moved into repo | Design docs complete                                                                                                                                                                                                                      |
| 2026-11-10 | M0 foundation        | Feature flag/routes, document model, Dexie repository, store/history/autosave, Pixi host/camera, grid/background, basic rectangle drawing, layers panel, PNG export, desktop smoke test                                                   |
| 2026-11-10 | M2 interactions      | Live object drag/resize/rotate, all-object rotation, shape selection, layer sorting/folders, marquee and multi-object drag                                                                                                                |
| 2026-11-10 | Infinite canvas      | Background/grid follow the viewport, drawing and hit-testing work outside the starting frame, export and fit use content bounds (2020 tests / 243 files; coverage branches 87.02%)                                                        |
| 2026-11-10 | Layer drag sorting   | Replace native layer drag/drop with `@vue-dnd-kit/core`: drag rows before/after, drop into folder middles, keep folder subtrees together, and align up/down buttons with sibling order (2031 tests / 245 files; coverage branches 87.04%) |
