# Map Studio — random dungeon generator and imports

## 1. Goals

- Generate a complete, editable dungeon layout in seconds.
- Match Dungeon Scrawl’s exposed settings and feel: size, room count/size, corridor length/width, layout, door density, room shapes, roughness.
- Deterministic via a seed so a layout can be reproduced/shared.
- Output normal studio geometry, doors and text (if desired), not a special read-only object.
- Import Watabou One Page Dungeon JSON and donjon maps.

## 2. Generation pipeline

```
seed
  → parameter normalization
  → room placement
  → corridor graph
  → corridor carving
  → room shape refinement
  → door placement
  → optional roughness
  → optional entrance/exit markers / text
  → convert to StudioMap layers/shapes
  → validate/normalize
```

Generation runs as a pure function returning a `GeneratedDungeon` data object, then a command replaces the current map content (or creates a new map). Keep generator independent of Pixi.

## 3. Settings

```ts
interface RandomDungeonSettings {
  seed: string;
  size: 'small' | 'medium' | 'large';
  roomCount: 'few' | 'some' | 'many' | 'lots';
  roomSize: 'cramped' | 'standard' | 'spacious';
  corridorLength: 'compact' | 'balanced' | 'sprawling';
  corridorWidth: 'narrow' | 'wide';
  layout: 'straight' | 'forking' | 'balanced' | 'winding';
  doorDensity: 'none' | 'few' | 'some' | 'many';
  roomShapes: Array<'square' | 'irregular' | 'rounded'>;
  roughness: 'none' | 'light' | 'medium' | 'heavy';
}
```

Derived parameters:

| Setting | Mapping |
| --- | --- |
| Size | small 24×24 cells; medium 40×40; large 64×48 (tunable). Ensure “small” fits a 50×50 Roll20 page. |
| Room count | few 6–9; some 10–16; many 17–26; lots 27–40, scaled by size. |
| Room size | cramped 3–5 cells; standard 4–8; spacious 7–12. Clamp to map. |
| Corridor length | compact 0–2 cells; balanced 2–5; sprawling 5–10 between rooms. |
| Corridor width | narrow 1 cell; wide 2 cells. |
| Layout | controls graph topology: straight chain; forking tree with branches; balanced mix; winding long path with detours. |
| Door density | probability per room connection: 0, 0.35, 0.7, 0.95. |
| Room shapes | weighted selection; multi-select creates varied rooms. |
| Roughness | maps to rough level 0–3 on room/corridor outlines, plus slight wall irregularity. |

Seed: string; if empty, generate a random slug and display it. Use a deterministic PRNG (e.g. splitmix32/xorshift) seeded from a hash of the seed string.

## 4. Room placement algorithm

Recommended first implementation: **graph-based room-and-corridor** rather than pure BSP, for more natural layouts.

1. Create a grid occupancy mask (or rect packer).
2. Place rooms:
   - Use a randomized placement with rejection: random center, random size range, reject overlaps + margin based on corridor length.
   - For `straight`, bias room centers along a dominant axis.
   - For `forking`, create a main trunk and branches.
   - For `winding`, use a random walk/spiral path of room anchors.
3. Connect rooms:
   - Build a graph: minimum spanning tree plus extra edges according to layout (forking adds branches; balanced mixes; winding adds detours/loops).
   - Straight: mostly a chain; may branch lightly.
   - Forking: tree with 2–4 explicit branches.
   - Balanced: MST + a few loops.
   - Winding: long paths, extra loops, avoid straight corridors.
4. Carve corridors:
   - L-shaped, Z-shaped or multi-bend paths depending on layout; corridor width.
   - Use corridors as path bands unioned into the floor geometry.
   - Add doors where a corridor meets a room or at chosen graph edges.
5. Validate connectivity: flood fill from the first room; reconnect unreachable rooms or discard.

Room shapes:

- **Square**: rectangle with optional small jitter (if roughness > 0).
- **Irregular**: polygon with 5–8 vertices, jittered corners/edges; ensure no self-intersection.
- **Rounded**: rectangle with corner radius (min(width,height)/4–1/2).
- Multi-select: pick per room; ensure variety but avoid pathological shapes.

Doors:

- Compute intersections between room boundaries and corridors or between rooms and corridors.
- A door object is placed at the intersection, with width = corridor width or room edge segment; door orientation from segment.
- Door density discards some connections but must keep rooms reachable; never remove all doors on a required path. If all connections are discarded, rooms still connect via open gaps or keep one door.

Roughness:

- Apply `Roughness` to generated shape parameters; for corridors/paths, set path rough level; for rooms, set shape rough.
- Keep doors aligned to a straight edge; do not roughen door segments.

## 5. Output construction

```ts
interface GeneratedDungeon {
  seed: string;
  settings: RandomDungeonSettings;
  width: number;
  height: number;
  rooms: GeneratedRoom[];
  corridors: GeneratedCorridor[];
  doors: GeneratedDoor[];
  layers: { style: DungeonLayerStyle; shapes: DungeonShape[] }[];
  metadata: { entrance?: Point; notes?: string[] };
}
```

- Default style: selected preset (Classic Hatching unless the user chose another).
- Floor geometry: room shapes + corridor paths as `add` operations.
- Doors: normal `DoorObject`s in the images layer.
- Optional stairs: add one or more stairs in larger dungeons; labels for entrance/exit.
- Return an editable map; the generator does not create a special node type.
- Keep room/corridor ids stable for regeneration? Regenerating replaces the map; no need to preserve ids. Optionally “regenerate style only” later.

## 6. Replacing the map

- Confirm modal: “Generate a new dungeon? This replaces the current map. Undo won’t restore it after you leave the map.” Because the replacement is large, offer “Generate in a new map” as the default if the current map has content. The reference replaces the current map, but our safer default is a new map unless the user chooses replace.
- If replace is chosen, push a compressed snapshot to history so Ctrl+Z can restore the previous map within the session.
- Save the generated seed and settings in map metadata for reproducibility.

## 7. External imports

### Watabou One Page Dungeon

Input JSON contains rooms (polygons), corridors, doors, notes, and a seed/title.

Conversion:

- Rooms → polygon/rounded shapes with one dungeon layer.
- Corridors → path shapes or polygons.
- Doors → door objects at segment midpoints.
- Notes → text objects (toggle “import notes”).
- Water/terrain rooms → separate dungeon layers styled with world-building presets if enough data; otherwise one layer with floor color overrides.
- Report skipped features (e.g. custom decorations).

### donjon 5e random dungeon

Input format (saved map) includes cells/rooms/doors. Conversion:

- Detect room rectangles/polygons and corridors; convert to shapes.
- Doors to door objects using orientation.
- Known limitations from the reference: polymorph rooms and some corridors may not import; report and skip.
- Import as a new map.

### Dungeon Scrawl `.ds`

Handled in `07-persistence-library-export.md`; random imports can reuse the same document conversion utilities.

## 8. UI

Panel fields:

- Seed (text + randomize button + copy).
- Size segmented control.
- Room count/size/corridor length selects.
- Corridor width toggle.
- Layout select.
- Door density select.
- Room shapes multi-select chips.
- Roughness slider (None/Light/Medium/Heavy).
- Preview stats: estimated rooms, map size, door count.
- Generate button; options “Replace current map” / “Generate in new map” (default depends on content).
- Import sections with drag/drop and file picker.
- Progress indicator for large generation; cancel if generation is chunked in a worker.

## 9. Testing

- Determinism: same seed + settings → identical document hash.
- Connectivity: generated maps are connected; every room reachable.
- Bounds: rooms/corridors stay within map; no overlaps beyond allowed merging.
- Door density: required connectivity preserved.
- Room shape validity: no self-intersecting irregular polygons.
- Roughness: valid geometry for levels 1–3.
- Performance: large dungeon generation < 500 ms target (worker if needed).
- Import fixtures for Watabou and donjon; counts + skipped report.
- Snapshot tests for a few seeds (render thumbnails or geometry summaries).

## 10. Future enhancements (not parity blockers)

- Themed room decoration, terrain layers, cave/cellular generation.
- Regenerate while preserving style/seed.
- Multi-floor dungeons with stairs linking maps.
- Export generated map directly to `.ds`/UVTT.
