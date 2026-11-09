# Map Studio — overview

## 1. What we are building

A first-party, offline-capable map drawing studio for DMH, inspired by Dungeon Scrawl and built on PixiJS. It lets a GM draw dungeon and world maps with shape-based tools, style them with layers and presets, decorate them with images/text/doors/stairs, add lighting and textures, and export finished maps for the existing location viewer, print, or other VTTs.

The studio is a **new feature**. It does not replace the current location map viewer in the first implementation.

## 2. Confirmed scope decisions

| Decision | Choice | Consequence |
| --- | --- | --- |
| Viewer integration | **Studio only** | The existing `LocationMapTab` / OpenLayers viewer stays untouched. The studio exports an image and/or `.ds` file. |
| Feature scope | **Everything local** | Include editor features that Dungeon Scrawl sells as Pro: textures, lighting, custom presets, PDF/UVTT export, random dungeon. Replace cloud behavior with local equivalents. |
| Existing map data | **Drawings only** | Markers, areas and entity links are not shown or edited in the studio. |
| Platforms | **Full touch/mobile parity** | Every tool, panel and gesture must work on phones/tablets as well as desktop. |

## 3. Explicit non-goals

- Roll20 Connect / live VTT sync / Send to Tabletop.
- Accounts, public share links, community map showcase, cloud sync.
- Real-time multi-user editing.
- Integrating studio objects with location markers/areas/entity links in this version.
- Replacing the current OpenLayers viewer as part of this feature.
- Exact binary compatibility with every historical `.ds` file edge case; `.ds` interoperability is best-effort and versioned.

## 4. Relationship to the existing Maps feature

Today:

- `MapLocation.map` stores `fileId` + layers + markers + areas.
- `LocationMapTab.vue` renders a raster background through OpenLayers and overlays markers/areas.
- Map image files are stored through the existing file storage/OPFS layer.

With Map Studio:

1. A location can be opened in the studio (button on the location map tab).
2. The studio creates or opens a studio map linked to that location.
3. “Save to location” rasterizes the drawing at a chosen pixels-per-cell value, stores it as a `MapFile`, and updates `LocationMap.fileId`.
4. Existing markers, areas and layers remain untouched and continue to work in the viewer.
5. Studio documents remain editable; re-exporting replaces the background image.

The studio also works standalone: users can create maps in the local library without attaching them to a location, then export them or attach them later.

## 5. Product principles

1. **Fast to start.** A new map opens with a sensible dungeon preset and rectangle tool selected.
2. **Shape-first, not pixel-first.** Rooms, polygons, walls, paths and doors stay editable; styles are applied as render passes.
3. **No hidden state.** Autosave status is always visible. Every destructive action is undoable or confirmed.
4. **Touch is not an afterthought.** Panels become sheets, handles grow, long-press replaces right-click, and all shortcuts have touch equivalents.
5. **Offline first.** Everything is local; export is the sharing boundary.
6. **Progressive complexity.** Simple maps need only the toolbar; layers, lighting and custom presets are available but never required.

## 6. Success criteria

### Functional

- All non-cloud features in the Dungeon Scrawl help center have a corresponding behavior, with the exceptions listed in `01-feature-parity.md`.
- A user can create, save, reopen, duplicate and export a map entirely offline.
- A finished drawing can be applied as a location background without breaking existing markers/areas.
- `.ds` import/export covers the geometry, layers, images and lights that our model supports, with a clear compatibility report.

### Quality

- 60 fps pan/zoom on a mid-range laptop for a map with ~500 shapes and ~50 objects.
- First interaction within 1 second after opening a map; no full-page reload.
- Undo/redo for every user-visible mutation.
- Full keyboard, touch and screen-reader labelling for core actions.
- Unit tests for geometry/tool state machines and Playwright coverage for the main desktop and mobile flows.

## 7. Terminology

| Term | Meaning |
| --- | --- |
| **Project** | A local library entry. May contain one or more maps (`.ds`-style multi-map file). |
| **Map** | One canvas/document with grid, background, layers and objects. |
| **Layer** | A dungeon layer, the background layer, the fog layer, or the images/folder tree. |
| **Dungeon layer** | A vector drawing layer with floor, wall, grid, shadow, hatching, shading and texture passes. |
| **Shape / dungeon geometry** | A drawing operation (rect, polygon, path, wall) compiled into polygons. |
| **Object** | A non-geometry node: image, text, door, stairs, light, group/folder. |
| **Asset** | An uploaded or built-in image/texture/font referenced by the document. |
| **Preset** | A reusable layer style (dungeon, world-building, custom). |
| **World** | The map coordinate space. Canonical units are grid cells. |
| **Cell** | One grid square/hex. |
| **Bake** | Rasterizing the studio map into an image file. |

## 8. Reference behavior

The parity checklist is derived from these pages and their subpages:

- Getting Started: overview, table of contents, quick start, navigating, saving/managing maps, FAQ, Pro features.
- Toolbar: pan/zoom, object, rectangle, circle/regular polygon, path, polygon, wall, select, door, stairs, text, stamp.
- Sidebar: Scrawl/Presets, Images, Clipboard, Textures, Lighting, Random Dungeon, Export/Sharing.
- Styling and Layers: introduction to layers, managing layers, layer settings.

Roll20 integration sections (Connect to Roll20, Send to Tabletop) are intentionally out of scope.

## 9. Recommended delivery shape

Build the studio behind a feature flag as its own feature module (`src/map-studio/`) with its own route, store, persistence tables and Pixi renderer. Do not modify the current maps feature except for:

- a feature-flag/catalog entry,
- a launcher button on the location map tab,
- a small “apply exported image” integration.

That keeps blast radius low and lets the studio evolve independently.
