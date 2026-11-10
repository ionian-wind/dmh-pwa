# Map Studio — testing, rollout, milestones and risks

## 1. Delivery strategy

- New feature module behind `VITE_FEATURE_MAP_STUDIO`.
- Build vertically: shell → one dungeon layer → rectangle tool → save/export as early as possible. This validates the hardest integration (Pixi, persistence, location bake) before adding breadth.
- Keep the existing maps feature untouched except for an optional launcher and a one-way “apply image” API.
- Each milestone ends with a usable vertical slice and tests.
- Prefer correctness/simplicity over premature GPU optimization; profile on realistic maps before designing shaders/workers.

## 2. Milestones

### M0 — Foundation and de-risking (P0)

- Add `pixi.js`, `polygon-clipping`, `jspdf`.
- Feature catalog flag, route `/map-studio`, nav/library skeleton.
- Pixi `Application` host, camera pan/zoom, resize, context-loss handling.
- Plain document model + normalization + basic store/history.
- Render a single dungeon layer with a rectangle and background/grid.
- Save/load one document in Dexie; export PNG and apply to a location.

**Gate:** create a room, reload, export PNG, set as location background; existing markers/areas still work.

### M1 — Core drawing (P1)

- Geometry engine: union/difference, shared walls, paths, circles, polygons, rough/smooth, snapping.
- Tools: rectangle, circle/regular polygon, path, polygon, wall; draw/erase; tool settings.
- Undo/redo, dirty state, keyboard shortcuts.
- Basic dungeon preset (Classic Hatching) + editable walls/floor/grid style.
- Desktop UI shell: top menu, left/right panels, bottom toolbar.

**Gate:** two adjacent rooms share a wall; door-ready map can be drawn and exported; undo covers every mutation.

### M2 — Full editor surface (P1)

- Layers: create/rename/reorder/hide/lock/delete/folders, active layer/folder.
- Layer Settings: opacity, floor, walls, grid, background, sections, preset apply.
- Objects: images, text, doors, stairs; select/move/resize/rotate/group/flip/z-order/context menu.
- Images panel with upload, drag/drop, favorites, search.
- Selection tool + clipboard; copy/cut/paste geometry.
- Local library, autosave, recovery, multiple maps.
- Export: PNG/WebP/JPG, area, PPC; `.ds` import/export baseline.

**Gate:** a decorated dungeon with doors, text and images is fully editable, undoable, autosaved, and reopenable.

### M3 — Styling and visual depth (P2)

- Full preset library (dungeon + world-building + custom).
- Hatching, shading, shadows, blend modes, floor/background textures, paper overlay.
- Isometric and hex grids.
- Masked textures/procedural patterns.
- Performance pass: layer RenderTextures, hit-test spatial index, ticker on demand.

**Gate:** desktop 500-shape map pans at 60 fps; styles match the reference behavior.

### M4 — Lighting and fog (P2/P3)

- Lighting panel, presets, add/move/delete, ambient darkness.
- Radial lighting, then wall occlusion/block light.
- Fog of war layer and preview/export options.
- Mobile performance fallback (lower light resolution).

**Gate:** a torch-lit room with lit/dim zones and wall shadows exports correctly.

### M5 — Advanced IO (P2/P3)

- Watabou/donjon imports. Random dungeon generation is a deferred proposal and is not part of this milestone.
- PDF and UVTT export.
- Multi-map project import/export, project bundles.

**Gate:** import a dungeon, edit it, export PDF/UVTT.

### M6 — Touch/mobile parity, accessibility and polish (P2/P3)

- Responsive panels/sheets, touch gestures, large handles, keyboard-safe text editing.
- Accessibility pass, i18n, reduced motion, focus.
- Onboarding, empty states, error states.
- Full regression/perf pass on mobile devices.

**Gate:** a complete map can be created and exported on a phone; no hover-only actions; keyboard/screen reader can perform core flows.

## 3. Task breakdown (implementation checklist)

### 3.1 Foundation

- [ ] Add dependencies and feature flag/catalog entry.
- [ ] Create `src/map-studio/` module, route, nav, i18n.
- [ ] Document types/factories/normalize.
- [ ] Dexie stores/migrations + repository.
- [ ] Store + command history.
- [ ] Pixi application host + camera + resize.
- [ ] Scene builder with background/grid/dungeon placeholder.
- [ ] Export PNG + apply-to-location.

### 3.2 Geometry

- [ ] Snapping/constraints/coordinate transforms.
- [ ] Shape sampling (rect/polygon/path/regular polygon/wall).
- [ ] Rough/smooth deterministic sampling.
- [ ] Path expansion, dash generation.
- [ ] Boolean union/difference + boundary extraction.
- [ ] Bounds/spatial index.
- [ ] Geometry caching/revision.

### 3.3 Tools

- [ ] Tool registry/controller interface/context.
- [ ] Pan, rectangle, circle/polygon, path, polygon, wall.
- [ ] Draw/erase, snap/division, rough/smooth, sides/radius/radius steps.
- [ ] Object tool + handles + group/transform.
- [ ] Door, stairs, text, stamp.
- [ ] Select tool + clipboard + paste.
- [ ] Tool settings UI and persistence.
- [ ] Hotkeys and touch gestures.

### 3.4 Rendering

- [ ] Dungeon passes: floor/walls/grid/shadow/hatching/shading.
- [ ] Background/grid/isometric/hex.
- [ ] Procedural textures + upload/cache.
- [ ] Text rendering + editing overlay.
- [ ] Image sprites/tint/shadows.
- [ ] Selection/preview overlays.
- [ ] Lighting + fog.
- [ ] Static layer caches + render-on-demand.
- [ ] Export/thumbnail renderer.

### 3.5 Layers and UI

- [ ] Left panel rail + Presets/Images/Clipboard/Textures/Lighting/Random/Export/Maps.
- [ ] Right layer tree + settings.
- [ ] Top menu, toolbar, status bar.
- [ ] Desktop/tablet/mobile layouts.
- [ ] Dialogs and context menus.
- [ ] Accessibility/i18n.

### 3.6 Data and IO

- [ ] Library CRUD/thumbnails/search.
- [ ] Autosave/recovery/snapshot retention.
- [ ] Native bundle import/export.
- [ ] `.ds` import/export.
- [ ] PNG/WebP/JPG/PDF/UVTT.
- [ ] Watabou/donjon import.
- [ ] Apply-to-location and asset cleanup.
- [ ] Backup/restore integration.

### 3.7 Quality

- [ ] Unit tests for geometry/tools/history/serialization.
- [ ] Playwright desktop + mobile flows.
- [ ] Performance profiling/tuning.
- [ ] Accessibility audit.
- [ ] Feature-flag build verification.
- [ ] Documentation (help center + feature docs).

## 4. Testing strategy

### Unit (Vitest)

- Geometry operations with small hand-computed fixtures.
- Deterministic rough/smooth/seed snapshots.
- Snapping across square/hex and divisions.
- Tool state machine with synthetic pointer sequences (preview, commit, cancel, undo).
- Command apply/invert/coalesce; history limits.
- Normalize/migrate documents; corrupt/future/unknown fields.
- Persistence repository with fake IndexedDB (existing setup).
- Export math: area/PPC/page tiling/UVTT coordinates.
- `.ds`/Watabou/donjon import fixtures.

### Integration (Vitest + Vue Test Utils)

- Store + UI panels: tool selection, settings, layer operations, selection actions.
- Library/autosave/recovery.
- Apply-to-location updates only `fileId` and preserves marker/area/layer data.
- Export dialog validation.
- Touch-specific UI logic (sheets, action bars) via component tests.

### End-to-end (Playwright)

Desktop:

- First map quick start: draw two rooms, door, text, undo/redo, export.
- Layer create/hide/lock/reorder; preset apply.
- Object transform/group/z-order.
- Save → reload → compare document/visual snapshot.
- Import `.ds` fixture → edit → export.

Mobile:

- Open library, create map, draw a room with touch, pinch/pan, add a door via bottom sheet, export; text with native keyboard.
- Verify no hover-only controls and minimum touch targets.

Visual:

- Pixel snapshot for a fixture map at fixed PPC (allow small antialias tolerance).
- Lighting/fog snapshots.
- Thumbnail generation.

Performance:

- Synthetic 1k/5k-shape maps; measure compile, first frame, pan FPS, export time.
- Playwright performance traces on CI optional; local benchmark script with budgets.

### Feature-flag verification

- `npm run features:verify` (existing script) must prove studio chunks/routes are absent when disabled and present when enabled.

## 5. Performance budgets

| Operation             | Desktop target | Mobile target |
| --------------------- | -------------- | ------------- |
| Open 30×30 map        | < 800 ms       | < 1.5 s       |
| First draw paint      | < 50 ms        | < 100 ms      |
| Pan/zoom 500 shapes   | 60 fps         | 30+ fps       |
| Pan/zoom 5,000 shapes | 30+ fps        | 20+ fps       |
| Compile 500 shapes    | < 100 ms       | < 300 ms      |
| Export 50×50 @70 PPC  | < 2 s          | < 5 s         |
| Export 50×50 @140 PPC | < 5 s          | < 12 s / warn |
| Autosave document     | < 100 ms       | < 250 ms      |

If budgets are exceeded: profile, cache static layers, reduce resolution, move geometry to a worker, simplify previews.

## 6. Risks and mitigations

| Risk                         | Impact                         | Mitigation                                                                                |
| ---------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| Boolean geometry performance | Jank on large maps             | Incremental/static caches, chunked worker compile, lazy compile, spatial buckets, limits. |
| Pixi v8 WebGPU differences   | Rendering bugs on some devices | Force WebGL initially; test both; abstract renderer; feature-detect.                      |
| Touch precision              | Frustrating on phones          | Large handles, undo-point, previews, settings sheets, touch e2e tests.                    |
| Text/IME/Pixi mismatch       | Bad text editing               | HTML overlay editor; commit to Pixi Text; test IME/multiline.                             |
| Font availability            | Export differs                 | Bundle default fonts, font loading before export, fallback.                               |
| `.ds` fidelity               | User expectations              | Document best-effort conversion and report; do not claim exact round-trip.                |
| Large assets/storage         | Quota/performance              | Asset size limits, OPFS via existing storage, cleanup, project size UI.                   |
| Scope size                   | Long delivery                  | Milestones, feature flag, parity matrix, avoid cloud/VTT scope.                           |
| Autosave conflicts/multi-tab | Data loss                      | Debounced saves, snapshot history, locking warning/takeover.                              |
| Undo memory                  | Crashes                        | Limit count/memory; snapshots for huge ops; compress inverse commands.                    |
| Lighting occlusion cost      | Slow mobile                    | Resolution scaling, cached visibility, disable occlusion on low-end.                      |
| Accessibility regressions    | Exclusion                      | Layer-tree alternative, manual audits, automated axe checks where possible.               |

## 7. Rollout

1. Internal flag `VITE_FEATURE_MAP_STUDIO=true` in development only.
2. Feature-flag build check and test suite.
3. Alpha: studio-only maps and export; apply-to-location hidden behind a second flag if needed.
4. Beta: full parity checklist, touch pass, performance pass.
5. Enable by default; keep the flag for build exclusions.
6. Document in help center and feature README; add a home card/nav entry.

## 8. Definition of done

- All items in `01-feature-parity.md` implemented or explicitly deferred with rationale, except out-of-scope cloud/Roll20 items.
- Full unit/integration/e2e suite green; coverage meets project thresholds.
- Feature-flag builds verified.
- Desktop and mobile manual QA against the quick start and a complex map.
- Documentation completed (user guide + architecture/feature docs).
- No known data-loss bugs; recovery tested.
- Performance budgets met or documented with an approved exception.

## 9. Open questions for implementation kickoff

- Whether “Map Studio” should be its own primary nav item or live under the Scribe group (the nav is currently flat).
- Exact default map size (30×30 vs 50×50) and default preset.
- Whether custom presets/tool settings are global or per project.
- Whether `.ds` import should create a new project by default (recommended) or offer “import as new map”.
- Whether fog is available outside lighting and how it is exported.
- Which built-in fonts to bundle (licensing/size).
- Whether to ship built-in image assets or rely on uploads initially.
