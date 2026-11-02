# Data Model

## Conventions

- Every persisted entity extends `WithMetadata`:
  ```ts
  {
    id: string;
    createdAt: number;
    updatedAt: number;
  }
  ```
- IDs are generated with `nanoid(10)` (`utils/storage.ts#generateId`). The
  alphabet includes letters, digits, `_`, and `-`.
- Timestamps are Unix milliseconds from `Date.now()`.
- All records are plain JSON-serializable objects; `deepUnwrap()` converts Vue
  proxies/refs before persistence and explicitly preserves `Blob` and
  `FileSystemFileHandle`.
- Shapes are defined twice: TypeScript interfaces in `src/types/index.ts` and
  JSON Schemas in `src/schemas/*.json`. They are not generated from each other
  and have drifted in places.

## Entities

### Note

| Field      | Type             | Notes                                                       |
| ---------- | ---------------- | ----------------------------------------------------------- |
| `title`    | `string`         | Required by schema and UI                                   |
| `content`  | `string`         | Markdown source                                             |
| `typeId`   | `string \| null` | References a `NoteType`; UI for setting it is commented out |
| `tags`     | `string[]`       | Used for card chips and route-based tag filtering           |
| `moduleId` | `string \| null` | Owning module, or null for free notes                       |
| `parentId` | `string?`        | Declared in TS, not persisted by schemas/UI                 |
| `metadata` | `object?`        | Declared in TS, unused                                      |
| `hidden`   | `boolean`        | `true` = document-tree note, excluded from normal note list |

Schema: `src/schemas/note.schema.json` requires `id`, `title`, `content`,
`typeId`, `tags`, `moduleId`, `createdAt`, `updatedAt`. `hidden` is not listed
but is accepted because additional properties are allowed.

**Hidden-note semantics.** A note with `hidden: true`:

- is filtered out of `NotesView` (`noteStore.filtered.filter(n => !n.hidden)`);
- is excluded from `ModuleView`'s Notes tab (`hidden === false`);
- is the only kind of note loaded by `ModuleDocumentTree` and
  `ModuleDocumentView` for the book;
- cannot be toggled after creation because `noteStore.update()` restores the
  original `hidden` value (`src/stores/notes.ts`).

### Module

| Field         | Type                | Notes                            |
| ------------- | ------------------- | -------------------------------- |
| `name`        | `string`            | Required                         |
| `description` | `string?`           | TS only; schema does not list it |
| `settings`    | `object?`           | TS only, unused                  |
| `noteTree`    | `ModuleTreeNode[]?` | Hierarchical document structure  |

`ModuleTreeNode`:

```ts
{ noteId: string; children?: ModuleTreeNode[] }
```

The schema requires `children` on every node (even though the TS type marks it
optional). The document tree component always writes `children` (possibly
`undefined` in memory, omitted by JSON serialization).

### NoteType

| Field                          | Type               | Notes                          |
| ------------------------------ | ------------------ | ------------------------------ |
| `name`                         | `string`           | Required                       |
| `description`, `color`, `icon` | optional           | Rendered by `NoteTypeSelector` |
| `fields`                       | `NoteTypeField[]?` | Declared but never rendered    |

`NoteTypeField` describes `text | number | boolean | date | select |
multiselect` fields with optional options/defaults. No code consumes these
fields. The note editor UI for selecting a type is commented out.

### Party

| Field                  | Type       | Notes                          |
| ---------------------- | ---------- | ------------------------------ |
| `name`                 | `string`   | Required                       |
| `description`, `notes` | `string?`  | Editor fields                  |
| `characters`           | `string[]` | Character IDs                  |
| `moduleIds`            | `string[]` | Many-to-many module membership |

### Character (PlayerCharacter)

| Field   | Type      | Notes     |
| ------- | --------- | --------- |
| `name`  | `string`  | Required  |
| `notes` | `string?` | Free text |

The README advertises stats, equipment, and full character sheets; the actual
type has only name and notes. Older test suites still assume `level`, `class`,
`stats`, `hitPoints`, `armorClass`, etc.

### Monster

| Field       | Type        | Notes                          |
| ----------- | ----------- | ------------------------------ |
| `name`      | `string`    | Required                       |
| `notes`     | `string?`   | Free text                      |
| `moduleIds` | `string[]?` | Many-to-many module membership |

Again, no stat block/CR/HP fields exist.

### Encounter

| Field         | Type                     | Notes                                     |
| ------------- | ------------------------ | ----------------------------------------- |
| `name`        | `string`                 | Required                                  |
| `description` | `string?`                | Rendered with `v-html` in the detail view |
| `monsters`    | `Record<string, number>` | Monster ID → count (schema: 1..20)        |
| `moduleId`    | `string`                 | Required; editor requires a truthy value  |
| `notes`       | `string?`                | Free text                                 |

### Combat

| Field          | Type                                     | Notes                       |
| -------------- | ---------------------------------------- | --------------------------- |
| `encounterId`  | `string`                                 | Reference                   |
| `partyId`      | `string`                                 | Reference                   |
| `status`       | `'preparing' \| 'active' \| 'completed'` | Lifecycle                   |
| `currentRound` | `number`                                 | Starts at 0 while preparing |
| `currentTurn`  | `number`                                 | Index into combatants       |
| `combatants`   | `Combatant[]`                            | Snapshotted participants    |
| `notes`        | `string?`                                | Free text                   |

`Combatant`:

```ts
{
  id: string;                 // unique per participant instance
  name: string;               // REQUIRED by TS, but never populated by creators
  type: 'player' | 'monster';
  referenceId?: string;       // character or monster ID
  notes?: string;
  initiative: number;
  hasActed: boolean;
  isPostponed: boolean;
  createdAt, updatedAt: number;
}
```

The schema does **not** require `name`, and both `PartySelector` and
`CombatView` create combatants without it. Display names are resolved from
`referenceId` at render time, so this mismatch is type-only today but blocks a
clean type check.

### Bookmark

| Field      | Type     | Notes                                                         |
| ---------- | -------- | ------------------------------------------------------------- |
| `moduleId` | `string` | Owning module                                                 |
| `noteId`   | `string` | Despite the name, stores a note/document ID                   |
| `title`    | `string` | Editable label; created as `''` then resolved from note title |

Uniqueness is enforced only in application code
(`findByModuleAndAnchor`), not by an IndexedDB index.

### Timer

| Field                  | Type                                    | Notes            |
| ---------------------- | --------------------------------------- | ---------------- |
| `title`, `description` | `string?`                               | Optional labels  |
| `duration`             | `number`                                | Milliseconds     |
| `startedAt`            | `number \| null`                        | Wall-clock start |
| `status`               | `'inactive' \| 'running' \| 'finished'` | Lifecycle        |

Schema forbids additional properties. Title/description accept `null` in the
schema but the TS type uses optional strings.

### Jukebox entities

Defined in `src/jukebox/types.ts` and intentionally **not** schema-validated
(FileSystem handles are not plain JSON).

**JukeboxFile**

```ts
{
  id, name, size, type, lastModified, createdAt, updatedAt,
  source:
    | { kind: 'handle'; handle: FileSystemFileHandle }
    | { kind: 'blob'; blob: Blob }
}
```

**JukeboxTrack**

```ts
{
  id, createdAt, updatedAt,
  fileId,
  title, artist?, album?, duration?,
  artworkUrl?, playlistIds, genre?, year?, trackNumber?, discNumber?,
  composer?, comment?, lyrics?,
  picture?: string | Blob,
  color?: string,
  palette?: string[],
  disabled?: boolean
}
```

`playlistIds` is declared but membership is actually read from
`playlist.trackIds`; the field is created empty and never maintained.

**JukeboxPlaylist**

```ts
{
  id, createdAt, updatedAt,
  name, description?, trackIds, sortOrder?, moduleIds?
}
```

### Map entities

Defined in `src/maps/types.ts`; maps are schema-validated
(`src/maps/schemas/map.schema.json`). Map files are not schema-validated because
they may contain `Blob`/`FileSystemFileHandle` sources.

**MapFile** (`map_files` store)

```ts
{
  id, name, size, type, lastModified, createdAt, updatedAt,
  source:
    | { kind: 'blob'; blob: Blob }
    | { kind: 'handle'; handle: FileSystemFileHandle },
  imageMetadata?: {
    width, height, naturalWidth?, naturalHeight?, aspectRatio,
    fileSize?, mimeType?, color?, palette?
  }
}
```

**MapEntity** (`maps` store)

```ts
{
  id, createdAt, updatedAt,
  title, description?,
  fileId, // references map_files.id
  locationId?: string | null,
  layers: MapLayer[],
  markers: MapMarker[],
  areas: MapArea[],
  points?: unknown[] // legacy, normalized into markers on read
}
```

**MapLayer**

```ts
{
  (id, title);
}
```

**MapLocation**

```ts
{
  id,
  name,
  description?,
  entities: MapEntityRef[]
}
```

**MapMarker**

```ts
{
  id,
  title,
  description?,
  x, y, // image-pixel coordinates
  locationId?: string | null,
  layerId: string,
  entities: MapEntityRef[],
  icon, // RPG Awesome class without the "ra" prefix
  color, // CSS color
  backgroundColor? // optional badge colour, empty for transparent
}
```

**MapArea**

```ts
{
  id, title, description?,
  shape: 'polygon' | 'circle' | 'square' | 'freehand',
  points: [number, number][],
  center?: [number, number],
  radius?: number,
  locationId?: string | null,
  layerId: string,
  entities: MapEntityRef[],
  icon?: string,
  color
}
```

**MapEntityRef**

```ts
{
  kind: 'note' |
    'module' |
    'party' |
    'monster' |
    'encounter' |
    'character' |
    'map';
  id: string;
}
```

## Relationship map

```mermaid
erDiagram
  MODULE ||--o{ NOTE : "note.moduleId"
  MODULE ||--o{ ENCOUNTER : "encounter.moduleId"
  MODULE }o--o{ PARTY : "party.moduleIds"
  MODULE }o--o{ MONSTER : "monster.moduleIds"
  MODULE }o--o{ PLAYLIST : "playlist.moduleIds"
  MODULE ||--o{ BOOKMARK : "bookmark.moduleId"
  MODULE ||--o{ MODULE_TREE_NODE : "noteTree"
  MODULE_TREE_NODE }o--|| NOTE : "noteId"
  NOTE_TYPE ||--o{ NOTE : "note.typeId"
  PARTY }o--o{ CHARACTER : "party.characters"
  ENCOUNTER }o--o{ MONSTER : "encounter.monsters{count}"
  ENCOUNTER ||--o{ COMBAT : "combat.encounterId"
  PARTY ||--o{ COMBAT : "combat.partyId"
  COMBAT ||--o{ COMBATANT : "embedded"
  COMBATANT }o--o| CHARACTER : "referenceId"
  COMBATANT }o--o| MONSTER : "referenceId"
  JUKEBOX_FILE ||--o{ JUKEBOX_TRACK : "track.fileId"
  JUKEBOX_PLAYLIST }o--o{ JUKEBOX_TRACK : "playlist.trackIds"
  NOTE ||--o{ MENTION_LINK : "indexations_mentions"
```

### Mentions index

`indexations_mentions` is a separate object store keyed by `"kind:id"`. Each
record is `{ id: 'note:abc', links: [{kind, id}, ...] }`. `getBacklinks` scans
all records. Only note content is indexed (`noteStore.create/update/remove`);
other entity types are never written to the index, so "mentions" sidebars can
currently only show note→entity and note→note connections.

## Referential integrity

There are no foreign keys, cascade rules, or cleanup routines. Consequences:

- Deleting a module leaves notes with `moduleId`, encounters with `moduleId`,
  bookmarks, and party/monster/playlist `moduleIds` pointing at a missing
  module.
- Deleting a note leaves nodes in `module.noteTree`. The book builder silently
  skips missing notes, so the tree shows holes.
- Deleting a character leaves it in `party.characters`; `PartyView` filters via
  `characterStore`, so it disappears from the list but the ID remains and is
  re-saved on the next party update.
- Deleting a monster leaves its key in `encounter.monsters`; the encounter
  table simply does not render it, but the count is still exported.
- Deleting a track removes its file record even if another track references the
  same `fileId`.

## Schema/Type drift

| Area                                         | TS               | JSON Schema      | Effect                                                                         |
| -------------------------------------------- | ---------------- | ---------------- | ------------------------------------------------------------------------------ |
| `Note.hidden`                                | required boolean | absent           | accepted, not validated                                                        |
| `Module.description/settings`                | present          | absent           | stripped only if schema had `additionalProperties:false`; it does not, so kept |
| `NoteType.description/color/icon/fields`     | present          | absent           | same                                                                           |
| `Encounter.notes`, `Party.description/notes` | present          | absent           | same                                                                           |
| `Combatant.name`                             | required         | absent           | creators omit it                                                               |
| `ModuleTreeNode.children`                    | optional         | required         | in-memory trees may omit                                                       |
| `Timer.title/description`                    | optional string  | `string \| null` | nulls pass validation but not TS                                               |
| Bookmarks noteId                             | string           | string           | semantic ambiguity, not drift                                                  |

Because schemas are only applied on **write**, legacy or imported records that
were written before a schema change are not re-validated on load.
