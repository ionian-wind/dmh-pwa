# Image Quick Tools

**Status:** proposal — not implemented (reviewed 2026-11-09). The shared file
layer and map-image optimizer (`src/utils/images/optimizeImage.ts`) exist, but
there is no `/tools/images` page or crop/resize/convert UI.

**Goal:** a fast, local utility for the common image jobs a DM actually needs:
crop, rotate, resize, convert, compress and batch-process images. It is **not**
a layer editor or a drawing app; filters and composition are covered by
[image-filters-and-composition.md](image-filters-and-composition.md).

**Related documents:**

- [generic-file-handling.md](generic-file-handling.md) — pickers, OPFS,
  streaming and the shared save helper
- [image-filters-and-composition.md](image-filters-and-composition.md) — next
  phase after this tool
- [utils/files.md](../utils/files.md) — current file API
- [maps.md](../features/maps.md) — map image upload flow

---

## 1. Why this tool

The app already stores images for maps and notes, but there is no way to
prepare them:

- Phone photos are 8–20 MB when a 200 KB handout would be enough.
- A map export is often a huge PNG that could be a WebP at a fraction of the
  size.
- Users need a quick crop/rotate before uploading a handout.
- Batch preparation is manual and repetitive.

The tool also becomes the first real consumer of the generic file improvements
(OPFS, `saveBlob`, object-URL ownership) and the shared image utilities that
the larger editor will reuse.

---

## 2. Scope

### 2.1 MVP

- Open an image from a picker, drag/drop, paste, or the app's file library.
- Show dimensions, MIME type and file size.
- Rotate 90° left/right, flip horizontally/vertically.
- Crop with an interactive rectangle.
- Resize by pixels or percentage, with aspect-ratio lock.
- Convert between browser-supported formats: PNG, JPEG, WebP, and AVIF when
  the browser can encode it.
- Quality control for lossy formats.
- Preview the result and compare with the original.
- Save with the File System Access save picker when available; otherwise
  download.
- Add the result to the app's generic `files` store.
- Batch mode: apply one preset to many images.
- Progress and cancellation for batch jobs.

### 2.2 Later

- Copy the result to the clipboard.
- Target file size ("make it under 500 KB") by iterative quality search.
- User-defined presets.
- Metadata inspection (but not preservation).
- Watermark or simple text overlay (see composition document).

### 2.3 Non-goals

- Layers, masks, blend modes and adjustment stacks (composition document).
- Drawing/annotation.
- Animated GIF/WebP editing; the tool works on the first frame and warns.
- Color-managed workflows and ICC profile preservation.
- A server-side upload or image CDN.
- Replacing a full desktop editor.

---

## 3. User experience

### 3.1 Entry points

- A new **Tools → Image Tools** page at `/tools/images`.
- An "Edit image" action on a map location or note image later.
- A compact dialog version is possible, but a full page gives enough room for
  crop handles and batch lists.

### 3.2 Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Toolbar: Open · Undo · Redo · Before/After · Save · Batch     │
├───────────────────────────────────┬──────────────────────────┤
│                                   │ Format: WebP ▾           │
│          Image preview            │ Quality: 85              │
│          with crop overlay        │ Resize: 4096 × auto      │
│                                   │ Rotate / Flip            │
│                                   │ Crop: x y w h            │
│                                   │ Estimated result         │
├───────────────────────────────────┴──────────────────────────┤
│ Status: 4032×3024 → 4096×3072 · 8.4 MB → 820 KB              │
└──────────────────────────────────────────────────────────────┘
```

Empty state:

- large drop zone with icon;
- "Open image" button;
- "Paste from clipboard" hint;
- supported format hint.

Mobile:

- preview fills the page;
- settings in a bottom sheet;
- crop handles remain touch-friendly.

### 3.3 Interaction rules

- All transforms are non-destructive until save/export.
- The preview is downscaled for display; the final render uses full
  resolution.
- The user can always reset to the original.
- Batch mode reuses the current settings as a preset; per-image overrides are
  optional later.
- Destructive actions (reset, remove from batch) are undoable while the tool
  is open.

---

## 4. Architecture

### 4.1 Proposed files

```text
src/image-tools/
  ImageToolsView.vue
  components/
    ImageDropZone.vue
    ImageToolbar.vue
    ImagePreview.vue
    ImageCropOverlay.vue
    ImageSettingsPanel.vue
    BatchImageList.vue
    BatchProgress.vue
  composables/
    useImageJobs.ts
    useImageEditor.ts
    useCropSelection.ts
  imageOps.ts
  imageWorker.ts
  types.ts
  presets.ts

src/utils/images/
  decode.ts
  transform.ts
  encode.ts
  dimensions.ts
  format.ts
```

`src/utils/images/` is deliberately separate from the view module so maps,
notes, the composition editor and the image tool share the same primitives.

### 4.2 Reuse from the current tree

| Existing code                      | Reuse                                           |
| ---------------------------------- | ----------------------------------------------- |
| `@/utils/files/pickFiles`          | Open images, preserve handles                   |
| `@/utils/files/fileStorage`        | Add result to the library                       |
| `@/utils/files/access`             | Read handles, permissions                       |
| `saveBlob` from the file proposal  | Save/download results                           |
| `src/maps/worker/image.worker.ts`  | `createImageBitmap` + `OffscreenCanvas` pattern |
| `src/maps/utils/imageWorker.ts`    | Worker orchestration pattern                    |
| `useLayout` / `useRightDrawer`     | Page chrome, optional settings drawer           |
| `EmptyState`, `QBtn`, `EntityTabs` | Consistent UI                                   |

Do not put large Blobs or data URLs in Pinia. The view owns the active
`File`/`Blob` and releases it on unmount.

---

## 5. Data model

```ts
export type OutputFormat =
  'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResizeOptions {
  mode: 'fit' | 'cover' | 'stretch';
  width?: number;
  height?: number;
  percent?: number;
  keepAspect: boolean;
}

export interface ImageSettings {
  rotate: 0 | 90 | 180 | 270;
  flipHorizontal: boolean;
  flipVertical: boolean;
  crop: CropRect | null;
  resize: ResizeOptions | null;
  format: OutputFormat | 'original';
  quality: number; // 0..1, used by JPEG/WebP/AVIF
  background: string; // for JPEG / transparent flattening
}

export type ImageJobStatus =
  'queued' | 'processing' | 'done' | 'error' | 'cancelled';

export interface ImageJob {
  id: string;
  file: File;
  source: StoredFileSource;
  settings: ImageSettings;
  status: ImageJobStatus;
  result?: Blob;
  resultUrl?: string;
  resultName?: string;
  error?: string;
}
```

The source stays a `File`/handle. Results are Blobs only after processing.

---

## 6. Processing pipeline

### 6.1 Canonical order

Apply operations in a fixed order so preview and export agree:

1. **Decode** with EXIF orientation applied (`imageOrientation: 'from-image'`).
2. **Rotate/flip** in the source coordinate system.
3. **Crop** using source pixels after rotation/flip.
4. **Resize** to the final output dimensions.
5. **Encode** in the requested format and quality.

Document this order in the UI when crop coordinates are shown. Changing the
order later would invalidate saved settings.

### 6.2 Decode

```ts
export async function decodeImage(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' });
}
```

Fallback for browsers without `createImageBitmap` options support:

1. create an `<img>` with an object URL;
2. wait for `decode()`/`load`;
3. draw it to a canvas;
4. revoke the URL immediately after drawing.

Always call `bitmap.close()` when done. A decoded image costs
`width * height * 4` bytes; a 6000×4000 image is about 96 MB in RGBA.

### 6.3 Transform and resize

```ts
export function fitIntoBox(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  let w = width;
  let h = height;
  if (w > maxWidth) {
    h = (h * maxWidth) / w;
    w = maxWidth;
  }
  if (h > maxHeight) {
    w = (w * maxHeight) / h;
    h = maxHeight;
  }
  return { width: Math.round(w), height: Math.round(h) };
}
```

Modes:

- **fit/contain:** the whole image fits, transparent/background padding.
- **cover:** fills the target and crops the overflow (centered by default).
- **stretch:** exact dimensions, aspect ratio may change.
- **percent:** scales both dimensions, clamped by the pixel budget.

Validation:

- Reject zero or negative dimensions.
- Warn when upscaling more than 2×.
- Enforce a maximum output dimension and pixel count (see §9).

### 6.4 Encode

```ts
export async function encodeCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  format: OutputFormat,
  quality: number,
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type: format, quality });
  }
  return new Promise((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))),
      format,
      quality,
    );
  });
}
```

Important: `canvas.toBlob()`/`convertToBlob()` may silently fall back to PNG
when the requested type is unsupported. Always check the returned
`blob.type`; if it differs, tell the user and offer a supported format.

### 6.5 Worker execution

Use a worker for batch jobs and large images:

- post the `File` (structured clone) or an `ImageBitmap` (transferable);
- perform decode/transform/encode in the worker;
- return a Blob;
- keep one worker per batch and terminate it when the batch ends.

For a single interactive image, main-thread canvas is acceptable and simpler;
move it to the worker when the image exceeds a size threshold.

### 6.6 Preview vs export

- Preview: downscale to fit the viewport (and `devicePixelRatio`) before
  drawing.
- Export: render the full-resolution image once, then release it.
- Do not re-encode on every slider movement. Debounce expensive preview
  updates and show a low-quality preview while dragging.

---

## 7. UI details

### 7.1 Toolbar

- Open image
- Undo / redo (operation history)
- Reset
- Before/after toggle
- Zoom to fit / 100%
- Save
- Add to library
- Batch mode toggle

### 7.2 Settings panel

- **Format:** original / PNG / JPEG / WebP / AVIF (only show AVIF if encoding
  works).
- **Quality:** visible for lossy formats; default 0.85.
- **Background:** visible for JPEG or when flattening transparency; default
  white.
- **Resize:** width/height fields, percent, mode, aspect lock.
- **Rotate/flip:** buttons.
- **Crop:** numeric fields plus "reset crop" and "select all".
- **Estimated result:** last encoded size, dimensions and reduction percentage.
  Label it as an estimate until the full-size encode completes.

### 7.3 Presets

Start with fixed presets:

| Preset         | Settings                              |
| -------------- | ------------------------------------- |
| Handout        | WebP, 1920 px max, quality 0.85       |
| Map            | WebP or PNG, 4096 px max, quality 0.9 |
| Token          | WebP, 512 px, quality 0.9             |
| Lossless       | PNG, original size                    |
| Social preview | JPEG, 1200 px, quality 0.85           |

Presets are constants first; user presets can be stored in `configStore` later.

### 7.4 Batch mode

- Drop or pick multiple files.
- Each row shows thumbnail, original size, result size and status.
- Start/stop/cancel.
- Process one or two files at a time to bound memory.
- A failure in one file does not stop the batch; collect errors and show a
  summary.
- "Save all" uses one save picker per file (or a directory picker when
  available).

### 7.5 Keyboard and accessibility

- `Ctrl/Cmd+O` open, `Ctrl/Cmd+S` save, `Ctrl/Cmd+Z` undo, `Escape` close
  crop.
- Every icon button needs `title` and `aria-label`.
- Crop handles must be keyboard-adjustable or have numeric inputs as an
  alternative.
- All text goes through `en.json` / `ru.json`.

---

## 8. Format and quality rules

| Input     | Behavior                                                          |
| --------- | ----------------------------------------------------------------- |
| JPEG      | Decode, rotate/crop/resize, re-encode; EXIF is stripped           |
| PNG       | Preserve transparency when output is PNG/WebP                     |
| WebP      | Decode and re-encode; animation becomes first frame               |
| GIF       | First frame only; warn; offer "keep original"                     |
| AVIF      | Decode if supported; encode only if `toBlob` returns `image/avif` |
| SVG       | Rasterize at target size; external references may fail            |
| HEIC/HEIF | Not decoded by canvas; show a clear unsupported-format error      |
| BMP/TIFF  | Browser-dependent; try `createImageBitmap`, otherwise error       |

Notes:

- Canvas re-encoding strips EXIF, ICC profiles and most metadata. Tell the
  user this in the export panel.
- JPEG has no alpha; flatten on the selected background.
- Transparency in WebP is supported; quality still applies to lossy WebP.
- Animated output is out of scope.
- Color management is sRGB. Wide-gamut images may shift; show a warning only
  when the browser exposes enough color information to know.

---

## 9. Performance and memory

### 9.1 Pixel budget

```ts
const MAX_OUTPUT_PIXELS = 64 * 1024 * 1024; // ~64 MP, adjust after testing
const MAX_OUTPUT_DIMENSION = 16_384;
```

- Reject or offer downscaling when the target exceeds the budget.
- Browser canvas limits vary; catch `toBlob` failures and show a useful error.
- Preview at viewport scale; never keep a full-resolution `ImageData` for
  longer than necessary.

### 9.2 Batch concurrency

- One worker, one file at a time by default.
- Allow two concurrent jobs only for small images.
- Report progress per file and overall.

### 9.3 Object URL ownership

- Every thumbnail/result URL gets a `createObjectUrlHandle()` from the file
  proposal.
- Revoke when replacing a result, removing a row, or unmounting the view.
- Do not create URLs for every render; cache per job and release explicitly.

### 9.4 Cancellation

`AbortSignal` propagates from the UI to the worker. On cancel:

1. stop scheduling new jobs;
2. terminate the worker if a job is in flight;
3. mark the current job `cancelled`;
4. revoke any partial result URLs.

---

## 10. Persistence

Two independent decisions:

1. **Source:** keep the picked handle when possible. If the user opened a file
   from the app library, reuse its `StoredFile`.
2. **Result:** save to the user's disk, add to the app library, or both.

- The quick tool does **not** need a project format. It is a transformation
  pipeline, not an editable document.
- Store the last used settings in `configStore` (format, quality, max size,
  background).
- "Add to library" uses `importFile()` with an OPFS/blob source according to
  the file proposal.
- The source is not copied into the library unless the user asks.
- If a handle loses permission, show "Reconnect file" instead of a broken
  preview.

---

## 11. Tests

### Unit

- `fitIntoBox()` math: landscape, portrait, zero, huge, rounding.
- resize modes: fit, cover, stretch, percent.
- crop/rotate/flip ordering with known rectangle values.
- format support detection: requested type vs actual `blob.type`.
- quality clamping (0..1).
- filename generation and extension mapping.
- batch reducer: queue → processing → done/error/cancelled.

### Component

- drop zone accepts images and rejects other types.
- settings disable quality for PNG.
- batch rows show status and errors.
- save button is disabled with no result.
- keyboard shortcuts do not fire while typing in an input.

### Browser / e2e

Use small generated fixtures (for example 4×4 PNGs with known colors) to keep
tests fast.

- open → rotate → resize → export; assert dimensions and MIME type.
- crop a known region; assert the output pixel color.
- batch two images; assert both results and a failure row.
- unsupported format shows a message, not a silent PNG fallback.

Pixel assertions should use tiny canvases and solid colors; avoid full-image
snapshots.

---

## 12. Phases

### Phase 1 — single image MVP

- Open, preview, rotate, flip, crop, resize.
- PNG/JPEG/WebP export with quality.
- Save via `saveBlob`.
- Object URL ownership and pixel guards.

### Phase 2 — batch and library

- Multi-file queue, presets, progress and cancellation.
- "Add to library" through `importFile`.
- Folder picker when available.

### Phase 3 — polish

- Clipboard paste/copy.
- Target-size search.
- AVIF where supported.
- Map/note entry points ("Optimize image").
- User presets.

---

## 13. Risks

| Risk                         | Mitigation                                   |
| ---------------------------- | -------------------------------------------- |
| Canvas memory limits         | pixel budget, preview scaling, catch errors  |
| Browser format differences   | verify `blob.type`, hide unsupported formats |
| Animated images              | first-frame warning, keep-original option    |
| EXIF/ICC loss                | state it in the export panel                 |
| SVG tainting/external refs   | catch errors, explain                        |
| Batch memory spikes          | one job at a time, release bitmaps           |
| Worker support differences   | fall back to main-thread canvas              |
| Oversized crop/resize values | clamp and validate in the UI and pipeline    |

---

## 14. Acceptance criteria

- A user can open an image, crop/rotate/resize it, choose a format and quality,
  and save the result.
- The preview and the export use the same operation order and dimensions.
- Transparent images can be exported as PNG/WebP; JPEG flattens on a chosen
  background.
- Unsupported formats never silently produce a PNG with the wrong extension.
- Batch mode processes multiple images with progress and per-file errors.
- No object URL or decoded bitmap is retained after the view closes.
- Large images respect the pixel budget and show a useful error instead of
  crashing the tab.
- All labels exist in English and Russian.

---

## 15. References

- [JavaScript: практическое руководство по Blob, File API и оптимизации памяти](https://habr.com/ru/companies/timeweb/articles/976774/)
  — Blob export, image compression, previews, object URL lifetime.
- [JavaScript: чтение и запись файлов с помощью File System Access API](https://habr.com/ru/companies/timeweb/articles/653703/)
  — open/save pickers and writable streams.
- [JavaScript. Работа с большими файлами в браузере. Часть 2/2](https://habr.com/ru/articles/1040752/)
  — streaming writes for large exports.
- [generic-file-handling.md](generic-file-handling.md) — shared file API used
  by this tool.
