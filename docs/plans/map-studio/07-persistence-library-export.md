# Map Studio — persistence, local library, import and export

## 1. Goals

- Local equivalents of Dungeon Scrawl Pro cloud features: library, autosave, multiple maps, shareable-through-file copies.
- Reliable offline persistence with recovery.
- Interchange with the current maps feature by baking images.
- Practical `.ds` import/export and VTT-friendly exports.

## 2. Local library

### Library view (`/map-studio`)

- Thumbnail grid, most recently opened first.
- Each card: cover thumbnail, project name, map count, updated date, dimensions, actions menu (open, rename, duplicate, delete, export, apply to location).
- Actions: “New map”, “Import `.ds`”, “Import project bundle”, search/sort (recent/name/size).
- Empty state with quick start.
- Mobile: one/two-column grid, larger cards, bottom-sheet action menu.

### Project vs map

- A project is a library entry comparable to a `.ds` file and may contain multiple maps.
- The library “Open” opens the project’s last map.
- The Maps panel inside the studio manages maps within the project.
- Duplicate project copies documents and references; image assets are shared by file id (copy-on-write only if deleted).

### Storage estimate

- Show per-project size and total usage; warn when large.
- Offer “clean unused assets” and “export then delete” flows.
- Do not silently delete unreferenced assets; reuse the existing file reference system and a studio-specific reference scan.

## 3. Autosave and recovery

- Autosave debounce: 1000 ms after command commit; immediate on tool switch? No, only content changes.
- Autosave writes:
  - `map_studio_maps.document`,
  - project metadata/updatedAt,
  - thumbnail occasionally (every 30 s or on manual save/close).
- Status indicator: `Unsaved changes` → `Saving…` → `Saved to device` / `Autosave failed`.
- Manual save also flushes autosave; “Save” in the File menu can mean “flush local changes” because all saves are local. Labels should be explicit: **Save** (flush), **Export** (download).
- Crash recovery:
  - Snapshot after every 20 commits and every 5 minutes.
  - On open, compare latest snapshot vs map record; offer “Restore unsaved changes” if a snapshot is newer than the map record’s manual/autosave marker.
  - Keep last 10 snapshots per map; purge older.
- Undo history is not persisted across reloads.
- Multi-tab editing: use a BroadcastChannel/localStorage lock. Second tab opening the same project gets “Open read-only” or “Take over” (first tab autosaves stop). Plan: detect and warn; implement take-over in P2.

## 4. File formats

### 4.1 Native project bundle (`.dmhstudio`)

ZIP (using `jszip`) containing:

```
manifest.json
project.json
maps/<mapId>.json
assets/<assetId>.<ext>        (optional)
preview.png
```

- `manifest.json`: format version, app version, created/updated, map list, asset list, checksums (optional).
- `project.json`: metadata/settings.
- `maps/*.json`: normalized `StudioMap` documents.
- Assets embedded when “include images” is enabled; otherwise references remain and the import reports missing assets.
- Import validates manifest/version, parses maps, imports assets into StoredFile, then opens.
- Exporting a bundle is the local “share a copy” equivalent.

### 4.2 `.ds` import

Input: ZIP with a JSON file (often one entry). Known structure from community importer:

- `data.geometry[geometryId].polylines` / `polygons`: compiled walls/rooms.
- `state.document.nodes`: node map with `type`, `name`, `geometryId`, `transform`, `alpha`, `visible`, `config`.
- `state.document.nodes.document.children`: root order; `grid.cellDiameter`.

Import strategy:

1. Parse JSON with size limits and validation.
2. Create a new project/map (or import as new map into current project; never overwrite silently).
3. Convert:
   - classic dungeon nodes/geometry → dungeon layer shapes. Since source shape parameters are not available, convert compiled polygons to polygon shapes with `add`; doors/stairs to door/stairs objects; lights to light objects; images to image objects (extract embedded assets when possible).
   - preserve layers/folders where the node tree maps cleanly; otherwise one dungeon layer per node group.
   - preserve transforms/tints/visibility/opacity where possible.
4. Run geometry validation; report counts and unsupported features.
5. Import as a normal editable document. Keep a provenance note (`metadata.generator = 'ds'`).

Limitations to document in UI:

- Rough/smooth source settings cannot be reconstructed from compiled geometry.
- Some node configs/styles may not map; fall back to defaults.
- Images embedded in `.ds` may need manual relinking if extraction fails.

### 4.3 `.ds` export

Produce a best-effort `.ds` ZIP:

- Render a map preview image and include it.
- Export a document node tree (`document` with children, grid).
- Export dungeon layers as geometry nodes with compiled polygons/polylines.
- Export doors/stairs/light/image/text nodes with names/transforms/config where known.
- Include doors in geometry and as door nodes (for wall gaps) following the community importer convention.
- Warn: styles/presets are simplified; `.ds` round-trip is not exact.

### 4.4 Image export

- Formats: PNG (default), WebP, JPG.
- `Pixels per cell`: default 70 (VTT-compatible); supported range 14–200 (warn above 140 on mobile).
- Output dimensions = export area (cells) × PPC; verify against browser canvas limits (e.g. 16k–32k side, memory).
- Export area overlay draggable/resizable, numeric fields, reset to content bounds.
- Include grid toggle (default off for VTTs, on for print).
- Include fog toggle.
- Filename sanitized; download via Blob URL; revoke after.
- Copy to clipboard (PNG) where `ClipboardItem` supports it.

### 4.5 PDF export

- `jspdf` with raster pages.
- Settings: paper size (A4/Letter/A3/custom), margin, print DPI, cell size in mm/inches.
- Compute pages from export area; render tiles at target DPI (cap per-tile texture size) and add to pages with optional crop marks.
- Preview page count/size; warn on huge jobs.
- Multi-page grid with overlap option (e.g. 5 mm) for assembling.
- No vector PDF in v1; raster is acceptable and matches reference.

### 4.6 UVTT export

Produce ZIP with:

```json
{
  "format": 0.3,
  "resolution": { "map_origin": { "x": 0, "y": 0 }, "map_size": { "x": ..., "y": ... }, "pixels_per_grid": 70 },
  "image": "map.png",
  "walls": [{ "x1": ..., "y1": ..., "x2": ..., "y2": ..., "blocks_light": true, "blocks_movement": true }],
  "doors": [{ "x": ..., "y": ..., "bounds": [...] }],
  "lights": [{ "x": ..., "y": ..., "range": ..., "color": "..." }],
  "portals": []
}
```

- Coordinates in pixels at chosen PPC; walls from compiled boundary segments + wall annotations; doors from door objects; lights from light objects.
- Include the rendered PNG at the same PPC.
- Validate against a known consumer if possible; document any deviations.

### 4.7 Apply to location

Flow (studio-side):

1. User chooses “Apply to location”.
2. Dialog selects a location (default the one linked to the project) and PPC.
3. Render export PNG with recommended PPC (70).
4. Create a `MapFile` through existing file utilities; set image metadata dimensions.
5. Load the location, normalize its `LocationMap`, update only `fileId`; preserve `layers`, `markers`, `areas`.
6. Delete the previous map file if unreferenced (existing helper).
7. Show success with “Open location”.
8. Do not include studio markers/areas; nothing is written except the background file id.

Reverse link: a studio project stores optional `locationId` in metadata; opening from a location finds or creates it. If the image is changed outside the studio, warn that the linked background differs.

## 5. Importers

### Watabou One Page Dungeon

- Parse the JSON export’s rooms/corridors/doors/notes.
- Convert rooms to polygons (add), corridors to paths/rectangles, doors to door objects, notes to text or ignored with a report.
- Place in a new map with a neutral preset.
- Preserve seed/title if present.

### donjon 5e random dungeon

- Parse the saved map; convert rooms/corridors/doors.
- Known limitations: polymorph rooms/corridors may be unsupported; report skipped shapes.
- Import into a new map, not replacing the current one.

### External `.ds`

See above.

## 6. Backup/restore

- Add new stores to the backup manifest and tests.
- Assets: use the existing file storage backup; studio asset references are file ids, so they survive relinking.
- Project thumbnails stored in records are small; if stored as files, include them.
- Restore: import project records first, then assets; missing assets become placeholders and are reported.

## 7. Security

- Validate imports:
  - zip file count/size caps (e.g. 10k files, 500 MB uncompressed),
  - JSON max size,
  - no path traversal in zip extraction,
  - normalize/sanitize names.
- SVG uploads: rasterize to PNG/bitmap before storing, never inject SVG markup into the DOM.
- No remote URLs in documents; only local asset ids. Importing a document with external URLs shows a warning and does not fetch automatically.
- `.ds`/JSON import never executes scripts.
- File downloads revoke object URLs; no persistent blob leaks.

## 8. Tests

Unit:

- Repository CRUD, autosave debounce, snapshot retention, recovery selection.
- Serialization round-trip of native format.
- `.ds` importer fixtures: geometry/door/stair/light counts, unsupported report.
- UVTT JSON structure and wall/light coordinates.
- Apply-to-location updates only `fileId`, preserving markers/areas/layers.
- Export dimension math and page tiling.
- Asset reference cleanup.

Integration/Playwright:

- Create → autosave → reload → reopen.
- Export PNG and verify dimensions.
- Export PDF page count.
- Apply to location and open existing viewer (markers/areas intact).
- `.ds` import fixture → editable map.
- Touch: create map, draw room, export.

## 9. Acceptance criteria

- No data loss after refresh within the autosave interval; recovery prompt otherwise.
- Library operations work offline and never lose projects on failure.
- Export always produces a valid file or a clear actionable error.
- Applying to a location preserves existing markers/areas/layers exactly.
- Import failures leave existing data untouched.
