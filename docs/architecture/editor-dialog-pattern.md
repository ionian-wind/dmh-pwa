# Editor Dialog Pattern

> **Status: tab infrastructure implemented; editor migration in progress.**
>
> `BaseModal` now supports header tabs and named tab slots. Existing editors
> still mix root fields, internal options, and entity links in one form; use
> this document as the specification for the migration.

## Purpose

Every entity editor dialog should follow the same information architecture:

1. Fields that belong to the entity itself come first.
2. Options that configure internal entities come next.
3. Links to main entities live in a separate header tab when the entity supports
   linking.

The goal is to stop editor dialogs from growing into long mixed forms and to
make entity relationships consistent across the application.

## Entity categories

### Main entities

A **main entity** is a persisted domain object with its own routed detail page.
Main entities are the only entities that can appear in the **Links** tab.

| Entity    | Detail route      | Editor today      |
| --------- | ----------------- | ----------------- |
| Note      | `/notes/:id`      | `NoteEditor`      |
| Party     | `/parties/:id`    | `PartyEditor`     |
| Monster   | `/monsters/:id`   | `MonsterEditor`   |
| Character | `/characters/:id` | `CharacterEditor` |
| Encounter | `/encounters/:id` | `EncounterEditor` |
| Combat    | `/combats/:id`    | no editor yet     |
| Module    | `/modules/:id`    | `ModuleEditor`    |
| Map       | `/maps/:id`       | `MapEditor`       |
| Location  | `/locations/:id`  | `MapLocationEditor` |

A main entity may have no editor yet (currently Combat). If an editor is added
later, it must follow this pattern.

### Internal entities

An **internal entity** is stored for a feature but has no independent detail
route. It is created and edited inside a parent page or dialog.

| Internal entity  | Parent feature                    |
| ---------------- | --------------------------------- |
| Note type        | Notes / `NoteEditor`              |
| Timer            | Timers list                       |
| Jukebox track    | Jukebox                           |
| Jukebox playlist | Jukebox sidebar                   |
| Map file         | Map editor                        |
| Map layer        | Map sidebar / map editor          |
| Map marker       | Map view                          |
| Map area         | Map view                          |
| Combatant        | Combat view                       |

Internal entities never appear in the main-entity linking UI. Options that
configure them stay in the main editor form.

## Dialog structure

### Header tabs

If the entity supports linking to main entities, the dialog header shows two
tabs, following the calculator dialog pattern (`QTabs` inside the dialog
toolbar with icon-only `QTab`s and accessible titles):

| Order | Tab             | Icon            | Content                             |
| ----- | --------------- | --------------- | ----------------------------------- |
| 1     | Main editor     | `IconForms`     | Entity fields + internal options    |
| 2     | Main entity links | `IconAffiliate` | Links to other main entities      |

Rules:

- The **Main editor** tab is selected by default.
- Tabs appear only when the entity actually supports main-entity linking. An
  editor with no links keeps a single form and no tabs.
- Header tabs are navigation only. They must not add their own submit, cancel,
  or delete buttons.
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
   These are options that configure records without their own page. They stay
   in this tab, not in the Links tab.

Do not place main-entity links in this tab.

### Tab 2 — Main entity links

The links tab contains only references to main entities.

- Group links by entity type.
- Each type uses the shared `EntitiesLinking` component:
  - entity-type title on the left,
  - add button on the right,
  - linked entities in a virtual-scroll list with a remove action,
  - a searchable multi-select modal with a virtual-scroll result list.
- Use `multiple=false` for single-value relationships (for example a note's
  module or a map's location). Use the default `multiple=true` for collections.
- Internal entities must never be offered here.

## What counts as a link

Use the following rule when deciding whether something moves to the Links tab.

| Data shape                                                    | Where it goes                          |
| ------------------------------------------------------------- | -------------------------------------- |
| Scalar fields owned by the entity                             | Main editor, first section             |
| Options pointing at internal entities                         | Main editor, second section            |
| Optional single main-entity reference (`moduleId`, `locationId`) | Links tab, single-select              |
| `MapEntityRef[]`-style cross-entity links                     | Links tab, grouped by entity type      |
| Owned structures with extra per-relation data (party members, encounter monster roster, module note tree, map layers) | Main editor, because they define the entity itself |

The last row is important: not every reference is a generic link. If the
relationship carries counts, ordering, tree structure, or other per-relation
data, it is part of the entity's own definition and stays in the main editor.

## Dialog actions

Every entity editor dialog keeps the standard action bar:

- **Delete** — only when editing an existing entity.
- **Cancel**.
- **Save**.

Delete and Save apply to the whole draft, including links edited in the second
tab. The action bar is provided by `BaseModal`; editors must not put delete or
save buttons inside tab content.

## Acceptance checklist

An editor dialog conforms when:

- Entity-owned fields are in the first section of the main tab.
- Internal-entity options are in the second section of the main tab.
- Main-entity links are only in the second header tab.
- The header uses `QTabs` with `IconForms` and `IconAffiliate` when linking is
  available.
- The dialog keeps one shared draft and one standard action bar.
- No delete, save, or cancel action exists inside tab content.
- Empty/large link lists use `EntitiesLinking` with its virtual-scroll lists.
