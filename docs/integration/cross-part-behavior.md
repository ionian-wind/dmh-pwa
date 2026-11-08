# Cross-Part Behavior

This document connects the individual parts. It explains the end-to-end flows
that span stores, views, the shell, and persistence, and highlights where the
seams are broken.

## 1. App boot → first useful screen

```
index.html
  └─ main.ts
       ├─ initializeDatabase()             (openDB, migrations)
       ├─ registerFileReferences()
       ├─ createPinia + PiniaSharedState
       ├─ router (HomeView/NotFound eager; feature routes lazy)
       ├─ useConfigStore()                 (localStorage)
       ├─ i18n (locale 'ru', fallback 'en'; savedLanguage on change)
       ├─ setupAnchorScrollHandler()
       ├─ VueDnDKit, Quasar (Notify, Dialog), Vue3OpenLayers
       └─ App.vue
            ├─ feature navigation (primary/tools/footer, sorted by order)
            ├─ feature globals  (e.g. JukeboxGlobal → playerStore.init())
            ├─ timers nav item  (timerStore.init())
            └─ router-view → HomeView
                 └─ enabled feature home cards (sorted by order)
                      └─ Promise.all(card.load())
```

Every route view then loads its own stores again. There is no shared
"load once" bootstrap; `load()` is called per view mount and replaces the whole
array. In a session that visits several routes, IndexedDB is read repeatedly.
Home cards are feature-owned definitions with Tabler icon components and an
`order`; `HomeView` sorts them and `StatCard` renders the icon, count and
translated label.

## 2. Creating a note (list flow)

```
NotesView "create" button
  └─ BaseListView opens NoteEditor with note=null
       └─ NoteEditor (Main editor / Linked entities tabs) collects
          title/content + tags/type (Milkdown emits Markdown)
            └─ submit → NotesView.handleSubmit
                 └─ noteStore.create(note)
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
NoteView loads (notes, mentions, parties, pawns, encounters)
  └─ resolves note by route id
       ├─ read view: Markdown renders; task checkboxes can emit update:content
       │     └─ handleMarkdownContentChange → noteStore.update(content)
       └─ View/Edit switch → useEntityEditMode draft
             └─ save → validate every mention against its store
                  ├─ missing → validationError rendered in the Main tab
                  │            (save blocked)
                  └─ ok → noteStore.update → base.update → reindex
```

Note detail uses the shared inline edit mode (Main editor/Linked entities tabs)
rather than a modal editor. The mention validation is the only place the app
enforces referential integrity, and it only applies to note content on submit.
Task-checkbox writes bypass it. Character, party, pawn, encounter and location
detail pages use the same `useEntityEditMode` lifecycle.

Deleting a note removes the note and its outgoing index record, but leaves:

- bookmarks pointing to it,
- incoming links from other notes (those notes still render links to a missing
  entity; mention modals show "not found").

## 4. Encounter → combat

```
EncounterView / EncountersView "Run combat"
  └─ PartySelector (encounter, isOpen)
       ├─ choose party → all characters selected
       ├─ toggle characters
       ├─ pawns expanded by encounter.pawns counts
       └─ combatStore.create({preparing, round 0, turn 0, combatants})
            └─ router.push('/combats/:id')
                 └─ CombatView
```

In `CombatView`:

- encounter and party are resolved by ID;
- the right drawer is the encounter sidebar with `scenesOnly: true`, so combat
  exposes the encounter's scene player without the pawn/mention tabs;
- the toolbar action on the left adds a participant (via `EntityLinkingDialog`
  with inline initiative inputs); the action on the right starts the combat in
  preparing or ends it while active; the phase stepper shows
  preparing/active/completed;
- clicking a combatant opens the shared `EntityInfoDialog` for the linked
  character or pawn;
- an empty `preparing` combat is filled from the encounter/party template and
  persisted;
- preparing initiative edits are persisted on popup save;
- Start sorts and persists;
- turn, round, postpone, and activate transitions are persisted through
  `combatStore.update` using the pure helpers in `src/utils/combatTurn.ts`;
- End persists `status`.

Reloading mid-combat restores the current round, turn, acted/postponed flags,
and initiative order.

## 5. Party and character membership

```
PartyView
  ├─ party.characters (IDs)
  ├─ view Links tab → EntityViewLinks (characters + unrelated note links)
  └─ edit Links tab → EntitiesLinking character → draft.characters
       └─ save → partyStore.update(characters)
            └─ PartyCard recomputes count from its own party prop
PartySelector
  └─ reads party.characters → characterStore.getById → combatants
CombatView
  └─ resolves player combatants through referenceId → characterStore
```

Deleting a character leaves the ID in the party. `PartyView` simply doesn't
render it, but the next party update re-saves the dangling ID. Historical
combats keep the reference and display "Unknown Player".

## 6. Encounter pawn membership

```
EncounterView
  ├─ encounter.pawns = { pawnId: count }
  ├─ pawnStore.items filtered by keys
  ├─ link modal → localPawns → encounterStore.update
  └─ quantity prompt → encounterStore.update
PartySelector
  └─ Object.entries(pawns) → pawnStore.getById → N instances
```

Deleting a pawn leaves the key; the encounter table hides it but the count
remains in storage and export.

## 7. Mentions and backlinks

```
noteStore.create/update
  └─ extractMentionedEntities(content)
       └─ mentionsStore.setLinks(from=note, links)
            └─ indexations_mentions[ 'note:<id>' ] = links

MentionModalStack / Mentions.vue
  └─ getLinks/getBacklinks → render names from stores
```

Only notes write the index. The five entity sidebars (note, character, party,
pawn, encounter) read the plain entity prop and display outgoing/backlinks.
`CharacterView` asks for `kind: 'character'`, but no writer ever produces
character links.

## 8. Backup / restore

```
HomeView Backup
  └─ backupAllStores({ includeExternalFiles: configStore.backupIncludeExternalFiles })
       └─ zip: every object store, with file metadata/binary entries
HomeView Restore
  └─ restoreAllStores(zip)
       └─ for each store: clearStore() then idbPutItem() per item
  └─ page reload (refreshes every store and the player/timers)
```

FileSystem handles are written as unavailable and may need relinking. Restore
is not transactional across stores.

## 9. Shell chrome lifecycle

```
route enter
  ├─ BaseListView/BaseEntityView onMounted
  │     └─ layout.setTopMenuContent(ViewHeader)
  ├─ detail views onMounted
  │     └─ rightDrawer.set(sidebar)
  ├─ JukeboxView onMounted
  │     ├─ rightDrawer.set(PlaylistList)
  │     └─ layout.setBottomDrawerContent(JukeboxPlayer)
  └─ AmbientSoundView onMounted
        ├─ rightDrawer.set(SoundPackSidebar)
        └─ layout.setBottomDrawerContent(AmbientPlayerPanel)

route leave
  └─ each view onBeforeUnmount clears what it set (right drawer by owner)
```

Because these are global singleton refs, a view that forgets to clear leaves
chrome behind. `BaseEntityView` publishes a `sidepanel` slot (used by
`LocationView`) and clears it on unmount. Right-drawer
clearing is owner-scoped, so one view cannot remove another's sidebar. Combat
reuses `EncounterViewSidebar` with `scenesOnly: true`. The injected header is
cleared by both base wrappers.

## 10. Global timers and audio

- `playerStore` is initialized by the jukebox feature global (`JukeboxGlobal`,
  mounted from `featureGlobals`), and `timerStore` by the timers navigation item
  (`TimersNavItem`); both live for the app lifetime.
- Both use module-level/closure state (Howl instance, poll timeout).
- Navigation does not stop playback or timers.
- `pinia-shared-state` does not synchronize the Howl instance; a second tab
  has its own player but shares config (last track, volume), which can fight.

## 11. Failure propagation

There is almost no user-facing error handling:

- IndexedDB validation errors reject promises in event handlers; nothing
  catches them (except backup/import try/catch).
- Missing entities are silently skipped in lists; only note mention validation
  reports a problem.
- Store `error` refs are unread.
- `debugError` logs to console only.

The result is a UI that usually degrades to empty lists or silent no-ops rather
than explaining what went wrong.

## 12. Seams that need a contract

| Seam                     | Current state                                                       | Needed contract                           |
| ------------------------ | ------------------------------------------------------------------- | ----------------------------------------- |
| View ↔ shell chrome      | Typed layout store; base wrappers forward slots                     | Explicit lifecycle per route view         |
| View ↔ store             | Ad-hoc loading per mount                                            | Central load/cache policy                 |
| Store ↔ store            | IDs only, no integrity                                              | Repository/unit-of-work + cascades        |
| Import ↔ store           | Raw transaction bypasses validation and state                       | Import service that validates + refreshes |
| Player ↔ playlist        | Manual `actualiseQueue` calls                                       | Reactive derived queue                    |
| Mention index ↔ entities | Only notes indexed                                                  | Generic indexer per entity type           |
| Modal ↔ parent           | Mixed slot/prop contracts; footer and `update:isOpen` now supported | Shared modal contract                     |
