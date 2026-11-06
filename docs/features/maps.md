# Maps

Maps provide a campaign map image with reusable locations and interactive markers.

## Concepts

### Location map

Map data is embedded in each location record; there is no separate persisted map
entity.

```ts
interface LocationMap {
  fileId: string;
  layers: MapLayer[];
  markers: MapMarker[];
  areas: MapArea[];
}

interface MapLocation extends WithMetadata {
  name: string;
  description?: string;
  entities: MapEntityRef[];
  map: LocationMap;
}
```

- `map.fileId` references a `MapFile` in the `map_files` store.
- `entities` links the location to modules and other entities.
- `map.layers` organize markers and areas. The base layer always exists.
- `map.markers` are placed at image-pixel coordinates `(x, y)`.
- `map.areas` are drawn shapes stored with the location.
- Markers and areas keep an optional `locationId`, so they can point back to a
  location. New markers and areas default to the location that owns the map.

Legacy maps are merged into their linked location (or a new location when no
location was linked) by migration `0000000009_merge_maps_into_locations`.

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

`MapLocationEditor` uses a regular `<input type="file" accept="image/*">`, so
image selection works in every browser. Files are stored as `Blob` sources. The
existing handle helper remains available for Chromium file-picker integrations.

Image metadata (dimensions, MIME type, dominant color, palette) is extracted by
`maps/worker/image.worker.ts` and stored on the file record.

### Locations

Locations are stored in `map_locations` and own their map data. The location
detail page has **View**, **Map**, **Backlinks** and **Linked entities** tabs.
View uses the shared inline view/edit experience and renders the description as
Markdown; Map renders the location's image, layers, markers and areas;
Backlinks lists markers and areas from other locations that point at this
location; Linked entities shows notes, modules, parties, monsters, encounters,
characters and playlists. In edit mode the linked entities are editable, and
the same location-level edit mode is shared with the Map tab.

### Layers

```ts
interface MapLayer {
  id: string;
  title: string;
}
```

Every map has a permanent base layer (`base`) plus any number of user-defined
layers. Markers and areas store a `layerId`. Users can add, rename, and delete
non-base layers; the base layer is fixed. Deleting a layer moves its children to
the base layer.

Each logical layer is backed by its own OpenLayers vector layer for both area
geometry and marker points. Layer visibility uses the native
`layer.setVisible(...)` behavior. Markers use generated SVG pin images rendered
through the OpenLayers `Icon` style, with their titles as text labels. A visually
hidden list of marker buttons preserves keyboard/screen-reader access.

Marker and area layers are created only after the base map image finishes
loading. A spinner is shown over the map while the image loads.

The map tab starts in **View mode**. In view mode layer visibility can be
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
  icon: string; // `ra-*` or `fa-solid:*` icon
  color: string; // marker/icon CSS color
  backgroundColor?: string; // optional pin fill colour
}
```

- Placing a marker: choose **Add marker**, then click the map. The marker editor
  opens with the clicked image coordinates.
- A marker can link to one location and any number of other entities (notes,
  modules, monsters, encounters, characters). Parties are not available as
  marker links.
- Icons are optional; new markers start with no icon.
- Marker icons support both RPG Awesome (`ra-castle-emblem`) and Font Awesome
  Solid (`fa-solid:cloud-rain`) values.
- `src/maps/mapMarkerSvg.ts` generates a scalable pin SVG at runtime. RPG
  Awesome glyph paths are generated into `src/maps/rpgIconPaths.ts`; Font
  Awesome paths come from `@fortawesome/fontawesome-svg-core`.
- Pin fill and icon colour are configurable per marker. When a marker
  background colour is set it becomes the pin fill; otherwise the marker colour
  fills the pin and a contrasting icon colour is used.
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
  one optional location, and linked entities. Areas can link to notes, modules,
  monsters, encounters and characters, but not to parties, other areas or
  markers.
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

`LocationMapTab` listens for `map-action` with `onMapAction(map, handler)` and opens
the existing marker or area editor. The right-click **Add marker here** action
carries the clicked map coordinate, so the marker editor opens at the
right-clicked point. Draw actions from the context menu use an
`ol-contextmenu` submenu for the area shape.

## Maps page

The Maps page lists locations, each with its own map data and add, view, edit,
and delete actions. There is no separate map list or map-detail route. Legacy
`/maps/:id` URLs redirect to `/locations/:id`.

Location cards show the location name and description. Deleting a location
removes its map file and clears marker/area references from other locations.

## Map tab

The location detail page includes a **Map** tab that renders the location-owned
map. It contains:

- The map image with markers, areas, labels and the map action controls.
- The location right sidebar hosts the map's **Markers** and **Areas** tabs,
  grouped by layer, plus a **Scenes** tab for ambient scene links. The map tab
  has no internal sidebar.
  - Layers show their title with visibility controls.
  - Rows use a coloured left edge like jukebox tracks.
  - Areas do not show their shape type in the list.
  - In edit mode rows have edit/delete actions and each layer has
    rename/delete controls. The base layer cannot be edited or deleted.
- Outside the **Map** tab, the right sidebar displays the location's ambient
  **Scenes** panel instead of an empty panel.
  - The `#location-map-sidebar` teleport target stays mounted but hidden
    outside the map tab, so `LocationMapTab` can always teleport its sidebar
    after mount without racing the right drawer's render order.
  - Hovering a row highlights the marker or area on the map.
- **Add layer** is a menu-style row below the tabbed lists, shown only in edit
  mode.
- A **Show labels** toggle (on by default) hides marker labels and area label
  overlays when turned off, keeping marker icons and area fills visible.
- The **View mode / Edit mode** control is an icon-only button group fixed at the
  bottom of the sidebar.
- In view mode the map action menu, context menu, row edit/delete actions, and
  popup edit action are hidden.

Clicking a marker or area opens an information popup instead of the editor. The
popup is a Quasar menu anchored at the click position rather than an
OpenLayers overlay, and its content uses `QCard`, `QCardSection`, `QCardActions`
and `QBtn`. It shows the title, description, marker location, and linked
entities, with an Edit action in edit mode and a Go to location action when
linked.

## Location tabs

A location detail page has four header tabs:

- **View** — location description; in edit mode this becomes **Main editor**
  with a borderless name field and shared Markdown description editor.
- **Map** — the map image and editing UI. Hidden when the location has no map
  image. It shares the location-level View/Edit state with the main tab, so
  switching tabs keeps the same mode.
- **Backlinks** — markers and areas from other locations whose `locationId`
  points at this location, grouped by their owning location. The tab uses
  `IconMapPinned` and is hidden in edit mode.
- **Linked entities** — modules and other linked entities. In edit mode every
  supported kind is editable through `EntitiesLinking`.

Outside the Map tab the right sidebar shows the Scenes content with the shared
View/Edit and visual-editor controls. Header title hides in edit mode; Delete
appears only in edit mode; formatting help appears in raw Markdown mode. Save
happens when returning to View and dirty navigation uses the shared unsaved
guard. The `MapLocationEditor` modal uses the same inline editor components,
Markdown description, formatting help and View/Edit semantics for list/create
flows. Deleting a location removes it everywhere.

## User flows

### Create/edit a location and its map

1. Open **Maps** in the left navigation.
2. Create a location or edit an existing one.
3. Choose a name/description and optionally select a base image.
4. On save, the image file is written to `map_files` only when needed. Replacing
   or clearing an image deletes the previous `map_files` record. **Clear map**
   resets the image, layers, markers and areas.
5. Open the location and use the **Map** tab to add markers and areas.

### Place and edit markers

1. Open a location and switch to the **Map** tab.
2. Enter edit mode, then click the pencil action button and choose **Add
   marker**, then click the map. Alternatively, right-click the map and choose
   **Add marker here** to place a marker at the clicked point.
3. Fill in title, description, location, linked entities, icon, and color.
   New markers default to the location that owns the map.
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
   and linked entities. New areas default to the owning location.
4. Save. Click an area or its label to edit it again.
5. The map sidebar **Areas** tab lists areas for editing and deletion.

### Browse locations

Open **Maps** in the left navigation to see the location list. Select a location
card to open its detail page, where you can view or edit its map, manage links,
and inspect backlinks from markers and areas in other locations.

## Stores and files

- `map_locations` — `MapLocation` records including embedded `map` data.
- `map_files` — base images and extracted metadata.
- Legacy `maps` records are merged into locations by migration
  `0000000009_merge_maps_into_locations` and are not read by the app.

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
  | 'location'
  | 'playlist';
```

`EntitiesLinking` loads each entity store, shows one linking block per entity
type, and deduplicates `kind:id` pairs. Its read-only mode hides the add and
remove actions, and the marker/area popup uses it to list linked entities. Map,
marker, area, and location editors use `BaseModal` header tabs to separate their
own fields from linked entities.

## Icons

`src/maps/icons.ts` exposes `MAP_MARKER_ICONS`, generated from the RPG Awesome
CSS class list, plus `DEFAULT_MARKER_ICON` (empty by default, meaning no icon) and
`DEFAULT_MARKER_COLOR`. `src/maps/mapMarkerSvg.ts` generates colored marker pins
from either RPG Awesome paths or Font Awesome core icons.

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
