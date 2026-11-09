# Map Studio — geometry engine and tools

## 1. Coordinate systems

- **Document coordinates:** grid cells, origin top-left, `+y` down. Stable across zoom/export.
- **Display coordinates:** pixels = cells × `70` (base PPС) × camera.zoom.
- **Isometric:** a display-only projection applied to the world container and reversed on input. Document coordinates remain orthogonal.
- **Hex grids:** cell coordinates remain [x, y] floats; hex snapping maps to the nearest hex center/edge. Rendering converts to hex geometry.

All tool math uses document coordinates. Snapping is applied before geometry creation. Geometry is never stored in screen pixels.

## 2. Snapping and constraints

```ts
interface SnapState {
  enabled: boolean;
  division: number;         // 1..9; snap step = 1 / division
  angleSnap: boolean;       // Shift
  gridType: 'square' | 'hex' | 'none';
  cellSize: number;         // normally 1
}
```

- Square: round to `round(value * division) / division`.
- Hex: convert to nearest hex center for points; for edges, project to nearest hex edge when appropriate.
- Shift constrains line/path segments to 45° increments; rectangle/circle constrain to square/circle.
- While dragging handles, snap translation and corner positions; show guide lines at grid lines and object edges (object-edge snapping as P2).
- Division changes via `Shift+S` + digit; snap toggle via `S`.
- UI displays the current division in the toolbar and a subtle grid sub-line when division > 1.

## 3. Shape sampling pipeline

### 3.1 Raw geometry

| Kind | Sampling |
| --- | --- |
| Rectangle | 4 corners; optional rounded corners via arcs sampled at `max(4, ceil(radius * 32))` points per corner. |
| Regular polygon | `sides === 1` → circle sampled adaptively; else vertices at radius and rotation; `drawTo: 'point'` places a vertex at the drag angle, `'edge'` places an edge midpoint at it. |
| Polygon | input points, optionally closed. |
| Path | input centerline, optionally closed; expanded by radius. |
| Wall | input centerline; expanded by radius for fill? Walls are strokes, not fills; dashed segments generated at render/export. |
| Door | rectangle/segment from two points plus variant decoration. |
| Stairs | parallel step lines between `a-b` and `c` direction. |

### 3.2 Smoothing

Catmull-Rom → cubic Bézier → adaptive sampling (tolerance in cells, e.g. 0.01). For closed shapes wrap points. Smooth overrides snap per docs; UI indicates that.

### 3.3 Roughness

Deterministic midpoint displacement / normal-offset noise:

1. Sample the outline at a fixed spacing (`~0.08` cells, adaptive).
2. For each point compute a seeded perpendicular offset with layered value noise.
3. Amplitude by level: 1 = 0.03 cells, 2 = 0.07, 3 = 0.14 (tunable).
4. Smooth the offset curve to avoid spikes.
5. Ensure closed shapes remain closed; preserve self-intersection freedom enough for polygon-clipping.

Seed = node `seed` or stable hash of node id. “Post-draw roughening” uses pointer distance from the shape to scale amplitude while previewing; the committed value is frozen into the shape’s stored `rough` level and optional `roughStrength` override.

### 3.4 Path/wall stroke expansion

- Offset the centerline by ±radius with miter joins; cap style round/square/butt (default round).
- Detect and resolve self-intersections with polygon-clipping when the path overlaps itself.
- Freehand points are simplified with Douglas-Peucker (`tolerance ≈ 0.02` cells) before expansion; keep raw points if below threshold.
- Dashes: generate dash segments along the centerline; for fills, dashes are not part of the union (walls are strokes/annotations).

## 4. Geometry compilation

```ts
function compileDungeonLayer(layer: DungeonLayer): CompiledDungeonGeometry {
  let current: MultiPolygon = [];
  for (const shape of layer.shapes) {
    const polygon = shapeToPolygon(shape); // deterministic
    current =
      shape.operation === 'add'
        ? union(current, polygon)
        : difference(current, polygon);
  }
  return {
    polygons: current,
    wallSegments: extractBoundarySegments(current).concat(
      layer.shapes.filter(isWall).flatMap(wallSegments)
    ),
    bounds: computeBounds(current),
  };
}
```

Rules and edge cases:

- Empty initial geometry: `add` unions, `subtract` no-ops.
- Degenerate shapes (< 0.001 cells or < 3 points) are ignored with a toast/preview warning.
- Self-intersecting polygons: normalize before union; if polygon-clipping yields empty, keep previous state and show a transient warning.
- Shared walls: exact adjacent/overlapping rectangles merge in the union; boundaries exclude the shared edge.
- Erase: subtracts from the current state, so a later add can restore area. This matches “draw over walls afterwards”.
- Explicit wall shapes are rendered as strokes and included in UVTT/lighting; they are not floor fills.
- Performance: incremental union is order-dependent and can be slow for thousands of shapes. Optimizations:
  - Cache compiled geometry per layer and per shape prefix? Use revision-based full rebuild first.
  - Batch union of all `add` shapes that are not intersected by later subtractions.
  - Tile/spatial index: split into spatial buckets, compile per bucket, merge only for fills/boundaries.
  - Debounce rebuild during drag; render a preview overlay; rebuild once on commit.
  - For very large maps, render each shape live and compile geometry lazily for wall/export/lighting only.

## 5. Tool framework

Common context:

```ts
interface ToolContext {
  map: StudioMap;
  layer: DungeonLayer | ImagesLayer;
  camera: CameraState;
  snap: SnapState;
  settings: ToolSettings;
  preview: PreviewApi;
  commands: CommandApi;
  selection: SelectionApi;
  isTouch: boolean;
  modifiers: Modifiers;
}
```

Tool lifecycle: `activate`, `deactivate`, `pointerDown`, `pointerMove`, `pointerUp`, `doubleClick`, `keyDown`, `cancel`, `renderPreview`.

Tools commit at most one command per completed gesture. Drags of existing objects use a coalesced `TransformObjects` command.

## 6. Pan tool

- Selectable; otherwise active temporarily with Space/middle mouse/two fingers.
- Drag updates camera; wheel/pinch zooms around cursor.
- Touch: two-finger pan + pinch.
- No document mutation; not in history.

## 7. Rectangle tool

Interaction:

1. Pointer down sets the anchor; drag shows preview; pointer up commits.
2. Shift constrains to a square; Alt centers from anchor (optional).
3. Snap applies to both corners and width/height.
4. If `cornerRadius > 0`, corners are rounded.
5. Rough mode: after pointer up, show a preview with a floating “roughness strength” follow line; moving the pointer changes amplitude; a second click/Enter commits, Escape cancels. On touch, use a slider in the tool settings instead of a second step.
6. Erase mode sets `operation: 'subtract'`.

Adjacent rooms: separate adds union; touching edges merge, shared wall disappears. Overlap also merges. Walls drawn after can be erased by drawing over in erase mode.

## 8. Circle / regular polygon tool

1. Pointer down sets center (or first edge depending on draw-to? docs use drag radius; use center at down, radius to pointer).
2. Drag sets radius; live label in cells.
3. `sides` controls vertices; `sides = 1` renders a circle.
4. `drawTo` rotates the polygon so a point or edge faces the drag direction.
5. Shift constrains angle? radius is radial; Shift may toggle circle/square? Use Shift to lock rotation to 15° for point/edge orientation.
6. Rough mode: same two-step strength behavior as rectangle.
7. Snap: center and radius snap according to division.
8. Erase mode subtracts.

## 9. Path tool

- Snap on: click to place points; double-click/Enter to finish; `Z` removes last point; Escape cancels.
- Snap off: click points or press-drag freehand; pointer samples every ~3–5 px screen distance (simplified later).
- `radius` controls stroke half-width; `[`/`]` adjust by one division step; typed value.
- Smooth mode overrides snap; points are interpolated with Catmull-Rom.
- Closed toggle (button or click near start) closes the path.
- Path can cross itself; union handles overlaps.
- Erase mode subtracts the expanded stroke.
- Preview shows centerline plus outline.

## 10. Polygon tool

- Click points; double-click/Enter closes and commits; `Z` removes last point.
- Snap off allows freehand drag like path but without radius expansion (polygon fill).
- Smooth mode curves edges; closing back to the start point or double-click.
- Erase mode subtracts.
- Rough mode as above.

## 11. Wall tool

- Click points; double-click/Enter finishes. With snap off, click-drag draws unsnapped line.
- Wall is a stroke annotation, not room fill:
  - Render as line segments with width, color, dash, smooth, rough.
  - Optionally participates in “blocks light” and wall export.
  - Can be drawn inside or outside rooms.
- Erase mode removes wall annotation segments and can also subtract room geometry? Docs: erasing a wall uses another tool (draw/erase depending on location). Keep wall tool erase limited to wall annotations; room geometry erase via rectangle/path/polygon tools.
- Dash size in cells; dash pattern scales with export.

## 12. Select tool (geometry)

Purpose: select/copy/cut/paste areas of dungeon geometry across layers/regions.

Flow:

1. Draw a selection polygon/freehand region (same interactions as polygon).
2. On finish, compute `selectionPolygon`; collect intersections with each visible/unlocked dungeon layer’s compiled geometry.
3. Show mini menu above bounds: Copy, Cut, Delete.
4. Copy: store a `ClipboardGeometry` containing:
   - layer style snapshots (for paste style)
   - per-layer polygons clipped to the selection
   - optional source bounds and transform.
5. Cut/Delete: dispatch `SubtractGeometry` per affected layer with the selected region? No—Cut must remove only the selected geometry, not everything inside the region? Dungeon Scrawl cut/copy works on the selected area of the drawing. Implement as:
   - Copy: intersection of layer geometry with selection polygon.
   - Cut: difference of layer geometry with selection polygon (removes selected area).
   - Delete: same as cut but no clipboard.
6. Paste: switch to paste mode with a preview; move/resize/rotate/flip; Enter commits, Escape cancels.
   - Pressing paste while in erase mode creates subtractive shapes from the clipboard geometry.
   - Paste target = active layer; paste style defaults to clipboard style or active layer style (toggle in settings).
7. Clipboard panel stores named/last entries with thumbnails; session clipboard (persist optionally).
8. Select tool and Object tool are separate: geometry vs objects.

## 13. Door tool

- Two clicks: `a`, `b` define the door opening (position/width). Snap applies.
- Object stored with `transform` derived from endpoints; `variant` selects visual.
- Fill/stroke colors, rough level; render as a rectangular door leaf/threshold + swing/arc variant.
- Placed in the Images layer/folder (active folder).
- Edit via Object tool: drag endpoints/handles; Layer Settings shows door fields.
- Doors are excluded from floor geometry but included in wall gaps/UVTT door list.
- On top of a wall, cut a gap in the wall? Dungeon Scrawl places doors as objects over walls; our wall renderer can optionally mask a gap under the door bounds. Plan: door render covers the wall; export UVTT includes door segment; optional wall gap masking as P2.

## 14. Stairs tool

- Three clicks:
  - `a` and `b`: width/top step endpoints.
  - `c`: bottom step anchor/direction.
- Object stores endpoints; steps = parallel lines between top and bottom, count from `stepsPerCell` × distance.
- Stroke color/rough; placed in Images layer.
- Object tool moves/rotates/scales; editing endpoints can be handled by bounding box + direction handle.
- Rendering supports straight stairs; curved stairs are out of scope unless approximated by multiple objects.

## 15. Text tool

- Click to place a text object; immediately enter inline editing overlay (HTML `textarea`/contenteditable positioned over canvas).
- Type text; Escape/blur/Enter (with Shift for newline) commits; empty text removes the object.
- Anchor/alignment: object bounds from text metrics; left/center/right alignment inside a width that can be resized.
- Fonts: built-in web fonts + user-installed local fonts detected via `document.fonts` where available; store family name and fallback.
- Size in cells (display as pt at 70 ppc); color; shadow; line height.
- Multi-line, emoji and IME supported by the HTML overlay; Pixi Text renders the committed result.
- Editing an existing text object by double-click (Object tool) opens the overlay with the caret at the click.
- Text is exported as part of the raster/PDF; no vector text in UVTT.
- Mobile: overlay uses the native keyboard and keeps the object visible above the keyboard.

## 16. Stamp tool

- Requires a selected image asset (from Images panel or current object).
- Click to place one stamp; click-drag samples at `repeatSpeed` ms (throttled by pointer distance).
- Each stamp becomes an independent image object.
- Randomized per stamp: scale within `[min,max]`, rotation within range, tint around base color with color variance, optional shadow.
- If a folder is selected, stamps are inserted into it; otherwise active images layer/folder.
- Snap applies to the stamp origin.
- Performance guard: limit max stamps/second and total objects; show a warning near limits.
- Multi-select afterwards works normally.

## 17. Object tool

Selection:

- Click hit-tests objects in topmost visible/unlocked layers; shift toggles; drag on empty canvas draws a marquee.
- Handles: 8 resize handles + rotate handle; touch handles are larger and spaced outward.
- Multi-selection bounding box; mixed types allowed.
- Double-click text enters edit; double-click image opens asset info; double-click group enters group (optional).

Transform:

- Move: drag or arrows; snap translation to grid; hold Alt to disable snap; shift constrains axis.
- Resize: drag handle; shift preserves aspect; Alt resizes around center; multi-select scales all relative to group bounds.
- Rotate: drag rotate handle; shift snaps to 15°; display angle label.
- Group: creates a `GroupObject` with children relative transforms; group transform applies to children. Ungroup bakes group transform into children.
- Flip: horizontal/vertical around selection center.
- Z-order: within parent; front/back.
- Delete, duplicate, copy/paste; paste preview follows pointer and Enter confirms.
- Locked objects cannot be selected; hidden objects are not hit-tested.
- Context menu: duplicate, bring front, send back, flip H/V, group/ungroup, delete, lock/unlock.
- Touch: long-press opens context menu; handles are thumb-friendly; two-finger rotate/scale when an object is selected (optional P3).

## 18. Geometry hit testing

- Point-in-polygon against compiled layer geometry; ignore holes.
- For quick hover/selection, use layer bounds and spatial buckets; exact test on candidates.
- Erase/select tools only consider visible, unlocked dungeon layers.
- Wall annotations can be hit-tested by distance to segment (< max(radius, 0.15) cells).
- Selection feedback: outline highlight + translucent fill for hovered room/area.

## 19. Preview and guides

- Preview overlay (`Pixi.Graphics`/Mesh) renders current shape with the active layer style, plus a dashed guide line and radius/angle labels.
- Snapping guides: grid lines, object edges/centers, equal-spacing hints (P2).
- Preview never mutates the document or history.
- Preview is cancelled on Escape, tool switch, map switch, two-finger gesture start, or window blur where appropriate.

## 20. Error handling and limits

- Degenerate/invalid geometry: reject with a toast, keep the tool active.
- Boolean failure: keep the previous compiled geometry, show a non-blocking error, allow undo of the shape.
- Too many points in a freehand stroke: simplify; if still above a cap (e.g. 20k), downsample and warn.
- Too many shapes/objects: warn at 20k shapes / 5k objects; block at hard cap with guidance.
- Font/asset missing: placeholder object; text falls back to a default font.

## 21. Geometry tests

Unit tests:

- Rectangle union: adjacent rooms remove shared wall; overlap merges; separate rooms keep two boundaries.
- Subtract: cutout creates hole; later add restores; erase outside is no-op.
- Path radius/self-overlap produces a single union.
- Smooth/rough determinism from a seed.
- Bounds/wall segment extraction; dense points cleanup.
- Snapping for square and hex; angle constraints.
- Selection intersect/difference for copy/cut/paste.
- Door/stairs geometry endpoints and export segments.
- Performance smoke: 1k, 5k shapes compile within budget.
