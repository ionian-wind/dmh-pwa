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
  entities: MapEntityRef[];
  locationId?: string | null;
  layers: MapLayer[];
  markers: MapMarker[];
  areas: MapArea[];
}
```

- `fileId` references a `MapFile` in the `map_files` store.
- `entities` links the map itself to modules and other entities. The map editor
  exposes module linking alongside location linking.
- `locationId` optionally links the map to one global `MapLocation` record.
- `layers` organize markers and areas. The base layer always exists.
- `markers` are placed at image-pixel coordinates `(x, y)`.
- `areas` are drawn shapes stored with the map.

Legacy records with `points` are normalized on read: points with `x`/`y` become
markers, and missing arrays are filled with empty arrays. Legacy embedded
`locations` are migrated into `map_locations`; a location can be linked to at
most one map.

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
interface MapLocation extends WithMetadata {
  name: string;
  description?: string;
  entities: MapEntityRef[];
}
```

Locations are global entities stored in `map_locations`, independent of any
single map. Maps link to them through `locationId`, and markers and areas
reference one through `locationId`.

Each location has its own detail page with tabs for linked notes, modules,
parties, monsters, encounters, and characters. The right drawer lists the maps
that link to that location.

### Layers

```ts
interface MapLayer {
  id: string;
  title: string;
}
```

Every map has a permanent base layer (`base`) plus any number of user-defined
layers. Markers and areas store a `layerId`. Users can add, rename, and delete
layers; deleting a layer moves its children to the base layer.

Each logical layer is backed by its own OpenLayers vector layer for both area
geometry and marker points. Layer visibility uses the native
`layer.setVisible(...)` behavior. Marker icons are rendered as canvas text using
the RPGAwesome font, with their titles as text labels. A visually hidden list of
marker buttons preserves keyboard/screen-reader access.

Marker and area layers are created only after the base map image finishes
loading. A spinner is shown over the map while the image loads.

The map page starts in **View mode**. In view mode layer visibility can be
temporarily toggled with the eye buttons, and hidden layers remove their
markers/areas from the map. **Edit mode** enables the map action menu, item
editing, drawing, and layer management.

### Markers

```ts
interface MapMarker {
  id: string;
  title: string;
  description?: string;
  x: number;
  y: number;
  locationId?: string | null;
  layerId: string;
  entities: MapEntityRef[];
  icon: string; // RPG Awesome class, e.g. "ra-castle-emblem"
  color: string; // CSS color for the marker icon
  backgroundColor?: string; // optional badge colour, empty for transparent
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
- Markers can also have an optional background badge colour behind the icon.
  It is transparent by default and can be cleared from the marker editor.

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
  locationId?: string | null; // optional single global location
  layerId: string;
  entities: MapEntityRef[];
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
- Each area supports title, description, optional RPG Awesome icon, colour,
  one optional location, and any number of linked entities. Areas are not
  linked to other areas or to markers.
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

## Maps section

Module detail pages now expose **Maps** and **Locations** tabs that list the
maps/locations whose `entities` include the current module.

The Maps section has two top-level tabs:

- **Maps** — card list of map entities.
- **Locations** — card list of global location entities, with add, view, edit,
  and delete actions.

Location cards show their linked map, if any, and provide a button to open it.
Deleting a location also removes it from its map and clears marker/area
references.

## Map detail layout

The map detail page no longer has top tabs. It contains:

- The map itself.
- Right sidebar tabs: **Markers** and **Areas**, grouped by layer.
  - Layers show their title with visibility controls.
  - Rows use a coloured left edge like jukebox tracks.
  - Areas do not show their shape type in the list.
  - In edit mode rows have edit/delete actions and each layer has
    rename/delete controls. The base layer cannot be deleted.
  - Hovering a row highlights the marker or area on the map.
- **Add layer** is a menu-style row below the tabbed lists, shown only in edit
  mode.
- A **Show labels** toggle (on by default) hides marker labels and area label
  overlays when turned off, keeping marker icons and area fills visible.
- The **View mode / Edit mode** control is an icon-only button group fixed at the
  bottom of the sidebar.
- In view mode the map action menu, context menu, header edit/delete actions,
  row edit/delete actions, and popup edit action are hidden.

Clicking a marker or area opens an information popup instead of the editor. The
popup shows the title, description, marker location, and linked entities, with
an Edit action in edit mode and a Go to location action when linked.

## Location detail layout

A location detail page follows the module detail pattern:

- If the location is linked to a map, a **Map** tab is shown with that map card.
- Top tabs for each linkable entity kind: notes, modules, parties, monsters,
  encounters, characters, and jukebox playlists.
- Each tab uses the reusable `EntitiesLinking` component: the entity-type title
  and add button sit above a linked list with remove actions. Both the linked
  list and the searchable modal use virtual-scroll lists. The component's
  `multiple` prop (default `true`) switches between checkbox multi-select and
  radio single-select. The modal's search row has a create (+) button that opens
  the editor for that entity type; after saving, the new entity is selected and
  marked “Created” in the option list. Linked rows highlight on hover, and their
  unlink action appears on hover or keyboard focus.
- The right drawer has the same **Markers** and **Areas** tabs as the map view.
  It lists markers and areas linked to this location from all maps, grouped by
  map title with separators between groups.
- The header edit action opens the global location editor; delete removes the
  location everywhere.

## User flows

### Create/edit a map

1. Open **Maps** in the left navigation.
2. Create a map or edit an existing one.
3. Choose a title and a base image.
4. Optionally link one global location to the map.
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
3. Fill in the area title, description, icon, colour, one optional location,
   and linked entities.
4. Save. Click an area or its label to edit it again.
5. The right sidebar **Areas** tab lists areas for editing and deletion.

### Browse locations

Locations are global entities. Open the **Locations** tab on the Maps page to
see location cards with add/edit/delete actions and a shortcut to the linked
map. Select a location card to open its detail page, where you can manage links
to other entities and see markers/areas from all maps.

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
  | 'map'
  | 'location'
  | 'playlist';
```

`EntitiesLinking` loads each entity store, shows one linking block per entity
type, and deduplicates `kind:id` pairs. `EntityLinkList` resolves display labels
for read-only lists. Map, marker, area, and location editors use `BaseModal`
header tabs to separate their own fields from linked entities.

## Icons

`src/maps/icons.ts` exposes `MAP_MARKER_ICONS`, generated from the RPG Awesome
CSS class list, plus `DEFAULT_MARKER_ICON` (empty by default, meaning no icon) and `DEFAULT_MARKER_COLOR`.

`src/components/common/IconPicker.vue` provides searchable icon selection plus
a “No icon” option. It is configurable with an icon array and collection name;
selected values are stored as `collection:icon`, for example
`ra:ra-castle-emblem`. The stylesheet is imported once from `src/main.ts`.

Colours use the shared `ColorPicker` component, backed by Quasar `QColor`.

## Coordinate model

The OpenLayers view uses an image projection with `units: 'pixels'` and extent
`[0, 0, width, height]`. Therefore marker `x`/`y` values are the same as image
pixels. Overlays are positioned with `:position="[marker.x, marker.y]"`.

## Testing

- Pure helpers: `normalize`, marker upsert/remove/centroid, entity label lookup.
- File helpers: file/blob creation, metadata fallback, URL lifecycle.
- Schema: locations/markers/entity refs validate, including migration of
  embedded locations into the global `map_locations` store.
- Components: map editor, marker editor, location editor, icon picker, entity
  links editor, location cards, marker/area sidebar panels.
- Integration: map store file helpers, map view marker placement/editing.
