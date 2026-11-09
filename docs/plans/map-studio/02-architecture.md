# Map Studio — architecture

## 1. Architecture at a glance

```
┌────────────────────────────────────────────────────────────────────┐
│ Vue feature shell (routes, menus, panels, dialogs, i18n)           │
│  MapStudioView.vue                                                  │
│   ├─ StudioTopMenu       File/Edit/View/Help                        │
│   ├─ StudioLeftSidebar   Presets/Images/Clipboard/Textures/...      │
│   ├─ CanvasHost.vue      Pixi mount, resize, input capture          │
│   ├─ StudioRightSidebar  Layers + Layer Settings                    │
│   ├─ StudioToolbar       bottom tool row + tool settings            │
│   └─ StudioStatusBar     zoom, grid, autosave, selection info       │
└───────────────▲────────────────────────────────────────────────────┘
                │ reactive document + commands
┌───────────────┴────────────────────────────────────────────────────┐
│ Domain layer (framework-agnostic TypeScript)                       │
│  document model · geometry engine · tool controllers · commands    │
│  presets · export/import · random generator                        │
└───────────────▲────────────────────────────────────────────────────┘
                │ render model (plain data, no Vue objects)
┌───────────────┴────────────────────────────────────────────────────┐
│ Pixi renderer (src/map-studio/renderer/*)                          │
│  Application · Camera · SceneBuilder · LayerPasses · Overlays      │
│  HitTest · Handles · Lighting · ExportRenderer                     │
└────────────────────────────────────────────────────────────────────┘
```

Hard rule: **Pixi objects never live in persisted state or Pinia**. The document is plain serializable data; the renderer derives Pixi display objects from it and receives explicit commands to update/rebuild.

## 2. Technology choices

| Concern | Choice | Rationale |
| --- | --- | --- |
| Renderer | **pixi.js 8.x** | WebGL/WebGPU abstraction, scene graph, filters, text, asset loader, extract-to-canvas. |
| Vue integration | Manual `Application.init()` inside `CanvasHost.vue` | Avoid wrapper libraries that lag Pixi majors; explicit lifecycle. |
| Geometry booleans | `polygon-clipping` | Well-tested union/difference/intersection for polygons; small. |
| Curves | custom Catmull-Rom / quadratic sampling (shared utility) | No heavy dependency; deterministic sampling for rendering and export. |
| Rough outlines | custom seeded midpoint displacement | Deterministic, resolution-independent, reusable in export. |
| PDF | `jspdf` | Client-side PDF and tiled pages. |
| ZIP / `.ds` | existing `jszip` | Already a project dependency. |
| State | Pinia + `shallowReactive`/`shallowRef` document | Fine-grained commands, no deep Vue proxying of large documents. |
| Persistence | Dexie dedicated tables | Existing project already uses Dexie; large documents and thumbnails fit. |
| Feature flag | `VITE_FEATURE_MAP_STUDIO` | Build-level isolation like other features. |
| Testing | Vitest for domain; Playwright for Pixi/touch | Renderer/WebGL is best validated in a browser. |

New dependencies to add: `pixi.js`, `polygon-clipping`, `jspdf`. (`jszip` already present.) Optional later: `bezier-js` only if custom curve code becomes unwieldy.

## 3. Feature module layout

```
src/map-studio/
  MapStudioView.vue                 full-screen route view
  MapStudioLibraryView.vue          /map-studio
  components/
    StudioTopMenu.vue
    StudioToolbar.vue
    StudioLeftSidebar.vue
    StudioRightSidebar.vue
    StudioStatusBar.vue
    CanvasHost.vue
    panels/
      PresetsPanel.vue
      ImagesPanel.vue
      ClipboardPanel.vue
      TexturesPanel.vue
      LightingPanel.vue
      RandomDungeonPanel.vue
      ExportPanel.vue
      MapsPanel.vue
    layers/
      LayerTree.vue
      LayerRow.vue
      LayerSettings.vue
      ObjectSettings.vue
    tools/
      ToolSettings.vue
      per-tool setting subcomponents
    dialogs/
      NewMapDialog.vue
      ExportDialog.vue
      UnsavedChangesDialog.vue
      ImportDsDialog.vue
      ApplyToLocationDialog.vue
    overlays/
      TextEditOverlay.vue
      ContextMenu.vue
      SelectionMenu.vue
  composables/
    useMapStudio.ts                 store facade
    useStudioHotkeys.ts
    useStudioLayout.ts
    useStudioPointer.ts
    useAutosave.ts
  stores/
    mapStudioStore.ts               current project/map/selection/tool/history
    mapStudioLibraryStore.ts        local library
    mapStudioSettingsStore.ts       tool settings, UI preferences, custom presets
  domain/
    document/                       types, factories, normalization, versioning
    geometry/                       booleans, sampling, bounds, walls, hit tests
    tools/                          one controller per tool + registry
    commands/                       undoable mutations
    history/                        command stack + coalescing
    presets/                        built-in dungeon/world presets
    export/                         raster/PDF/UVTT/ds serializers
    import/                         ds/watabou/donjon importers
    random/                         dungeon generator
  renderer/
    MapStudioRenderer.ts            public renderer interface
    PixiStudioRenderer.ts           implementation
    camera.ts
    scene/
      SceneBuilder.ts
      DungeonLayerPass.ts
      ObjectLayerPass.ts
      BackgroundPass.ts
      FogPass.ts
      LightingPass.ts
      GridPass.ts
      TextureOverlay.ts
      SelectionOverlay.ts
      PreviewOverlay.ts
    shaders/                        light/hatching/shading shaders
    hitTest.ts
    exportRender.ts
    textures.ts                     procedural textures, cached gradients
  persistence/
    db.ts                           Dexie tables/migrations
    repository.ts                   CRUD, snapshots, thumbnails
    assets.ts                       image/font assets through existing file storage
  routes.ts
  integration.ts
  i18n/en.json
  i18n/ru.json
```

Feature integration follows the existing `FeatureIntegration` contract:

- `navigation`: “Map Studio” entry (either primary or Scribe group later; current nav is flat).
- `routes`: `/map-studio` (library) and `/map-studio/:projectId/:mapId?` (editor).
- `globalComponents`: none in v1 (no floating panel; the studio is a route).
- `homeCard`: optional “Map Studio” card with map count.
- `linkKinds`/`dragKinds`: none in v1.
- `feature-catalog.mjs`: add flag, ownership (`src/map-studio/`), navigation and translation imports.

The existing maps feature gains one optional launcher: “Open in Map Studio” in `LocationMapTab` (and possibly LocationView header). It only appears when the feature flag is on. The studio writes back via a small exported API; the maps feature does not import studio internals.

## 4. Runtime lifecycle

### Open

1. Route resolves `projectId`/`mapId` from the local repository.
2. `mapStudioStore.openProject(...)` normalizes the document and pushes an initial history snapshot.
3. `CanvasHost` mounts, creates a Pixi `Application`, sets resolution/pixel ratio, and calls `renderer.setDocument(document)`.
4. Renderer builds the scene graph and starts the ticker only when needed.
5. UI panels read from the store; the renderer subscribes to a render revision counter, not deep Vue reactivity.

### Change

1. Tool/UI dispatches a `Command` (e.g. `AddDungeonShape`, `TransformObjects`, `SetLayerStyle`).
2. Command mutates a draft (immer-like copy or explicit clone of affected nodes) and commits a new document revision.
3. Store pushes the inverse command onto history, bumps `revision`, marks dirty.
4. Renderer receives a `RenderPatch` (`{ kind, layerIds, nodeIds }`) and updates only affected Pixi objects. Full rebuild for layer reorder, grid change, isometric toggle, preset apply.
5. Autosave schedules a debounced persistence write.

### Close

- Flush autosave, destroy Pixi application, release textures/assets, clear history, clear object URLs.

## 5. Rendering architecture

### Camera

- World coordinates: document cells. Canonical render pixels at 70 px/cell (`EXPORT_BASE_PPC = 70`), configurable for display.
- `Camera` holds `x`, `y`, `zoom`, `rotation?`, `isometric`.
- Pan/zoom uses a single `world` container transform; UI overlays (selection handles, labels) live in screen space.
- Fit-to-map computes bounds of all visible layers plus margin.
- Zoom clamp (e.g. 2%–3200%), integer wheel steps smoothed with a short tween.
- Isometric applies a fixed projection transform to the world container and a coordinate transform at input/geometry boundaries; the data stays orthogonal.

### Scene graph

```
stage
  backgroundContainer
  worldContainer (camera transform)
    backgroundPass
    layerContainer (ordered)
      dungeonLayerPass *
      objectLayerPass * (images/folders/text/doors/stairs)
      fogPass
    lightPass
    textureOverlay
    previewOverlay
  screenOverlay
    gridOverlay? (if screen-space grid)
    selectionOverlay
    toolHud
```

- Each dungeon layer has child containers for passes: floor, floor texture (masked), shading, hatching, grid, walls, selection highlight.
- Objects use containers so group transforms/z-order work naturally.
- All display objects use `eventMode = 'none'` except hit-test proxies; a single canvas pointer handler resolves the active tool and hit test to keep event logic deterministic.
- Use `RenderTexture` caching for static dungeon layers (floor/walls) and invalidate on geometry/style change. Preview/selection are always dynamic.

### Render passes

1. Background fill + background texture + dot/square/hex grid.
2. For each dungeon layer bottom→top:
   - floor fill (compiled geometry)
   - floor texture masked by floor geometry
   - shading pass
   - hatching pass
   - layer grid
   - walls (boundary stroke)
3. Images/folders/text/doors/stairs (ordered).
4. Fog layer.
5. Lighting overlay (if enabled).
6. Paper texture overlay.
7. Editor-only grid/handles/selection/preview (never exported unless requested).

See `05-rendering-and-styles.md` for pass details.

### Hit testing

- Object tool: hit test Pixi display objects through `renderer.hitTest(point, filters)` with priority by z-order and layer lock/visibility.
- Geometry select tool: hit test compiled layer geometry (point-in-polygon) for clicking a room; region selection uses the in-progress polygon.
- Markers/handles are drawn in `selectionOverlay`; pointer capture on canvas keeps drags alive outside bounds.
- Cache geometry bounding boxes and spatial index (uniform grid or RBush-like simple grid) for maps with many shapes.

## 6. State and command architecture

### Store shape

```ts
interface MapStudioState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  project: StudioProject | null;
  map: StudioMap | null;
  selectedMapId: string | null;
  tool: ToolId;
  toolSettings: Record<ToolId, ToolSettings>;
  selection: StudioSelection;         // objects, geometry ids, layer ids, mixed
  hover: StudioHover;
  activeLayerId: string;
  editingTextId: string | null;
  clipboard: ClipboardEntry[];
  history: HistoryState;
  dirty: boolean;
  autosave: 'idle' | 'saving' | 'saved' | 'error';
  viewport: { zoom, x, y, isometric, showGrid, hideUi };
}
```

- Document data is stored as `shallowRef<StudioMap>`; updates replace the map object (structural sharing) so Vue panels re-render without deep proxies over thousands of points.
- Selection/hover are separate from the document and never persisted.
- Tool settings are persisted in `mapStudioSettingsStore` (localStorage via configStore or a dedicated settings table), not in the document, except style used by committed nodes.

### Commands

Every mutation is a command with `apply(map): map`, `invert(map): map`, optional `coalesceKey` (drag/resize/nudge) and a display label.

Command families:

- `AddShape`, `UpdateShape`, `RemoveShapes`, `SetShapeOperation`.
- `AddObject`, `TransformObjects`, `DeleteObjects`, `ReorderObjects`, `GroupObjects`.
- `SetLayerStyle`, `AddLayer`, `RemoveLayer`, `ReorderLayers`, `DuplicateLayer`, `SetLayerVisibility/Lock`.
- `SetBackground`, `SetGrid`, `SetMapSettings`.
- `PasteGeometry`, `PasteObjects`.
- `GenerateDungeon` (single replace command).
- `ImportDocument` (replace command).

History:

- Undo/redo stacks limited by both count (e.g. 200) and approximate memory (e.g. 64 MB).
- Coalesce pointer drags into one command keyed by `(commandType, selectionIds)` until pointer up.
- Each committed command triggers autosave and a render patch.
- Generation/import clears redo and may push a compressed snapshot instead of a giant inverse command.

## 7. Tool controllers

Each tool is a state machine behind a common interface:

```ts
interface ToolController {
  id: ToolId;
  cursor(state): string;
  onPointerDown(ctx, event): void;
  onPointerMove(ctx, event): void;
  onPointerUp(ctx, event): void;
  onDoubleClick?(ctx, event): void;
  onKeyDown?(ctx, event): boolean;
  onCancel(ctx): void;
  drawPreview(ctx): void;
  getSettingsSchema(): ToolSettingSchema[];
}
```

`ToolContext` exposes: camera transform, snapped world point, modifiers, active layer, document, command dispatcher, preview overlay, touch flag.

Controllers never mutate the document directly while drawing; they keep a transient state and commit on completion. This keeps previews cheap and undo clean.

See `04-geometry-and-tools.md`.

## 8. Geometry pipeline

```
input points (cells)
  → snapping / angle constraints
  → shape sampling (lines, arcs, curves)
  → rough displacement (seed, level)
  → path expansion (radius) / polygon closure
  → per-layer operation stack (add/subtract)
  → polygon-clipping union/difference
  → compiled layer geometry { polygons, boundaries, bounds }
  → render passes (fill, walls, textures, lighting, export)
```

Compiled geometry is cached per layer with a `geometryRevision`. Shapes store their source parameters plus a deterministic seed, so re-editing/reloading reproduces the same outline. The compiled cache is not persisted (rebuilt on open) except for lightweight bounds.

## 9. Workers and performance

- Geometry compilation and random generation can run in a Web Worker. Start with main-thread compilation and a `requestIdleCallback`/chunked pipeline; add worker when profiling shows jank.
- A worker is mandatory for large random dungeons and `.ds` import conversion.
- Pixi ticker is stopped when nothing animates; render-on-demand via `renderer.render()` for static frames.
- Static dungeon layers render to `RenderTexture`; pan/zoom reuses textures.
- Object textures are loaded through Pixi `Assets` with a bounded cache; thumbnails are generated at low resolution.
- Large image uploads use `createImageBitmap` and the existing file storage; avoid base64 in the document.

## 10. Input architecture

- One canvas-level `pointerdown/move/up/cancel` handler plus `wheel`, `keydown`, `contextmenu`.
- `PointerEvent` only; mouse/touch/pen unified. Track multiple pointers for pinch/two-finger pan.
- Gesture layer:
  - one pointer + active tool → tool controller
  - two pointers → pan/zoom, cancel in-progress one-pointer gesture if not committed
  - long-press → context menu (touch)
  - touch handles have a minimum 44 px hit area
- Keyboard shortcuts are centralized (`useStudioHotkeys`) and disabled while text editing/typing in inputs.
- Pointer capture on the canvas; a transparent full-screen interaction layer prevents browser gestures (`touch-action: none`, prevent default on wheel with ctrl).

## 11. UI composition

- `MapStudioView` is a route-level page that requests an immersive layout (hides the standard app header/sidebars). Existing `useLayout` hooks can hide app chrome; otherwise the route renders a fixed overlay above app content.
- Desktop: left panel 300–340 px, right panel 320–380 px, bottom floating toolbar, top menu.
- Tablet: left/right panels become resizable drawers; toolbar remains.
- Mobile: canvas full area; toolbar horizontally scrollable or paged; panels open as bottom sheets; top menu collapses into an overflow menu; selection actions become a floating action bar.
- All panels are Vue components reading from the store. No panel directly talks to Pixi except through renderer commands/events.

## 12. Feature flagging and isolation

- `VITE_FEATURE_MAP_STUDIO` in `scripts/feature-catalog.mjs`, default off until stable.
- Routes, navigation, globals and the launcher are generated only when enabled.
- Build verification must ensure the studio chunks are absent from disabled builds.
- The studio may import shared components (`DraggablePanel`, `BaseModal`, `EntitiesLinking` not needed, icon set, file storage) but must not import the current map viewer internals.
- A tiny `src/map-studio/integration/location.ts` API exposes `openStudioForLocation(locationId)` and `applyStudioImageToLocation(...)`. The maps feature calls those through dynamic imports so disabled builds exclude them.

## 13. Error handling

- WebGL/WebGPU unavailable: show a clear fallback screen (no silent blank canvas); offer export-only? At minimum, block with instructions.
- Lost context: pause ticker, show “restore canvas” action, rebuild scene graph.
- Asset missing: placeholder object, relink dialog, never crash the document.
- Corrupt persisted document: normalize with defaults, copy the raw record to a `recovery` location, show a warning.
- Autosave failure: persistent error status with retry and manual save/export.
- Export failure (canvas too large): downscale with warning or split PDF pages.

## 14. Security and privacy

- All data local; no network calls except optional user-initiated external imports (none in v1).
- Uploaded images are treated as untrusted; render only through image decoding, never inject SVG as HTML. SVG imports are rasterized into a bitmap at import time.
- `.ds` imports are parsed with size limits and schema validation; reject oversized/zip-bomb inputs.
- No eval, no remote fonts without explicit user action.

## 15. Accessibility architecture

- Panels and dialogs use semantic HTML, focus management and `aria-live` for save/status.
- Canvas has an accessible name and instructions; the layer tree is a full keyboard-accessible representation of objects.
- Keyboard alternatives for every pointer action (add via toolbar, transform via numeric fields, z-order via menu).
- High-contrast and reduced-motion settings follow app theme/config where possible.
