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
  division: number; // 1..9; snap step = 1 / division
  angleSnap: boolean; // Shift
  gridType: 'square' | 'hex' | 'none';
  cellSize: number; // normally 1
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

| Kind            | Sampling                                                                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rectangle       | 4 corners; optional rounded corners via arcs sampled at `max(4, ceil(radius * 32))` points per corner.                                                                        |
| Regular polygon | `sides === 1` → circle sampled adaptively; else vertices at radius and rotation; `drawTo: 'point'` places a vertex at the drag angle, `'edge'` places an edge midpoint at it. |
| Polygon         | input points, optionally closed.                                                                                                                                              |
| Path            | input centerline, optionally closed; expanded by radius.                                                                                                                      |
| Wall            | input centerline; expanded by radius for fill? Walls are strokes, not fills; dashed segments generated at render/export.                                                      |
| Door            | rectangle/segment from two points plus variant decoration.                                                                                                                    |
| Stairs          | parallel step lines between `a-b` and `c` direction.                                                                                                                          |

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
      layer.shapes.filter(isWall).flatMap(wallSegments),
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
4. If `cornerRadius > 0`, corners are rounded; the drag preview uses the same rounded outline.
5. Rough mode: after pointer up, moving the pointer away from the release point raises the rough level (1–3); the preview updates, and a second click commits. Escape cancels. The rounded rectangle trick works: an 8×8 square with corner radius 4 becomes a circle.
6. Erase mode sets `operation: 'subtract'`.

Adjacent rooms: separate adds union; touching edges merge, shared wall disappears. Overlap also merges. Walls drawn after can be erased by drawing over in erase mode.

## 8. Circle / regular polygon tool

1. Pointer down sets the center, snapped with the current division.
2. Drag sets the radius to the snapped pointer; a live label shows the radius in grid cells.
3. `sides` controls vertices: `1` renders a circle sampled from 64 segments, `3+` renders a regular polygon, and `2` is treated as a circle.
4. `drawTo: 'point'` places a vertex at the top; `'edge'` places a flat edge at the top. This gives vertical or horizontal hex-room orientation.
5. `sides` can be changed from the toolbar slider/input, `[`/`]`, or a digit key while the circle tool is active.
6. Shift+R toggles rough mode; after drawing, pointer distance sets the rough level and a second click commits.
7. Snap applies to the center and radius endpoints.
8. Erase mode subtracts.
9. The preview uses the real polygon/circle ring and the committed shape stores `sides` and `drawTo` for later editing.

## 9. Path tool

- Snap on: click to place points; double-click/Enter to finish; `Z` removes last point; Escape cancels.
- Snap off: click points or press-drag freehand; pointer samples every ~3–5 px screen distance (simplified later).
- `radius` controls stroke half-width; `[`/`]` adjust by one division step; typed value.
- Smooth mode overrides snap; points are interpolated with Catmull-Rom before the radius expansion.
- Path can cross itself; union handles overlaps.
- Erase mode subtracts the expanded stroke.
- Rough mode: after drawing, pointer distance sets the rough level and a second click commits.
- Preview shows the centreline while points are placed.

## 10. Polygon tool

- Click points; double-click/Enter closes and commits; clicking the first point also closes; `Z` removes the last point.
- Snap off allows freehand drag; pointer positions are sampled and committed as one polygon fill.
- Smooth mode uses a closed Catmull-Rom curve through the placed points.
- Erase mode subtracts.
- Rough mode: after drawing, pointer distance sets the rough level and a second click commits.

## 11. Wall tool

- Click points; double-click/Enter finishes. With Snap off, click-drag draws an unsnapped freehand wall.
- Wall is a stroke annotation, not room fill:
  - Render as styled line segments with width, colour, dash, smooth and rough.
  - Can be drawn inside or outside rooms.
- Settings: width, smooth, post-draw rough, dash and dash size. Dash is applied continuously across the path rather than restarting per segment.
- Erase a wall by drawing over it with Rectangle/Path/Polygon in draw or erase mode depending on its location; the Wall tool itself is for adding/annotating walls.

## 12. Select tool (geometry)

Purpose: select/copy/cut/paste areas of dungeon geometry across layers/regions.

Flow:

1. Select tool (`B+8`) draws a selection polygon/freehand region like the polygon tool.
2. On finish, the region is highlighted and a mini menu appears above it: Copy, Cut, Delete.
3. Copy stores the intersection of each visible dungeon layer’s compiled geometry as clipboard polygons.
4. Cut/Delete append a subtractive polygon for the selected region to each dungeon layer, removing the selected area and recalculating shared walls.
5. `Ctrl/Cmd+V` enters paste preview: drag to move, corner handles to resize, rotate handle to rotate, right-click for Flip horizontal/vertical, Enter to confirm, Escape to cancel.
6. Paste commits into the active dungeon layer; erase mode makes the pasted shapes subtractive.
7. The Clipboard sidebar panel saves named geometry clips with thumbnails, and clicking a clip starts a paste preview.
8. Select and Object tools are separate: geometry vs objects.

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

- Click to place a text object; an inline HTML input overlay opens immediately over the canvas.
- Type text; Enter or blur commits, Escape cancels. Empty new text is removed.
- Text objects live in the Images layer.
- Tool settings: font family, font size, colour, left/centre/right alignment, and drop shadow with colour, X/Y offset and opacity.
- Snap/Division align the placement point.
- Object tool: first click selects; double-clicking the text enters inline edit mode; dragging still moves it.
- Object settings mirror the text style and shadow controls.
- The committed text is rendered by Pixi with alignment and shadow; the overlay is single-line in the current implementation.

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

- Click hit-tests objects in visible image layers; Shift+click adds an object. A selected object is not toggled off from a multi-selection, matching Dungeon Scrawl.
- Drag on empty canvas draws a marquee; a selected group expands to all of its members.
- Handles: four corner resize handles plus a rotate handle; touch handles are larger.
- Multi-selection has one combined bounding box; mixed types are allowed.
- Double-click text enters inline edit.
- Clicking outside clears the selection; clicking a grouped member selects the whole group.

Transform:

- Move: drag or arrow keys (`0.1` cell, Shift for `1` cell).
- Resize: drag a corner handle; multi-select scales all objects from the group bounds.
- Rotate: drag the rotate handle; multi-select rotates around the group centre.
- Group / ungroup: `G` or the group button in the batch panel; implemented with a shared `groupId` rather than a nested group object.
- Flip: horizontal/vertical around each object/selection centre.
- Z-order: `[` sends the selection to the back, `]` brings it to the front; batch panel also has order actions.
- Delete, duplicate, copy (`Ctrl/Cmd+C`) and paste (`Ctrl/Cmd+V`).
- Context menu: duplicate, bring to front, send to back, flip horizontal/vertical, delete.

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
