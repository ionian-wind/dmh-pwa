# Maps

Maps provide a campaign map image with reusable locations and interactive markers.

## Concepts

### Map

A `MapEntity` is a persisted record:

```ts
interface MapEntity extends WithMetadata {
  title: string;
  description?: string;
  fileId: string;
  locations: MapLocation[];
  markers: MapMarker[];
}
```

- `fileId` references a `MapFile` in the `map_files` store.
- `locations` are reusable places on the map. Entities can be bound to a
  location once and referenced by any number of markers.
- `markers` are placed at image-pixel coordinates `(x, y)`.

Legacy records with `points` are normalized on read: points with `x`/`y` become
markers, and missing arrays are filled with empty arrays.

### Map file

A `MapFile` stores the base image outside the map record:

```ts
interface MapFile extends WithMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  source:
    | { kind: 'blob'; blob: Blob }
    | { kind: 'handle'; handle: FileSystemFileHandle };
  imageMetadata?: ImageMetadata;
}
```

`MapEditor` uses a regular `<input type="file" accept="image/*">`, so image
selection works in every browser. Files are stored as `Blob` sources. The
existing handle helper remains available for Chromium file-picker integrations.

Image metadata (dimensions, MIME type, dominant color, palette) is extracted by
`maps/worker/image.worker.ts` and stored on the file record.

### Locations

```ts
interface MapLocation {
  id: string;
  name: string;
  description?: string;
  color?: string;
  entities: MapEntityRef[];
}
```

Locations are managed from the map editor. Each location can link to notes,
modules, parties, monsters, encounters, characters, and other maps.

### Markers

```ts
interface MapMarker {
  id: string;
  title: string;
  description?: string;
  x: number;
  y: number;
  locationId?: string | null;
  entities: MapEntityRef[];
  icon: string; // RPG Awesome class, e.g. "ra-castle-emblem"
  color: string; // CSS color for the marker icon
}
```

- Placing a marker: choose **Add marker**, then click the map. The marker editor
  opens with the clicked image coordinates.
- A marker can link to one location and any number of other entities, including
  other maps.
- Icons are optional; new markers start with no icon.
- Icons come from [RPG Awesome](https://nagoshiashumari.github.io/Rpg-Awesome/).
  The stored value is the class without the `ra` prefix (`ra-castle-emblem`); rendering
  uses `class="ra ra-castle-emblem"`.
- The icon color is stored per marker and rendered inline.

### Areas

```ts
interface MapArea {
  id: string;
  title: string;
  description?: string;
  shape: 'polygon' | 'circle' | 'square' | 'freehand';
  points: [number, number][]; // polygon/freehand/square vertices
  center?: [number, number]; // circle
  radius?: number; // circle
  entities: MapEntityRef[];
  linkedAreaIds: string[]; // other areas on the same map
  icon?: string;
  color: string;
}
```

- Areas are drawn directly on the map:
  - polygon: click vertices, double-click to finish;
  - circle: drag from center to edge;
  - square: drag a bounding box;
  - freehand: drag a closed freehand shape.
- Areas render as semi-transparent fills with a stronger stroke on hover.
- Clicking an area opens the area editor.
- Each area supports title, description, optional RPG Awesome icon, color,
  linked entities, and links to other areas.
- The area list is shown in the right sidebar **Areas** tab and supports
  editing and deleting directly from the list.

## Map actions and context menu

Map actions are OpenLayers plugins rather than page-level buttons:

- `src/maps/plugins/MapActionsControl.ts` is a custom
  `ol/control/Control`. It renders the pencil button below the zoom controls
  and opens the marker/draw action menu.
- The right-click menu uses `ol-contextmenu` through the
  `vue3-openlayers` `ol-context-menu-control` component.

Both surfaces emit a custom `map-action` OpenLayers event instead of opening
editors directly:

```ts
type MapAction = 'add-marker' | 'draw-area' | 'cancel-drawing';

interface MapActionDetail {
  action: MapAction;
  coordinate?: [number, number];
  shape?: MapAreaShape;
}
```

`MapView` listens for `map-action` with `onMapAction(map, handler)` and opens
the existing marker or area editor. The right-click **Add marker here** action
carries the clicked map coordinate, so the marker editor opens at the
right-clicked point. Draw actions from the context menu use an
`ol-contextmenu` submenu for the area shape.

## Detail layout

The map detail page uses two levels of tabs:

- Top tabs: **Map** and **Locations**. The map stays mounted while the
  Locations tab is open. Selecting a location centres the map and returns to
  the Map tab.
- Right sidebar tabs: **Markers** and **Areas**. Each row has edit and delete
  actions, so markers and areas can be managed without opening them on the
  map first.

## User flows

### Create/edit a map

1. Open **Maps** in the left navigation.
2. Create a map or edit an existing one.
3. Choose a title and a base image.
4. Optionally add locations and bind entities to them.
5. Save. The image file is written to `map_files` only when the map is saved.
   Replacing an image deletes the previous `map_files` record.

### Place and edit markers

1. Open a map.
2. Click the pencil action button and choose **Add marker**, then click the map.
   Alternatively, right-click the map and choose **Add marker here** to place a
   marker at the clicked point.
3. Fill in title, description, location, linked entities, icon, and color.
4. Save. Marker coordinates are stored in the map projection used by the image.
5. Click an existing marker to edit or delete it.

### Draw and edit areas

1. Choose **Polygon**, **Circle**, **Square**, or **Freehand** in the map toolbar.
2. Draw the shape:
   - polygon: click vertices and double-click the last vertex;
   - circle: drag from the centre;
   - square: drag a bounding box;
   - freehand: drag a closed path.
3. Fill in the area title, description, icon, colour, linked entities and any
   linked areas.
4. Save. Click an area or its label to edit it again.
5. The right drawer lists areas alongside locations.

### Browse locations

The top **Locations** tab lists all locations, their descriptions, linked
entities, and the number of markers assigned to each location. Selecting a
location centres the map on its markers and switches back to the Map tab.

## Stores and files

- `maps` — `MapEntity` records (`src/maps/maps.ts`).
- `map_files` — base images and extracted metadata.
- Migration `0000000004_maps.ts` creates both object stores.

Map file helpers:

- `createMapFileFromFile(file)`
- `createMapFileFromHandle(handle)`
- `getMapFileBlob(mapFile)`
- `getMapFileUrl(mapFile)`
- `updateMapFileMetadata(mapFile)`
- `revokeMapFileUrl(url)`

## Entity references

`MapEntityRef` supports:

```ts
type MapEntityKind =
  | 'note'
  | 'module'
  | 'party'
  | 'monster'
  | 'encounter'
  | 'character'
  | 'map';
```

`EntityLinksEditor` loads each entity store, shows selectable entities, and
deduplicates `kind:id` pairs. `EntityLinkList` resolves display labels for
read-only lists.

## Icons

`src/maps/icons.ts` exposes `MAP_MARKER_ICONS`, generated from the RPG Awesome
CSS class list, plus `DEFAULT_MARKER_ICON` (empty by default, meaning no icon) and `DEFAULT_MARKER_COLOR`.

`MapIconPicker` provides searchable icon selection plus a “No icon” option. The
stylesheet is imported once from `src/main.ts`.

## Coordinate model

The OpenLayers view uses an image projection with `units: 'pixels'` and extent
`[0, 0, width, height]`. Therefore marker `x`/`y` values are the same as image
pixels. Overlays are positioned with `:position="[marker.x, marker.y]"`.

## Testing

- Pure helpers: `normalize`, marker upsert/remove/centroid, entity label lookup.
- File helpers: file/blob creation, metadata fallback, URL lifecycle.
- Schema: locations/markers/entity refs validate.
- Components: map editor, marker editor, icon picker, entity links editor,
  locations panel.
- Integration: map store file helpers, map view marker placement/editing.
