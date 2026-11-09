# Map Studio — data model and persistence

## 1. Model goals

- Plain JSON-serializable data (no Pixi objects, no Vue proxies).
- Deterministic: reopening a document reproduces the same geometry and styles.
- Versioned and forward-compatible: unknown fields are preserved where safe; unknown node types are skipped with a warning.
- Flexible enough for `.ds` import/export and future features.
- Split large blobs (images, thumbnails, exports) into the existing file storage rather than embedding base64.

## 2. Top-level entities

### StudioProject

A library entry, comparable to a `.ds` file that may contain multiple maps.

```ts
interface StudioProject {
  id: string;
  name: string;
  description?: string;
  schemaVersion: number;          // document schema version
  createdAt: number;
  updatedAt: number;
  defaultMapId: string;
  mapOrder: string[];
  coverAssetId?: string;          // thumbnail stored in file storage or generated
  maps: StudioMap[];              // for small projects; see persistence note
  settings: ProjectSettings;
}

interface ProjectSettings {
  gridUnitLabel?: string;         // "ft", "m", custom
  cellSizeLabel?: string;         // display only, e.g. "5 ft"
  exportDefaults: ExportSettings;
  theme?: 'auto' | 'light' | 'dark';
}
```

Persistence note: project metadata and maps are stored in separate tables. The in-memory project can compose them, but saves write only changed maps. This avoids rewriting every map on each autosave.

### StudioMap

```ts
interface StudioMap {
  id: string;
  projectId: string;
  name: string;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  width: number;                  // cells; canvas/world bounds
  height: number;                 // cells
  grid: GridSettings;
  background: BackgroundLayer;
  layers: StudioLayer[];          // ordered bottom → top
  assets: StudioAssetRef[];       // references into file storage
  settings: MapSettings;
  metadata: MapMetadata;          // author notes, seed, imported source, etc.
}

interface MapSettings {
  isometric: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  snapDivision: number;           // 1..9
  lightingEnabled: boolean;
  textureOverlay?: TextureOverlaySettings;
  lineOfSightEnabled: boolean;    // fog/light interaction
  exportArea?: [number, number, number, number]; // cells; x,y,w,h
}

interface MapMetadata {
  seed?: string;
  generator?: 'manual' | 'random' | 'watabou' | 'donjon' | 'ds';
  appVersion?: string;
  notes?: string;
}

interface GridSettings {
  type: 'square' | 'hex' | 'dot' | 'none';
  variant?: string;               // e.g. 'solid' | 'dashed' | 'cross'
  color: string;
  width: number;
  radius?: number;                // dot grid
  cellDiameter: number;           // world cells per grid cell, normally 1
  offsetX: number;
  offsetY: number;
  hexOrientation?: 'pointy' | 'flat';
}
```

## 3. Layers and folders

```ts
type StudioLayer =
  | DungeonLayer
  | BackgroundLayer
  | FogLayer
  | ImagesLayer
  | FolderLayer;

interface LayerBase {
  id: string;
  type: StudioLayer['type'];
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;                // 0..1
  blendMode: BlendMode;
  parentId: string | null;        // folder nesting
  expanded?: boolean;             // folders
  order: number;                   // within parent
}

interface DungeonLayer extends LayerBase {
  type: 'dungeon';
  style: DungeonLayerStyle;
  shapes: DungeonShape[];         // ordered operations
  geometryCache?: never;          // never persisted
}

interface BackgroundLayer extends LayerBase {
  type: 'background';
  style: BackgroundStyle;
}

interface FogLayer extends LayerBase {
  type: 'fog';
  style: FogStyle;
  shapes: DungeonShape[];         // draw/erase fog geometry
}

interface ImagesLayer extends LayerBase {
  type: 'images';
  objects: StudioObject[];
}

interface FolderLayer extends LayerBase {
  type: 'folder';
  children: StudioLayer[];        // alternative to parentId; see normalization
}

type BlendMode = 'normal' | 'add' | 'multiply' | 'screen';
```

Normalization decision: persist a flat `layers[]` with `parentId` and `order`, plus a derived tree for the UI. This makes reordering/drag-drop and folder moves simple and avoids duplicated nested structures. `FolderLayer` is a flat row with null content; its children reference `parentId`.

## 4. Dungeon geometry

### Shape operations

Each dungeon layer is an ordered list of operations. This is required for draw/erase, shared walls, cutouts and intuitive “draw over later” behavior.

```ts
type ShapeOperation = 'add' | 'subtract';

interface DungeonShapeBase {
  id: string;
  operation: ShapeOperation;
  shape: ShapeSpec;
  seed?: number;                  // deterministic rough/noise
  styleOverrides?: Partial<DungeonLayerStyle>;
}

type DungeonShape =
  | RectangleShape
  | RegularPolygonShape
  | PolygonShape
  | PathShape
  | WallShape;

interface RectangleShape extends DungeonShapeBase {
  shape: {
    kind: 'rectangle';
    x: number; y: number;         // top-left, cells
    width: number; height: number;
    cornerRadius: number;
    rough: Roughness;
    smooth: boolean;              // rounded corners can be combined
  };
}

interface RegularPolygonShape extends DungeonShapeBase {
  shape: {
    kind: 'regularPolygon';
    cx: number; cy: number;
    radius: number;
    sides: number;                // 1 = circle
    drawTo: 'point' | 'edge';
    rotation: number;             // radians
    rough: Roughness;
    smooth: boolean;
  };
}

interface PolygonShape extends DungeonShapeBase {
  shape: {
    kind: 'polygon';
    points: Point[];              // cells
    closed: boolean;
    rough: Roughness;
    smooth: boolean;
  };
}

interface PathShape extends DungeonShapeBase {
  shape: {
    kind: 'path';
    points: Point[];              // centerline
    radius: number;               // half-width in cells
    closed: boolean;
    rough: Roughness;
    smooth: boolean;
  };
}

interface WallShape extends DungeonShapeBase {
  shape: {
    kind: 'wall';
    points: Point[];
    radius: number;               // stroke width in cells
    dash: boolean;
    dashSize: number;
    rough: Roughness;
    smooth: boolean;
    annotation: boolean;          // walls vs decorative lines
  };
}

type Point = [number, number];
type Roughness = 0 | 1 | 2 | 3;
```

Rules:

- **Add** unions the new shape into the layer’s accumulated geometry.
- **Subtract** differences it from the accumulated geometry.
- Operation order is chronological.
- Shapes are retained for editing; the union/difference result is derived.
- A shape’s compiled outline is deterministic from `shape + seed`.
- Later implementation may add `color`/style per shape, but layer styles are the primary model.

### Geometry compilation

```ts
interface CompiledDungeonGeometry {
  polygons: Polygon[];            // outer rings + holes
  wallSegments: Segment[];        // boundary + explicit wall shapes
  bounds: Bounds;
  revision: number;
}
```

- `polygon-clipping` produces MultiPolygon rings.
- Wall strokes use polygon boundaries plus explicit wall shapes.
- Hatching/shading/lighting consume `polygons` and `wallSegments`.
- Only `shapes` are persisted; compiled geometry is rebuilt (optionally worker) on open and after edits.

## 5. Objects

Objects live in the images layer (or groups/folders within it). Doors, stairs and text are objects, as in Dungeon Scrawl.

```ts
type StudioObject =
  | ImageObject
  | TextObject
  | DoorObject
  | StairsObject
  | LightObject
  | GroupObject;

interface ObjectBase {
  id: string;
  type: StudioObject['type'];
  name?: string;
  parentId: string | null;        // group/folder
  order: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  transform: Transform;
  shadow?: ShadowSettings;
}

interface Transform {
  x: number; y: number;           // cells
  width: number; height: number;  // cells, natural aspect
  rotation: number;               // radians
  flipX: boolean;
  flipY: boolean;
}

interface ImageObject extends ObjectBase {
  type: 'image';
  assetId: string;
  tint?: string;
  tintStrength?: number;
  shadow?: ShadowSettings;
}

interface TextObject extends ObjectBase {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;               // cells? px at 70ppc; store pt/cell units
  color: string;
  align: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  lineHeight: number;
  shadow?: ShadowSettings;
}

interface DoorObject extends ObjectBase {
  type: 'door';
  variant: 0 | 1;
  a: Point;                       // endpoints in local object space? see note
  b: Point;
  fill: string;
  stroke: string;
  rough: Roughness;
}

interface StairsObject extends ObjectBase {
  type: 'stairs';
  a: Point;
  b: Point;
  c: Point;
  stepsPerCell: number;
  stroke: string;
  rough: Roughness;
}

interface LightObject extends ObjectBase {
  type: 'light';
  preset: 'light' | 'torch' | 'lamp' | 'continualFlame' | 'lantern' | 'other';
  radius: number;                 // cells
  brightRadius: number;           // cells
  color: string;
  intensity: number;              // 0..2
  enabled: boolean;
}

interface GroupObject extends ObjectBase {
  type: 'group';
  children: string[];             // object ids
}
```

Geometry note for doors/stairs: store the authored points in map cells and derive the object transform/bounds from them. Doors/stairs are not freeform geometry objects; their handles edit the endpoints.

## 6. Styles

### DungeonLayerStyle

```ts
interface DungeonLayerStyle {
  floor: {
    visible: boolean;
    color: string;
    texture?: FloorTextureSettings;
  };
  walls: {
    visible: boolean;
    color: string;
    width: number;                // cells
    roughness: Roughness;
    blocksLight: boolean;
    dash: boolean;
  };
  grid: {
    visible: boolean;
    type: 'inherit' | 'square' | 'hex' | 'dot' | 'none';
    variant: string;
    color: string;
    width: number;
    radius?: number;
  };
  shadow: {
    visible: boolean;
    opacity: number;
    offsetX: number;
    offsetY: number;
    color: string;
    blendMode: BlendMode;
  };
  hatching: {
    visible: boolean;
    variant: string;
    size: number;
    color: string;
    width: number;
  };
  shading: {
    visible: boolean;
    size: number;
    roughness: Roughness;
    color: string;
  };
}
```

### BackgroundStyle

```ts
interface BackgroundStyle {
  color: string;
  opacity: number;
  texture?: BackgroundTextureSettings;
  grid: GridSettings;
  isometric: boolean;
}
```

### TextureSettings

```ts
interface FloorTextureSettings {
  source: 'procedural' | 'asset';
  id: string;                     // procedural id or asset id
  monochrome: boolean;
  scale: number;
  rotation: number;
  colorBlend?: string;
  opacity: number;
}

interface BackgroundTextureSettings {
  source: 'procedural' | 'asset';
  id: string;
  scale: number;
  colorBlend?: string;
  opacity: number;
}

interface TextureOverlaySettings {
  enabled: boolean;
  source: 'procedural' | 'asset';
  id: string;
  scale: number;
  opacity: number;
  attribution?: string;
}
```

### FogStyle / Shadow

```ts
interface FogStyle {
  color: string;
  opacity: number;
  blendMode: BlendMode;
}

interface ShadowSettings {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
  color: string;
  opacity: number;
  blur?: number;
  blendMode: BlendMode;
}
```

## 7. Assets and presets

```ts
interface StudioAssetRef {
  id: string;                     // StoredFile id
  name: string;
  mimeType: string;
  width: number;
  height: number;
  kind: 'image' | 'texture' | 'font';
  category?: string;
  tags?: string[];
  favorite?: boolean;
  attribution?: string;
}

interface DungeonPreset {
  id: string;
  name: string;
  category: 'dungeon' | 'world' | 'custom';
  thumbnail?: string;             // generated data URL or asset id
  style: DungeonLayerStyle | BackgroundStyle | FogStyle;
  builtIn: boolean;
}
```

Built-in presets are code constants; custom presets are persisted in project/settings storage. Custom preset thumbnails are generated by rendering a small sample through the renderer.

## 8. Persistence design

### Tables

New Dexie stores (version migration 21):

```ts
interface MapStudioProjectRecord {
  id: string;
  name: string;
  description?: string;
  updatedAt: number;
  createdAt: number;
  mapOrder: string[];
  cover?: string;                 // thumbnail data URL or asset id
  settings: ProjectSettings;
}

interface MapStudioMapRecord {
  id: string;
  projectId: string;
  updatedAt: number;
  document: StudioMap;            // JSON
  thumbnail?: string;             // small data URL / asset id
  version: number;
}

interface MapStudioSnapshotRecord {
  id: string;
  projectId: string;
  mapId: string;
  createdAt: number;
  reason: 'autosave' | 'manual' | 'crash';
  document: StudioMap;            // compressed/limited count
}

interface MapStudioSettingsRecord {
  id: 'global';
  toolSettings: Record<string, unknown>;
  customPresets: DungeonPreset[];
  recentAssets: string[];
  ui: { leftWidth: number; rightWidth: number; theme?: string };
}
```

Indexes: `projects.updatedAt`, `maps.projectId`, `snapshots.[projectId+mapId+createdAt]`. Store map documents as structured JSON; Dexie/IndexedDB handles tens of MB but we keep asset blobs out.

A dedicated `map_studio_*` prefix and schema in `src/map-studio/persistence/db.ts` keeps the feature isolated from the generic `useStore` schema validator, which is not intended for large nested documents.

### Autosave

- Debounce 800–1500 ms after a committed command.
- Also snapshot every N commands/5 minutes, keeping the last 10 snapshots.
- Write `maps` + project metadata in one transaction.
- Status: idle → saving → saved/error. Update `updatedAt`.
- On open, if a newer autosave exists than the manual save, offer recovery.
- Autosave is on by default (local equivalent of Pro), with a settings toggle.

### Thumbnails

- Render a 320×200 (or aspect-fit) PNG from the map at low resolution through `exportRender`, store as a data URL or file.
- Throttle regeneration (on save/close, not every edit).

### Migrations and normalization

- `schemaVersion` stored per project/map. A `normalizeStudioProject` function upgrades older versions and fills defaults.
- Unknown node types are retained in a `_unknown` array? Safer: skip them and record a warning, but do not silently delete on next save unless the user confirms. Plan: preserve unknown objects in `extensions` per document to avoid data loss.
- Corrupt records: raw copy to `map_studio_recovery` table and open a new empty map with a warning.

## 9. Document serialization

### Native format

- `.dmhstudio` (or `.json`) for a project bundle: ZIP containing `project.json`, `maps/*.json`, `assets/*` (optional), `manifest.json`.
- Also support a plain JSON project export for debugging.
- Images can be embedded in the ZIP when exporting; for local storage they stay in StoredFile.

### `.ds` mapping

`.ds` is a ZIP with a JSON document. From the known importer structure:

```json
{
  "data": { "geometry": { "<geometryId>": { "polylines": [], "polygons": [] } } },
  "state": {
    "document": {
      "nodes": {
        "document": { "children": ["..."], "grid": { "cellDiameter": 70 } },
        "<node>": {
          "type": "LIGHT" | "RECTANGLE" | ...,
          "name": "Door geometry",
          "geometryId": "...",
          "transform": [ ... ],
          "alpha": 1,
          "visible": true,
          "config": { ... }
        }
      }
    }
  }
}
```

Our importer/exporter maps:

| Ours | `.ds` |
| --- | --- |
| `DungeonShape` add/subtract | Compiled `geometry.polygons`/`polylines` per dungeon layer; source editability is lost on import unless we map shapes heuristically. |
| `DoorObject` | Node with `name: "Door geometry"` / door subtype; export as polyline/polygon geometry. |
| `StairsObject` | Node `name: "Stairs geometry"`; geometry omitted from walls. |
| `LightObject` | Node `type: "LIGHT"` with `config`, `variant`, `alpha`, `visible`, `transform`. |
| `ImageObject` | Image node + embedded asset reference; `.ds` importer resolves images. |
| `TextObject` | Text node. |
| Layers | Node tree/folders; map to flat layers with parentId. |
| Grid | `state.document.nodes.document.grid.cellDiameter` and background node. |

Compatibility policy:

- Import: best-effort with a validation report (“imported X rooms, Y doors, Z lights; N unsupported nodes”).
- Export: include walls/doors/lights and an image preview; do not promise exact Dungeon Scrawl round-trip for styles.
- Never let `.ds` import corrupt an existing project; create a new project or new maps.

### UVTT

UVTT is a ZIP containing `data` JSON with `resolution` (pixels per grid cell), `image` (base64 PNG path), `walls`, `doors`, `lights`, `portals`. Export our compiled wall segments, door endpoints and light objects; include the rendered PNG. Import is a possible later addition.

## 10. Data validation

Use explicit normalization rather than Ajv schemas for the large nested document (Ajv is fine for small DTOs). Requirements:

- Clamp numeric values, reject NaN/Infinity.
- Ensure ids are unique; regenerate duplicates.
- Ensure every layer/object parent exists; otherwise move to root.
- Ensure active layer exists; fallback to first dungeon layer.
- Ensure style defaults are complete.
- Validate asset references; missing assets become placeholders and are reported.
- Limit max layers/objects/shapes (e.g. 500 layers, 20k objects, 50k shapes) with a clear error rather than freezing.

## 11. Backup/restore integration

- Add the three `map_studio_*` tables to `MAIN_STORE_NAMES`/backup manifests if the project’s backup system enumerates stores manually; otherwise verify via the existing backup tests that new tables are included.
- Assets use the existing StoredFile backup/relink pipeline; studio assets become unreferenced if their document is deleted. Add a cleanup function that scans studio documents before deleting files.
- Large projects may exceed practical backup size; show estimated size and offer “include studio assets” toggle consistent with existing file backup behavior.

## 12. Document size limits

Practical targets:

- Prefer < 5 MB JSON per map, < 50 MB assets per project.
- Reject > 100 MB asset uploads by default (configurable).
- Warn at > 20k shapes or > 5k objects; recommend splitting maps.
- Thumbnails and export images are stored separately, not in the document.

## 13. Factory defaults

New map defaults:

- 50×50 cells (Roll20-compatible small map) or 40×30 for empty canvas; choose 30×30 to keep first render fast. The plan recommends **30×30 cells, 70 px/cell display**, adjustable.
- Grid: square, 1 cell, color `#00000022`, width 1.
- Background: white/off-white `#f7f3e8`, dot grid off.
- One dungeon layer with the “Classic Hatching” preset; background layer below.
- One empty images layer/folder above dungeon.
- Rectangle tool selected; snap on; division 1.
- Autosave on.
