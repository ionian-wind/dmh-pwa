# Map Studio — rendering, styles, lighting and export rendering

## 1. Renderer contract

```ts
interface StudioRenderer {
  init(host: HTMLElement, options): Promise<void>;
  setMap(map: StudioMap, options?: { full?: boolean }): void;
  patch(patch: RenderPatch): void;
  setViewport(viewport: ViewportState): void;
  resize(width: number, height: number): void;
  hitTest(point: ScreenPoint, options): HitResult | null;
  renderPreview(preview: PreviewState | null): void;
  renderSelection(selection: StudioSelection, handles: boolean): void;
  exportImage(area: ExportArea, ppc: number, format): Promise<Blob>;
  toThumbnail(width: number, height: number): Promise<string>;
  destroy(): void;
}
```

The Vue layer never reaches into Pixi internals.

## 2. Pixi application lifecycle

- `new Application()`; `await app.init({ container, backgroundAlpha: 0, antialias: true, resolution: min(devicePixelRatio, 2), preference: 'webgl' })`.
- If WebGL/WebGPU fails, destroy and show `RendererUnavailable` with diagnostics.
- `app.ticker` runs only while animations/previews/pan inertia/light shimmer need it; static maps call `app.renderer.render(app.stage)` on demand.
- Context loss: pause ticker, keep document, show restore banner, rebuild all textures/display objects on `webglcontextrestored`.
- ResizeObserver on host, debounced, updates renderer and camera fit only on first size.

## 3. Stage composition

```
stage
  world (camera transform)
    backgroundPass
    gridPassBackground
    layersContainer
      dungeonPass[0..n]        (ordered)
      imagesPass[0..n]         (ordered)
      fogPass
    textureOverlay
    lightPass
    editorGridPass?            (optional screen-space)
  overlay
    previewLayer
    selectionLayer
    toolHudLayer
```

- Layer order follows the document tree (flattened). Folders render their children in order; folder visibility/opacity/lock cascade.
- Each `DungeonLayer` pass is a container with sub-containers:
  - `floorFill`, `floorTexture`, `shading`, `hatching`, `grid`, `walls`.
- `imagesPass` holds object containers. Group objects are containers with child transforms.
- `fogPass` is drawn above drawings but below lighting? Fog should obscure drawings; lighting is an additive overlay, so fog above drawings and lighting above fog (or lighting clipped by fog? Dungeonscrawl fog is for tabletop display; plan: fog drawn above drawings, lighting above fog, editor can toggle preview).
- Texture overlay above lighting for paper grain; blend mode multiply.

## 4. Camera and resolution

- Store camera as `{ x, y, zoom, isometric }`. Base scale 70 px/cell at zoom 1.
- `resolution` = min(devicePixelRatio, 2). On low-end mobile, 1.5.
- Use `world.scale.set(base * zoom)`, position to keep the cursor-anchored zoom stable.
- Pixel snapping: floor object positions at zoom > 2 only for crisp text/walls; avoid jitter during pan.
- Fit bounds: union of visible layer bounds plus 1-cell margin; account for UI panels on mobile? Fit to available canvas rect.

## 5. Grid rendering

### Square grid

- Background grid (dot/square/line) generated as a tiling texture at 70 ppc and repeated; line width scales with zoom but stays >= 1 screen px.
- Per-dungeon-layer grid can overlay floor fill with different color/type; clipped to geometry if “inside rooms” variant is chosen.
- Major/minor lines derived from division? Dungeonscrawl only shows base grid; we can add optional axis every 5 cells (setting).

### Hex grid

- Flat-top/pointy-top generated texture + hex outline geometry for selection.
- Snapping uses hex math; grid clipping to geometry for layer grid.
- Dot variant: dots at cell centers.

### Isometric

> **Deferred proposal — isometric is not in current scope.** See
> `proposals/isometric-hex-grids.md`.

- Apply a 2D isometric projection to `world` (scale/skew) so orthogonal document data renders in isometric.
- Input inverse-transforms screen points into document coordinates.
- Walls can be extruded visually by rendering a duplicated offset wall layer with darker color + vertical connectors for a simple 2.5D look. This is a render-only effect; geometry stays planar.
- Grid/isometric settings mirrored in background and view menu.

## 6. Dungeon layer passes

### 6.1 Floor fill

- One `Graphics` (or mesh) per layer built from compiled polygons; fill color/alpha.
- For very complex geometry, convert to a `Mesh`/`GraphicsGeometry` or pre-render to `RenderTexture` at current zoom-independent resolution (e.g. 2× export base).
- Cache a static floor RenderTexture; invalidate on geometry/style change.

### 6.2 Floor texture

- Texture is masked by floor geometry:
  - Option A: `Sprite`/`TilingSprite` with a mask `Graphics` built from the same polygons.
  - Option B: custom shader samples texture in world UV and uses polygon stencil; choose A for compatibility.
- Settings: scale (pattern size), rotation, color/BW, color blend, opacity.
- Procedural textures generated once into 512×512 canvases and cached (dirt, stone, marble, wood, grass, water, snow).
- Uploaded textures stored as `StudioAssetRef` and loaded through Pixi Assets.
- dither/rough edge avoidance: mask antialias with `antialias: true`.

### 6.3 Shading

- Edge shading simulates depth around walls: offset/duplicate wall boundaries inward with blurred/darkened fill, or render a blurred wall shape behind the floor.
- Implementation options:
  1. Draw a copy of wall polygons with a thick dark stroke behind the floor, blur filter, masked to floor bounds.
  2. Custom fragment shader computing distance to boundary from a wall mask.
- Start with option 1 (robust, cheap) and a `BlurFilter`/`AlphaFilter`; size and roughness map to stroke width/blur.
- Cache per layer into the static RenderTexture.

### 6.4 Hatching

- Patterned fill outside/inside walls depending on preset:
  - Generate a tiling diagonal-line texture, apply with a mask (floor or inverse floor) and optional blend mode.
  - Variants: diagonal, cross-hatch, dots, brick; size, stroke color, width.
  - For patterns that must appear only outside walls, use an inverted mask built from layer bounds minus polygons.
- Pre-render pattern texture once per style; use TilingSprite for scale.

### 6.5 Layer grid

- Render the layer’s grid clipped to floor geometry when visible.
- Same grid texture/pipeline as background, with per-layer style and alpha.

### 6.6 Walls

- Build `Graphics` from boundary segments and explicit wall annotations.
- Stroke color, width, dash, roughness (rough applies to the outline sampling; walls use the already-rough boundary).
- Optional inner/outer double line for some presets.
- Walls are included in the static layer RenderTexture.

### 6.7 Layer opacity/blend

- Apply `alpha` and `blendMode` to the layer container.
- Hatching/shading/texture inherit layer opacity but may have their own alpha settings.

### 6.8 Advanced “unpack”

- UI exposes floor/walls/grid/shadow/hatching/shading sub-toggles and settings.
- Internally the passes are always separate; “unpack” is only a UI/model exposure, not a structural change.
- If a preset defines only a combined style, defaults populate each pass.

## 7. Background pass

- Fill color across the whole map rect (or infinite? clamp to document size; show area outside as canvas void).
- Background texture: procedural or uploaded, scale/blend/opacity, full map mask.
- Dot/square/hex grid.
- Isometric view applies to background too.
- Background lock: when locked, applying a preset never overwrites it.

## 8. Images and objects

- Images: `Sprite` from Pixi Assets, tinted via `sprite.tint`; shadow via `DropShadowFilter` (or custom blur/offset sprite for performance).
- Reset tint to white when none.
- Text: `Text`/`BitmapText`? Start with `Text` for IME support/quality; cache as texture for static maps. Text resolution scales with zoom; regenerate when zoom changes significantly.
- Doors: `Graphics`/small cached textures per variant; scale by width; rotate from endpoints.
- Stairs: `Graphics` lines; steps count adaptive; rough deterministic.
- Lights: editor handles in overlay; actual light contribution in `LightingPass`.
- Groups: Pixi Container; transform applied to children.
- Z-order: container children order synced from object order.

## 9. Fog of war

- Fog layer uses the same geometry pipeline (`add`/`subtract` fog shapes) rendered as a solid overlay color.
- Optional “fog preview” mode: hide fog in editor to see the map; a toolbar toggle previews the player view.
- Export options: include fog or export the unfogged map.
- No Roll20/tabletop integration; fog is for export/print and future player display.

## 10. Paper texture overlay

- Global `TilingSprite` generated from procedural paper grain (noise + fibers) or uploaded texture.
- Settings: enabled, source, scale, opacity, attribution.
- Blend mode multiply; placed above all drawing/lighting, below editor overlays.
- Export includes it when enabled.
- Cache one texture per source/scale; avoid regenerating per frame.

## 11. Lighting

### 11.1 Model

- Lights are objects with `x,y` (cells), `radius`, `brightRadius`, `color`, `intensity`, `enabled`.
- Presets map to D&D 5e radii: Light/Torch/Continual Flame 20 bright + 20 dim; Lamp 15 bright + 30 dim; Lantern 30/30; Other custom.
- Bright zone = 100%, dim zone falls to 50%, fade to 0 at outer radius.

### 11.2 Rendering approach

Phase 1 (no occlusion):

- Generate a radial gradient texture per (color, radius, brightRadius) or render a shader.
- Draw each light as a quad/mesh with additive blending into `lightPass`.
- Clip to map bounds; optional darkness layer below (multiply black) so unlit areas dim rather than stay bright.
- Editor shows light radius handles; export uses the same pass.

Phase 2 (wall occlusion / blocks light):

- Build visibility polygon per light from relevant wall segments (dungeon layers with `blocksLight`).
- Ray-cast to segment endpoints + small angular offsets; produce polygon; update when walls or light move.
- Render light with a mask equal to the visibility polygon, or generate a shadow texture.
- Cache visibility polygons by `lightRevision + wallRevision`; debounce while dragging.
- For many lights, batch into a shader with a wall mask texture: render walls to a mask RenderTexture, compute distance/visibility in a custom fragment shader. Plan recommends the mask approach for scalability; fall back to CPU visibility for correctness/debug.

### 11.3 Darkness and blend

- Option A: additive light pass over normal map; unlit areas remain as drawn (bright map). Not true darkness.
- Option B: multiply a dark overlay (ambient) then add lights; gives night/dark dungeon look.
- Settings: ambient light level (0–1), global lighting enabled. Default ambient 0.25 when lighting is on.
- Blend modes configurable (Normal/Add/Multiply/Screen) for advanced users.

### 11.4 Performance

- Limit active lights (e.g. 64) for shader batch; warn beyond.
- Render lighting to a half/quarter-resolution RenderTexture and upscale for softness/performance.
- Pause updates while panning/zooming (reuse cached texture); recompute after idle if needed.
- Touch/low-power: disable occlusion or reduce light resolution.

## 12. Selection/preview overlays

- `selectionLayer` in screen space (or world space with constant screen-size handles).
- Bounding box lines, handles as circles/squares with 44 px touch target.
- Rotation handle above the box; angle label.
- Multi-select bounds; group bounds; lock badge.
- Hover outline: layer-colored stroke, translucent fill; object hover tint.
- Geometry selection: marching-ants outline around selected polygon(s).
- Preview: dashed outline, fill with current style at 40% alpha, snap guides, radius/angle labels.
- All overlay rendering is cleared from exports.

## 13. Export rendering

`exportRender` reuses the document/renderer but targets an offscreen canvas/RenderTexture:

1. Compute export area in cells; convert to pixels `area * ppc`.
2. Create a Pixi `RenderTexture` at target size (cap by GPU max texture size; tile for PDF/large export).
3. Render background → layers → objects → fog (optional) → lighting → texture overlay. Do not render editor grid unless “include grid” is enabled; do not render handles/previews.
4. Extract pixels via `renderer.extract.canvas()`/`image()`; encode with `canvas.toBlob` for PNG/WebP/JPG.
5. For images larger than the max texture, render in tiles and composite onto an offscreen 2D canvas; for PDF, render page-sized tiles.
6. Release textures and canvases; report dimensions and estimated memory.

Rules:

- Fonts must be loaded before text export (`document.fonts.ready` + explicit font loads).
- Images must be fully loaded; fail with a clear message if any asset is missing.
- Exported colors use the same renderer settings; no screen-only tint.
- Export must be deterministic for the same document/settings (rough seeds, object order).

## 14. Thumbnails

- Render at 320 px wide, using a fit-to-bounds export that includes background and drawings but no editor overlays.
- Cache in `MapStudioMapRecord.thumbnail`; invalidate on save/close.
- Library uses `<img>` data URLs or object URLs; release object URLs on unmount.

## 15. Performance budgets and techniques

| Scenario                | Target                                          |
| ----------------------- | ----------------------------------------------- |
| Open 30×30 map          | < 1 s to interactive                            |
| Pan/zoom 500 shapes     | 60 fps desktop, 30+ fps mobile                  |
| 5,000 shapes            | 30+ fps desktop with static layer cache         |
| Lighting with 16 lights | 60 fps desktop, 30 fps mobile without occlusion |
| Export 50×50 @ 140 ppc  | < 10 s desktop, warn if browser limit           |

Techniques:

- Render-on-demand; ticker only for animations/inertia.
- Static layer RenderTextures invalidated by revision.
- Batch/merge static geometry; avoid rebuilding Graphics every frame.
- Object pooling for preview/handles.
- Texture atlas/cache for doors, stairs, procedural patterns.
- Limit devicePixelRatio; reduce on low-end devices via `navigator.deviceMemory`/benchmark.
- Spatial index for hit tests.
- Web Worker for geometry/random/import once profiling warrants.
- `renderer.extract` only on export/thumbnail.

## 16. Renderer tests

- Scene builder unit tests with a mocked Pixi layer (assert node tree/passes/order).
- Export snapshot tests for a fixture document: compare pixels at a small PPС with tolerances (Playwright).
- Lighting/occlusion snapshots.
- Context-loss recovery smoke test.
- Mobile viewport screenshot tests for panel layouts.

## 17. Color and theme

- Drawing colors are absolute; UI theme does not alter exported colors.
- Canvas surround uses theme background; checkerboard/void for outside map.
- Dark mode should not invert map colors; provide a “dark UI” only.
- High-contrast mode uses stronger selection outlines/handles.
