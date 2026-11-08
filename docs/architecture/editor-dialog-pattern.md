# Editor Dialog Pattern

> **Status: implemented in the editors that participate in the shared relation
> system.**
>
> `BaseModal` supports header tabs and named tab slots. Routed entity editors,
> the map marker/area editors, the playlist editor, and the ambient scene dialog
> use tabs. Simple editors such as `TimerEditor` keep a single form and no tabs.
> The original "main entities only" rule is not followed literally: playlists,
> map markers/areas, and ambient scenes are linkable but have no routed detail
> page.

## Purpose

Editors that support relationships follow the same information architecture:

1. Fields that belong to the record itself come first.
2. Options that configure internal entities come next.
3. Links live in a separate header tab when the record participates in the
   relation system.

The goal is to stop editor dialogs from growing into long mixed forms and to
make entity relationships consistent across the application.

## Entity categories

### Routed main entities

A **main entity** is a persisted domain object with its own routed detail page.
These are the primary link targets.

| Entity    | Detail route      | Editor today        |
| --------- | ----------------- | ------------------- |
| Note      | `/notes/:id`      | `NoteEditor`        |
| Party     | `/parties/:id`    | `PartyEditor`       |
| Pawn      | `/pawns/:id`      | `PawnEditor`        |
| Character | `/characters/:id` | `CharacterEditor`   |
| Encounter | `/encounters/:id` | `EncounterEditor`   |
| Location  | `/locations/:id`  | `MapLocationEditor` |
| Combat    | `/combats/:id`    | no editor           |

Combat has no editor; `CombatView` is a dedicated page. If an editor is added
later, it should follow this pattern.

### Internal and non-routed records

An **internal entity** is stored for a feature but has no independent detail
route. Some internal records have their own links tab; others only have options
inside a parent editor.

| Record           | Parent feature           | Links tab? | Link target? |
| ---------------- | ------------------------ | ---------- | ------------ |
| Note type        | Notes / `NoteOptions`    | no         | no           |
| Timer            | Timers list              | no         | no           |
| Jukebox track    | Jukebox                  | no         | no           |
| Jukebox playlist | Jukebox sidebar          | yes        | yes          |
| Map file         | Location editor          | no         | no           |
| Map layer        | Map sidebar / map editor | no         | no           |
| Map marker       | Location map tab         | yes        | no           |
| Map area         | Location map tab         | yes        | no           |
| Ambient scene    | Ambient sound            | yes        | no           |
| Combatant        | Combat view              | no         | no           |

The link targets offered by `EntitiesLinking` come from
`virtual:feature-links`, which currently registers note, character, party, pawn,
encounter, location, and playlist kinds. Map markers/areas and ambient scenes
can link outward but are not themselves link targets.

## Dialog structure

### Header tabs

If the record has link blocks, the dialog header shows two tabs in the same
toolbar line as the expand and close buttons, centered between them. The text
title is hidden while tabs are shown. This follows the calculator dialog pattern
(`QTabs` with icon-only `QTab`s and accessible titles):

| Order | Tab         | Icon            | Content                          |
| ----- | ----------- | --------------- | -------------------------------- |
| 1     | Main editor | `IconForms`     | Entity fields + internal options |
| 2     | Links       | `IconAffiliate` | Links to other record kinds      |

Rules:

- The **Main editor** tab is selected by default.
- Tabs appear when the dialog has link blocks to show. An editor with no
  relationships (for example `TimerEditor`) keeps a single form and no tabs.
- Header tabs are navigation only. They must not add their own submit, cancel,
  or delete buttons.
- The tab row is part of the header toolbar, not a second row below it.
- When tabs are present, the dialog title is not rendered as text; the active
  tab title/accessible label identifies the dialog context.
- Switching tabs preserves the current draft, validation state, and any edits
  made in either tab.
- The standard dialog actions (Delete / Cancel / Save) remain visible for both
  tabs.

### Tab 1 — Main editor

The main editor tab is ordered top-to-bottom:

1. **Entity-owned fields** first.
   Examples: title, name, description, content, coordinates, shape, image,
   notes, colour, icon.
2. **Internal-entity options** second.
   Examples: note type, map layer, tags, or similar feature configuration.
   These are options that configure records without their own page. Where they
   are rendered inline, they follow the entity fields and stay out of the Links
   tab. Some editors move them to a menu instead (`NoteOptions` holds note type
   and tags).

Do not place main-entity links in this tab.

### Tab 2 — Links

The links tab contains references to other records.

- Group links by entity type. Map locations also offer jukebox playlists.
- Note→location links are stored on the location's `entities` array even though
  they are edited from the note's Links tab.
- Each type uses the shared `EntitiesLinking` component:
  - entity-type title on the left,
  - add button on the right,
  - linked entities in a virtual-scroll list with a remove action,
  - a searchable multi-select modal with a virtual-scroll result list.
- Use `multiple=false` for single-value relationships (for example a marker's
  location). Use the default `multiple=true` for collections.
- Only kinds registered in `virtual:feature-links` may be offered as targets.
  Internal records such as note types, timers, tracks, map layers, and
  combatants are never offered; playlists are a registered exception.

## What counts as a link

Use the following rule when deciding whether something moves to the Links tab.

| Data shape                                                              | Where it goes                                   |
| ----------------------------------------------------------------------- | ----------------------------------------------- |
| Scalar fields owned by the entity                                       | Main editor, first section                      |
| Options pointing at internal entities                                   | Main editor, second section                     |
| Optional single reference (`MapMarker/MapArea.locationId`)              | Links tab, single-select                        |
| `MapEntityRef[]`-style cross-entity links                               | Links tab, grouped by entity type               |
| Counted or ordered domain data (`encounter.pawns`, `playlist.trackIds`) | Domain editor/sidebar, not the generic link tab |

`party.characters` is a special case: it is stored inline on the party, but the
`PartyEditor` exposes it through the Character link block. Encounter pawn counts
and playlist track ordering remain in their domain UI. The rule is therefore
about where the user edits the value, not only about its storage shape.

## Dialog actions

Every entity editor dialog keeps the standard action bar:

- **Delete** — only when editing an existing entity.
- **Cancel**.
- **Save**.

Delete and Save apply to the whole draft, including links edited in the second
tab. The action bar is provided by `BaseModal`; editors must not put delete or
save buttons inside tab content.

## Implementation status

Editors that use the tab layout:

| Editor              | Link blocks                                               |
| ------------------- | --------------------------------------------------------- |
| `NoteEditor`        | Characters, Pawns, Parties, Encounters, Locations         |
| `PartyEditor`       | Notes (existing party only), Characters                   |
| `PawnEditor`        | Notes, Encounters, Locations                              |
| `CharacterEditor`   | Notes, Parties, Locations                                 |
| `EncounterEditor`   | Notes                                                     |
| `PlaylistEditor`    | Locations, Pawns, Encounters, Parties                     |
| `MapLocationEditor` | Notes, Parties, Pawns, Encounters, Characters, Playlists  |
| `MapMarkerEditor`   | Locations (single) + Notes, Pawns, Encounters, Characters |
| `MapAreaEditor`     | Locations (single) + Notes, Pawns, Encounters, Characters |
| `ScenePlayerDialog` | Ambient scene links (scenes panel)                        |

`TimerEditor` has no relationship blocks and keeps a single form without tabs.
`CombatView` is a page, not an editor. Link blocks are conditional on the
corresponding feature stores being enabled.

## View pages mirror the editor

Detail pages use `BaseEntityTabView` and switch tabs when entering edit mode:

- In view mode, the main tab uses `IconEye` and the label **View**; the links
  tab uses `EntityViewLinks` to render read-only link blocks.
- In edit mode, the same pages switch to the editor tabs (`IconForms` /
  `IconAffiliate`) and editable `EntitiesLinking` blocks.
- Tabs render icon-only in the app header panel (`#main_header`), centered in
  the toolbar. Hovering a tab shows its label.
- Add, remove and inline-create actions are not available in the view tab.
- Mention lists remain available in the right sidebar.
- `NoteView`, `PartyView`, `PawnView`, `CharacterView`, and `EncounterView`
  follow the main/links split (Encounter labels its first tab **Information**
  and adds a **Combats** tab).
- `LocationView` adds **Map** (when a map file exists) and **Backlinks** tabs to
  the main/links split.
- `CombatView` has phase-oriented content and no links tab.

## Acceptance checklist

An editor dialog conforms when:

- Entity-owned fields are in the first section of the main tab.
- Internal-entity options are in the second section of the main tab.
- Relationship links are only in the second header tab.
- The header uses `QTabs` with `IconForms` and `IconAffiliate` when linking is
  available.
- The dialog keeps one shared draft and one standard action bar.
- No delete, save, or cancel action exists inside tab content.
- Empty/large link lists use `EntitiesLinking` with its virtual-scroll lists.
