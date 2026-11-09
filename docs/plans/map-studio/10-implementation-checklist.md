# Map Studio — implementation checklist

This is the working checklist for the Map Studio. Tasks are marked as they are
implemented. The design documents are the source of truth for behavior.

Status: **in progress — M0 foundation + shared-wall geometry and core shape tools (circle/polygon) working**

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
- [ ] Rectangle tool: erase, rough, corner radius
- [x] Circle / regular polygon tool
- [ ] Path tool (click/freehand, radius, smooth)
- [x] Polygon tool
- [ ] Wall tool (dash/smooth)
- [x] Draw/erase mode, snap/division, angle constraints
- [x] Undo/redo for every drawing mutation
- [ ] Classic dungeon preset + basic layer settings
- [ ] Keyboard shortcuts for drawing tools

## M2 — Editor surface

- [ ] Layer create/rename/reorder/delete/folders
- [ ] Full layer settings (floor/walls/grid/background)
- [ ] Object tool selection/move/resize/rotate
- [ ] Grouping, z-order, flip, duplicate, context menu
- [ ] Images panel, upload, drag/drop, favorites
- [ ] Text tool with inline editing overlay
- [ ] Door and stairs tools
- [ ] Geometry select tool, copy/cut/paste, clipboard
- [ ] Local library, autosave, recovery, multiple maps
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
- [ ] PDF and UVTT export
- [ ] Multi-map projects and project bundles

## M6 — Touch, accessibility, polish

- [ ] Responsive desktop/tablet/mobile layouts
- [ ] Touch drawing, gesture handling and large handles
- [ ] Keyboard/screen-reader accessibility pass
- [ ] Onboarding, empty/error states and i18n
- [ ] Full manual QA and performance verification

## Progress log

| Date       | Item                 | Notes                                                                                                                                                                                   |
| ---------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-10 | Plan moved into repo | Design docs complete                                                                                                                                                                    |
| 2026-11-10 | M0 foundation        | Feature flag/routes, document model, Dexie repository, store/history/autosave, Pixi host/camera, grid/background, basic rectangle drawing, layers panel, PNG export, desktop smoke test |
