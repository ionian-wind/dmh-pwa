# Image Filters and Composition

**Status:** proposal — not implemented (reviewed 2026-11-09); builds on the
also-unimplemented [image-quick-tools.md](image-quick-tools.md).

**Goal:** two related capabilities:

1. apply non-destructive visual filters and adjustments to an image;
2. compose several images into one document (layers, transforms, opacity,
   blend modes, masks) and export the result.

The first is useful immediately for handouts, maps and mood images. The second
turns the app into a lightweight collage/overlay tool without trying to become
a full desktop image editor.

**Related documents:**

- [image-quick-tools.md](image-quick-tools.md) — crop/resize/convert MVP and
  shared image primitives
- [generic-file-handling.md](generic-file-handling.md) — file sources, OPFS,
  save helper, object URL ownership
- [maps.md](../features/maps.md) — current map image storage

---

## 1. Use cases

### Filters

- Give a set of handouts a consistent warm/cold or faded look.
- Increase contrast and sharpness on a scanned map.
- Blur or darken an image before placing text/links over it.
- Apply a named preset ("Old paper", "Moonlit", "High contrast") to several
  images.
- Save a filter preset and reuse it on future assets.

### Composition

- Put several NPC portraits into one reference sheet.
- Combine a battle-map background with a grid, frame, title or compass overlay.
- Layer a parchment texture over a map.
- Arrange handout images into a single page for a module.
- Create a simple "session recap" image from a few screenshots.
- Compose tokens/icons on a transparent canvas for export.

---

## 2. Scope

### 2.1 MVP

**Filters**

- Brightness, contrast, saturation, exposure, temperature/tint (simple RGB
  shifts), grayscale, sepia, invert, hue rotation, blur.
- Filter stack: add, reorder, toggle, reset, remove.
- Presets.
- Preview at viewport resolution; full-resolution render on export.
- Undo/redo.

**Composition**

- A document with a fixed pixel size and a background color or transparency.
- Add images as layers from the file picker/library/drag-drop.
- Move, scale, rotate, flip and reorder layers.
- Per-layer opacity and blend mode.
- Per-layer filters (same stack as the single-image case).
- Crop/mask a layer with a rectangle or an alpha mask.
- Fit/cover document presets.
- Flatten and export PNG/JPEG/WebP.

### 2.2 Later

- Adjustment layers that affect every layer below them.
- Text and simple shapes (rectangles, circles, lines).
- Layer groups and clipping masks.
- Smart guides, snapping and alignment tools.
- Document templates.
- WebGL/WebGPU filter pipeline for real-time heavy effects.
- Tile-based rendering for very large documents.
- Per-layer export and sprite-sheet export.

### 2.3 Non-goals

- A full Photoshop replacement.
- Animation or video editing.
- 3D.
- RAW development or ICC-managed print workflows.
- A server-rendered pipeline.

---

## 3. Concepts and data model

### 3.1 Document and layers

```ts
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface ImageDocument {
  id: string;
  width: number;
  height: number;
  background: string | 'transparent';
  layers: ImageLayer[];
  selectedLayerId: string | null;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MaskRef =
  | { kind: 'rect'; rect: Rect }
  | { kind: 'image'; fileId: string; inverted?: boolean };

export interface LayerBase {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0..1
  blendMode: BlendMode;
  filters: ImageFilter[];
}

export interface ImageLayer extends LayerBase {
  type: 'image';
  /** Reference into the generic files store. */
  fileId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Clockwise degrees; convert to radians at render time. */
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  crop: Rect | null;
  mask: MaskRef | null;
}

export interface AdjustmentLayer extends LayerBase {
  type: 'adjustment';
  /** Applies the inherited filters to the layers below this one. */
}

export type Layer = ImageLayer | AdjustmentLayer;
```

Rules:

- Layer coordinates are in **document pixels**.
- The source image is never modified; the document only stores references and
  transform parameters.
- A layer references a `files.id`, not a base64 payload. If the file is
  missing, render a placeholder and offer relinking.
- Store rotation in degrees for readable project JSON; convert to radians when
  calling canvas transforms.
- Keep the document JSON small enough to autosave frequently.

### 3.2 Filters

Use a discriminated union so filters serialize cleanly:

```ts
export type ImageFilter =
  | { id: string; type: 'brightness'; value: number; enabled: boolean }
  | { id: string; type: 'contrast'; value: number; enabled: boolean }
  | { id: string; type: 'saturation'; value: number; enabled: boolean }
  | { id: string; type: 'exposure'; value: number; enabled: boolean }
  | { id: string; type: 'temperature'; value: number; enabled: boolean }
  | { id: string; type: 'grayscale'; value: number; enabled: boolean }
  | { id: string; type: 'sepia'; value: number; enabled: boolean }
  | { id: string; type: 'invert'; value: number; enabled: boolean }
  | { id: string; type: 'hueRotate'; value: number; enabled: boolean }
  | { id: string; type: 'blur'; radius: number; enabled: boolean }
  | {
      id: string;
      type: 'lut';
      preset: 'warm' | 'cool' | 'faded' | 'noir';
      value: number;
      enabled: boolean;
    };
```

Values are normalized in the UI and clamped in the pipeline. A filter stack is
an ordered list; reordering changes the result for non-commutative filters
(for example blur before or after contrast).

### 3.3 Presets

```ts
export interface FilterPreset {
  id: string;
  nameKey: string;
  filters: ImageFilter[];
}
```

Start with built-in presets:

- **Natural:** light contrast and saturation.
- **Old paper:** warm tint, reduced saturation, subtle contrast.
- **Moonlit:** cool tint, lower brightness, blue shadows.
- **Noir:** grayscale, high contrast.
- **Soft:** blur + reduced contrast.
- **Vivid:** saturation + contrast.

User presets can be stored in `configStore` later; do not block the MVP on a
preset editor.

---

## 4. Filter implementation

### 4.1 Preferred path: Canvas 2D `ctx.filter`

Canvas 2D supports CSS filter functions:

```ts
ctx.filter = [
  'brightness(1.08)',
  'contrast(1.12)',
  'saturate(1.15)',
  'sepia(0.1)',
  'blur(1.5px)',
].join(' ');
ctx.drawImage(bitmap, 0, 0, width, height);
ctx.filter = 'none';
```

Advantages:

- simple, no shader code;
- hardware-accelerated in most browsers;
- enough for the MVP.

Limitations:

- browser differences in supported functions and precision;
- no custom curves/LUTs;
- blur is not free on huge images;
- `ctx.filter` needs a fallback for older engines.

Filter string from the stack, in order, and skip disabled entries. Native
CSS-mappable filters are `brightness`, `contrast`, `saturation`, `grayscale`,
`sepia`, `invert`, `hueRotate` and `blur`. `exposure`, `temperature` and `lut`
do not have a direct CSS filter equivalent; route them through the per-pixel
path below (or approximate them with a combined CSS string where the browser
supports it).

### 4.2 Fallback path: per-pixel processing

If `ctx.filter` is unavailable or a filter needs custom math:

1. draw the image to an `OffscreenCanvas`;
2. `getImageData`;
3. process `Uint8ClampedArray` in a worker;
4. `putImageData`/`ImageData` back;
5. encode.

Keep LUT-based filters and temperature shifts here. A LUT is a 256-entry
lookup table per channel; it is compact, serializable and fast.

### 4.3 Advanced path: WebGL / WebGPU

Reach for WebGL only when real-time previews or many layers make Canvas 2D
too slow:

- one full-screen quad per filter or a compiled shader chain;
- render layers to textures;
- composite with blend shaders if Canvas 2D blend modes are insufficient;
- keep a Canvas 2D fallback for unsupported browsers.

Do not start with WebGL. It adds context-loss handling, shader compilation and
a second rendering path. Use it only after profiling.

### 4.4 Color and clamping

- Work in sRGB for the MVP. Canvas is effectively sRGB.
- Clamp channel values after each operation.
- Avoid repeated round-trips through `Uint8ClampedArray`; combine filters
  where possible.
- Document that wide-gamut/ICC profiles are not preserved.

### 4.5 Filter order

Apply in the user-visible stack order:

```text
source → filter[0] → filter[1] → ... → layer transform → composite
```

For an adjustment layer, apply the stack to the composite of the layers below
it, then continue compositing above it.

---

## 5. Composition rendering

### 5.1 Canvas choice

Start with **Canvas 2D**:

- `globalAlpha` for opacity;
- `globalCompositeOperation` for blend modes;
- `ctx.translate/rotate/scale` for layer transforms;
- `clip()` or an alpha mask for masks;
- `drawImage` for images and cached layer bitmaps.

The 2D API is predictable, easy to test and sufficient for a lightweight
composition tool.

### 5.2 Blend modes

Map the app's blend modes to canvas composite operations:

```ts
const blendModeMap: Record<BlendMode, GlobalCompositeOperation> = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
  'color-dodge': 'color-dodge',
  'color-burn': 'color-burn',
  'hard-light': 'hard-light',
  'soft-light': 'soft-light',
  difference: 'difference',
  exclusion: 'exclusion',
  hue: 'hue',
  saturation: 'saturation',
  color: 'color',
  luminosity: 'luminosity',
};
```

Not every browser implements every mode identically. Add a small capability
check or accept minor visual differences and document it.

### 5.3 Layer transforms

For each image layer:

1. Load/decode its source into an `ImageBitmap` (cache it).
2. Apply `crop` (source rectangle).
3. Draw into a layer-sized offscreen canvas.
4. Apply filters to that canvas.
5. Draw the layer canvas into the document with translate/rotate/scale,
   opacity and blend mode.

Cache the post-filter layer bitmap until the layer or its filters change.
Invalidate on source change, transform change or filter change.

### 5.4 Masks

MVP options:

- **Rectangular crop** — already covered by `crop`.
- **Alpha mask** — a grayscale image where black is transparent and white is
  opaque.

Implementation:

- draw the layer to an offscreen canvas;
- draw the mask with `globalCompositeOperation = 'destination-in'`;
- optionally blur the mask for feathering.

Later: vector masks, brush-editable masks, clipping masks.

### 5.5 Document background

- `transparent`: clear the canvas and export PNG/WebP.
- color: fill before compositing; required for JPEG export.
- Optional checkerboard preview to show transparency.

### 5.6 Preview vs export

| Aspect     | Preview                                     | Export                  |
| ---------- | ------------------------------------------- | ----------------------- |
| Resolution | Fit viewport × devicePixelRatio             | Full document size      |
| Filters    | May use reduced-quality/blur approximations | Full quality            |
| Layers     | Cached preview bitmaps                      | Full-resolution bitmaps |
| Timing     | Throttled to animation frames               | One full render         |

For large documents, render a **proxy** at preview scale and keep the original
layer dimensions only for export. A 8000×8000 document is 256 MB per RGBA
surface; never keep several full-size copies during interactive editing.

---

## 6. Interaction and UI

### 6.1 Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Toolbar: Add image · Undo · Redo · Zoom · Export              │
├───────────────┬──────────────────────────────┬───────────────┤
│ Add / presets │         Canvas / viewport     │ Layers       │
│ Background    │         with selection        │ Properties   │
│ Document size │         handles               │ Filters      │
└───────────────┴──────────────────────────────┴───────────────┘
```

- Left panel: document, background, add-image, presets.
- Center: preview with checkerboard, selection box, transform handles, zoom and
  pan.
- Right panel: layer list + selected-layer properties + filter stack.
- Mobile: canvas first; panels become bottom sheets or tabs.

### 6.2 Layer list

- Reorder by drag and drop (reuse the project's existing DnD utilities).
- Visibility toggle, lock, rename, duplicate, delete.
- Thumbnail with transparency checkerboard.
- Opacity slider and blend-mode select in the properties panel.
- Selecting a layer highlights its bounds on the canvas.

### 6.3 Canvas interactions

- Click to select the topmost visible layer at the point.
- Drag to move; corner handles to scale; rotation handle; shift to preserve
  aspect ratio or snap angles.
- Space + drag to pan; wheel/pinch to zoom.
- Crop tool with a rectangle overlay.
- Snapping to document edges, centers and other layer edges (later).

### 6.4 Filter panel

- Stack list with drag reorder, enable toggle and remove.
- Sliders for the selected filter.
- "Add filter" menu grouped by category (light, color, detail, stylize).
- Reset and presets.
- Show a small histogram or before/after toggle later.

---

## 7. Undo, redo and history

Use document snapshots, not canvas snapshots:

```ts
interface HistoryEntry {
  label: string;
  document: ImageDocument; // small JSON, layer metadata only
  selectedLayerId: string | null;
}
```

- Push a snapshot after each completed action (move end, slider release, add,
  delete, reorder, mask edit).
- Coalesce continuous slider changes into one entry.
- Limit history by count (for example 50) and optionally by serialized size.
- Do not store `ImageBitmap`/`Blob` in history; only references.
- Re-render from the current document after undo/redo.
- Clear history when the document is replaced.

For very large documents, a command-based history (inverse operations) uses
less memory, but it is more complex and error-prone. Start with JSON snapshots;
switch only if measurements demand it.

---

## 8. Persistence

### 8.1 Project format

```text
document.dmhimage (ZIP)
  manifest.json
  project.json        # ImageDocument + layer metadata
  sources/            # optional source copies (portable project)
    <fileId>
```

- `project.json` references `files.id` for sources.
- A project without source copies is lightweight but depends on the app's file
  library; a portable project includes sources and is larger.
- Offer both: "Save project" (references) and "Export portable project"
  (includes sources).
- Do not embed base64 images in `project.json`.

### 8.2 Storage

- Add an `image_projects` object store (migration) for autosaved projects, or
  store the project JSON through the generic `files` store if a single record
  is enough.
- Autosave the document JSON to OPFS/IDB every few seconds after changes.
- Keep autosave out of the undo stack.
- On reopen, if a source handle needs permission, show a reconnect prompt
  before rendering that layer.

### 8.3 Export

- Flatten at full document resolution.
- Export PNG (transparency), JPEG (background required), WebP (optional
  transparency).
- Use the shared `saveBlob()` helper and the save picker when available.
- Optionally export individual layers at their bounds later.
- Show dimensions, estimated size and format before export.

---

## 9. Performance and memory

### 9.1 Budgets

- `width * height * 4` bytes per RGBA surface.
- Track the sum of document, layer caches and history thumbnails.
- Set a document pixel limit (for example 64 MP) and warn above it.
- For documents above the preview budget, render a proxy and only allocate
  full-resolution surfaces during export.

### 9.2 Caching

Cache:

- decoded source `ImageBitmap` per file (bounded LRU);
- post-filter layer bitmap;
- layer thumbnails at small size.

Invalidate:

- source changed → decode again;
- filter stack changed → redraw filtered layer;
- transform/opacity/blend changed → re-composite, but reuse the filtered layer;
- document size/background changed → re-composite all.

### 9.3 Rendering loop

- Schedule renders with `requestAnimationFrame`.
- Coalesce rapid slider updates; draw a lower-resolution preview while
  dragging.
- Avoid re-rendering the whole canvas for a layer that only moved by a few
  pixels; full repaint is acceptable at first, dirty rectangles later.

### 9.4 Workers

- Use `OffscreenCanvas` in a worker for filters and encoding.
- Transfer `ImageBitmap`/`ImageData` instead of cloning.
- Keep one worker per document, not one per filter.
- Handle worker errors and terminate on document close.

### 9.5 Cleanup

- Close `ImageBitmap`s.
- Revoke layer thumbnail and preview object URLs.
- Terminate workers.
- Clear caches on document close and app reset.

---

## 10. Testing

### Unit

- filter serialization/deserialization and defaults;
- filter value clamping;
- filter string generation and order;
- blend-mode mapping completeness;
- layer ordering and z-index operations;
- transform math: scale/rotate/translate bounds;
- history push/coalesce/limit;
- project JSON round-trip with file references;
- export filename and format mapping.

### Pixel tests

Use tiny canvases with solid colors and known expectations:

- `source-over` of red over blue;
- `multiply` of two colors;
- opacity blending;
- filter brightness/contrast on a gray patch;
- mask destination-in;
- crop/offset correctness.

Run these in a browser-like environment; Canvas behavior in jsdom is limited.
If jsdom cannot render, keep the math tests pure and put pixel assertions in
Playwright.

### Component / e2e

- add two images as layers, reorder, change opacity and blend mode;
- move/scale/rotate a layer and verify the export bounds;
- apply a filter preset and export;
- undo/redo restores layer order and filter values;
- missing source shows a relink placeholder;
- transparent export vs JPEG background;
- large document warning.

Avoid full-image screenshot snapshots; they are brittle across browsers and
font/GPU differences. Prefer dimensions, MIME type and a few sampled pixels.

---

## 11. Phases

### Phase 1 — filters on a single image

- Filter stack, presets, preview, export.
- Can live as a "Filters" tab in the quick tool or as its own view.
- No layers yet; reuse the quick-tool pipeline and file APIs.

### Phase 2 — composition MVP

- Document, image layers, move/scale/rotate, opacity, blend modes, reorder.
- Rectangle crop/mask and document background.
- Flatten export.
- Undo/redo via JSON snapshots.

### Phase 3 — richer editing

- Alpha masks, adjustment layers, layer groups.
- Snapping/alignment, text/shape layers (if desired).
- Project autosave and portable project export.
- Per-layer export.

### Phase 4 — performance

- WebGL/WebGPU filter path where profiling shows a need.
- Tiled rendering for very large documents.
- GPU-accelerated blend modes.

---

## 12. Risks

| Risk                                | Mitigation                                          |
| ----------------------------------- | --------------------------------------------------- |
| Feature creep into a full editor    | keep the MVP to filters + image layers              |
| Canvas memory limits                | proxy preview, pixel budget, release surfaces       |
| Browser differences in `ctx.filter` | feature detection + per-pixel fallback              |
| Blend mode inconsistencies          | test on target browsers, document differences       |
| Color profile loss                  | state sRGB-only behavior                            |
| Undo memory                         | JSON snapshots + limit; no bitmap history           |
| Touch transform UX                  | numeric controls + large handles                    |
| Missing/relinked source files       | placeholder + reconnect flow                        |
| Autosave corrupting a project       | write to temp then swap, keep one previous version  |
| Very large exports                  | full-res render only once, stream save via file API |

---

## 13. Acceptance criteria

### Filters

- A user can add, reorder, toggle and remove filters and see the preview
  update.
- Presets apply consistently and can be reset.
- Export uses the same filter stack and settings as the preview.
- At least one fallback works when `ctx.filter` is unavailable.

### Composition

- Users can add at least two image layers, reorder them, and move/scale/rotate
  each one.
- Opacity and blend modes render in preview and export.
- The final export has the document dimensions and selected format.
- Transparent documents export correctly to PNG/WebP; JPEG uses the chosen
  background.
- Undo/redo restores document state without leaking bitmaps or URLs.
- A missing source file shows a clear relink state instead of a broken canvas.

### Performance

- Interactive preview remains responsive with the target layer count on a
  mid-range device.
- Memory stays within the documented budget for supported document sizes.
- Closing the view releases workers, bitmaps and object URLs.

---

## 14. References

- [JavaScript: практическое руководство по Blob, File API и оптимизации памяти](https://habr.com/ru/companies/timeweb/articles/976774/)
  — Blob export, image compression, previews, object URL lifetime.
- [JavaScript. Работа с большими файлами в браузере. Часть 2/2](https://habr.com/ru/articles/1040752/)
  — OPFS, streaming writes, large-file handling.
- [JavaScript: чтение и запись файлов с помощью File System Access API](https://habr.com/ru/companies/timeweb/articles/653703/)
  — open/save pickers and file handles.
- [image-quick-tools.md](image-quick-tools.md) — shared decode/transform/
  encode primitives.
- [generic-file-handling.md](generic-file-handling.md) — storage, backup and
  object URL ownership.
