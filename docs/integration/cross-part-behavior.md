# Cross-Part Behavior

This document connects the individual parts. It explains the end-to-end flows
that span stores, views, the shell, and persistence, and highlights where the
seams are broken.

## 1. App boot → first useful screen

```
index.html
  └─ main.ts
       ├─ initializeDatabase()             (openDB, migrations)
       ├─ createPinia + PiniaSharedState
       ├─ router (all views eagerly imported)
       ├─ useConfigStore()                 (localStorage)
       ├─ i18n (locale 'ru' → savedLanguage)
       ├─ setupAnchorScrollHandler()
       ├─ VueDnDKit, Quasar (Notify, Dialog)
       └─ App.vue
            ├─ playerStore.init()          (tracks, playlists, volume, restore)
            ├─ timerStore.init()           (timers + global 1s poll)
            └─ router-view → HomeView
                 └─ loads notes, characters, parties, monsters,
                    encounters, modules (6 × getAll)
```

Every route view then loads its own stores again. There is no shared
"load once" bootstrap; `load()` is called per view mount and replaces the whole
array. In a session that visits several routes, IndexedDB is read repeatedly.

## 2. Creating a note (list flow)

```
NotesView "create" button
  └─ BaseListView opens NoteEditor with note=null
       └─ NoteEditor collects title/content (Milkdown emits Markdown)
            └─ submit → NotesView.handleSubmit
                 └─ noteStore.create({...note, hidden:false})
                      ├─ base.create → deepUnwrap + id/timestamps
                      ├─ idbPutItem → Ajv note.schema.json → put('notes')
                      ├─ items.push(newNote)
                      └─ indexation.setLinks('note:id', extractMentionedEntities(content))
                           └─ idbPutItem('indexations_mentions')
```

The list re-renders from `noteStore.filtered`. If the note mentions another
entity, the mention index now points at it, and the entity sidebars read the
index correctly.

## 3. Editing a note from its detail page

```
NoteView loads (notes, modules, mentions, parties, monsters, encounters)
  └─ resolves note by route id
       ├─ read view: Markdown renders; task checkboxes can emit update:content
       │     └─ handleMarkdownContentChange → noteStore.update(content)
       └─ Edit → NoteEditor (modal)
             └─ submit → validate every mention against its store
                  ├─ missing → validationError rendered in modal (save blocked)
                  └─ ok → noteStore.update → base.update → reindex
```

The mention validation is the only place the app enforces referential
integrity, and it only applies to note content on submit. Task-checkbox writes
bypass it.

Deleting a note removes the note and its outgoing index record, but leaves:

- its node in any `module.noteTree`,
- bookmarks pointing to it,
- incoming links from other notes (those notes still render links to a missing
  entity; mention modals show "not found").

## 4. Building and reading a module book

```
ModuleView loads module + all related stores
  ├─ Book tab → ModuleDocumentView
  │     ├─ hidden notes for module
  │     ├─ buildChunks(tree): pre-order, inject "# title {#note-id}"
  │     ├─ QVirtualScroll renders chunks
  │     │     ├─ Bookmark (moduleId,noteId)
  │     │     └─ Markdown (anchorMap, scrollToAnchor, mention modals)
  │     └─ emits TOC + active anchor
  └─ Book Tree tab → ModuleDocumentTree
        ├─ convert tree ↔ ExtendedTreeNode
        ├─ add/edit/remove notes (hidden:true, moduleIds)
        └─ local tree watcher emits update:noteTree
              └─ ModuleView.handleSaveNoteTree → moduleStore.update(noteTree)
```

The two tabs share the same `noteTree` and the same hidden notes. Editing the
tree updates the store, and `ModuleDocumentView` watches the tree/notes and
rebuilds its chunks. The module sidebar (TOC/bookmarks) and export action are
forwarded through `BaseEntityTabView` and reachable.

## 5. Module export → import (round trip)

```
ModuleView export
  └─ collect module + all module notes (hidden and visible)
       └─ JSZip: module.json, tree.json, notes/<id>.json, summary.json
            └─ download blob

HomeView import (or ModulesView if the button were enabled)
  └─ parseModuleZip(blob)
       ├─ require module.json, tree.json, notes/
       └─ JSON.parse each note (invalid files skipped)
  └─ [ModulesView only] validateModuleImport
       ├─ missing note IDs / orphaned files / tree mismatch
       └─ ImportValidationModal
  └─ importModuleFromZip
       ├─ module keeps its original id (comment claims new id)
       ├─ notes keep ids; moduleIds := [module.id]; timestamps := now
       ├─ raw transaction puts modules + notes (no schema validation)
       └─ stores reloaded by caller (modules/notes only)
```

Consequences:

- Importing the same archive twice creates a copy instead of overwriting.
- IDs in the archive cannot collide with local records.
- Notes are indexed for mentions during import.
- The Markdown ZIP generator now uses one module ID and preserves note
  formatting.

## 6. Encounter → combat

```
EncounterView / EncountersView "Run combat"
  └─ PartySelector (encounter, isOpen)
       ├─ choose party → all characters selected
       ├─ toggle characters
       ├─ monsters expanded by encounter.monsters counts
       └─ combatStore.create({preparing, round 0, turn 0, combatants})
            └─ router.push('/combats/:id')
                 └─ CombatView
```

In `CombatView`:

- encounter and party are resolved by ID;
- an empty `preparing` combat is filled from the encounter/party template and
  persisted;
- preparing initiative edits are persisted on popup save;
- Start sorts and persists;
- turn, round, postpone, and activate transitions are persisted through
  `combatStore.update` using the pure helpers in `src/utils/combatTurn.ts`;
- End persists `status`.

Reloading mid-combat restores the current round, turn, acted/postponed flags,
and initiative order.

## 7. Party and character membership

```
PartyView
  ├─ party.characters (IDs)
  ├─ characterStore.items filtered by membership
  └─ toggle → partyStore.update(characters)
       └─ PartyCard recomputes count from its own party prop
PartySelector
  └─ reads party.characters → characterStore.getById → combatants
CombatView
  └─ resolves player combatants through referenceId → characterStore
```

Deleting a character leaves the ID in the party. `PartyView` simply doesn't
render it, but the next party update re-saves the dangling ID. Historical
combats keep the reference and display "Unknown Player".

## 8. Encounter monster membership

```
EncounterView
  ├─ encounter.monsters = { monsterId: count }
  ├─ monsterStore.items filtered by keys
  ├─ link modal → localMonsters → encounterStore.update
  └─ quantity prompt → encounterStore.update
PartySelector
  └─ Object.entries(monsters) → monsterStore.getById → N instances
```

Deleting a monster leaves the key; the encounter table hides it but the count
remains in storage and export.

## 9. Mentions and backlinks

```
noteStore.create/update
  └─ extractMentionedEntities(content)
       └─ mentionsStore.setLinks(from=note, links)
            └─ indexations_mentions[ 'note:<id>' ] = links

MentionModalStack / Mentions.vue
  └─ getLinks/getBacklinks → render names from stores
```

Only notes write the index. The four entity sidebars now read the plain entity
prop and display outgoing/backlinks correctly. `CharacterView` asks for
`kind:'character'`, but no writer ever produces character links.

## 10. Module ↔ playlist ↔ jukebox

```
PlaylistEditor.moduleIds
  └─ ModuleView.modulePlaylists filters by moduleIds
       └─ PlaylistCard → "view" → /jukebox
JukeboxView
  └─ active playlist from configStore
       ├─ playerStore.watchPlaylist → actualiseQueue
       └─ filteredTracks = playlist.trackIds → trackStore
```

There is no "play this playlist" action from the module view
(`handlePlayPlaylist` is a TODO). Clicking a playlist card only navigates to the
jukebox; the user must select the playlist there.

## 11. Backup / restore

```
HomeView Backup
  └─ backupAllStores()
       └─ zip: every object store, with Blob audio encoded as base64
HomeView Restore
  └─ restoreAllStores(zip)
       └─ for each store: clearStore() then idbPutItem() per item
  └─ page reload (refreshes every store and the player/timers)
```

FileSystem handles are written as unavailable and may need relinking. Restore
is not transactional across stores.

## 12. Shell chrome lifecycle

```
route enter
  ├─ BaseListView/BaseEntityView onMounted
  │     └─ layout.setTopMenuContent(ViewHeader)
  ├─ detail views onMounted
  │     └─ rightDrawer.set(sidebar)
  └─ JukeboxView onMounted
        ├─ rightDrawer.set(PlaylistList)
        └─ layout.setBottomDrawerContent(JukeboxPlayer)

route leave
  └─ each view onBeforeUnmount clears what it set (right drawer by owner)
```

Because these are global singleton refs, a view that forgets to clear leaves
chrome behind. `BaseEntityView` publishes a `sidepanel` slot (used by
`CharacterView` and `ModuleView`) and clears it on unmount. Right-drawer
clearing is owner-scoped, so one view cannot remove another's sidebar. The
injected header is cleared by both base wrappers.

## 13. Global timers and audio

- `playerStore` and `timerStore` are instantiated in `App.vue` and live for the
  app lifetime.
- Both use module-level/closure state (Howl instance, poll timeout).
- Navigation does not stop playback or timers.
- `pinia-shared-state` does not synchronize the Howl instance; a second tab
  has its own player but shares config (last track, volume), which can fight.

## 14. Failure propagation

There is almost no user-facing error handling:

- IndexedDB validation errors reject promises in event handlers; nothing
  catches them (except backup/import try/catch).
- Missing entities are silently skipped in lists; only note mention validation
  reports a problem.
- Store `error` refs are unread.
- `debugError` logs to console only.

The result is a UI that usually degrades to empty lists or silent no-ops rather
than explaining what went wrong.

## 15. Seams that need a contract

| Seam                     | Current state                                  | Needed contract                           |
| ------------------------ | ---------------------------------------------- | ----------------------------------------- |
| View ↔ shell chrome      | String-keyed inject/provide; unforwarded slots | Typed layout store or composable          |
| View ↔ store             | Ad-hoc loading per mount                       | Central load/cache policy                 |
| Store ↔ store            | IDs only, no integrity                         | Repository/unit-of-work + cascades        |
| Import ↔ store           | Raw transaction bypasses validation and state  | Import service that validates + refreshes |
| Player ↔ playlist        | Manual `actualiseQueue` calls                  | Reactive derived queue                    |
| Mention index ↔ entities | Only notes indexed                             | Generic indexer per entity type           |
| Modal ↔ parent           | Unused `footer`/`update:isOpen` slots          | Shared modal contract                     |
