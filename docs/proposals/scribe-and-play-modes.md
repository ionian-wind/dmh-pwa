# Scribe and Play Modes

**Status:** proposal — not implemented.

**Priority:** P1.

**Goal:** give the app two complementary working modes without splitting the
data model:

- **Scribe** — preparing for a session: write notes, organize modules and
  locations, build characters, parties, monsters and encounters, configure
  ambience and playlists.
- **Play** — running the session: find and use prepared content quickly, run
  combat and timers, open scenes and maps, capture notes, and search across the
  campaign.

**Important:** Play is a **lens**, not a separate application or permission
level. The user can still edit, create and manage data in Play mode; Scribe
simply makes preparation primary, while Play makes session-time actions
primary.

---

## 1. Current state

- The app has one navigation and one Home dashboard aimed mainly at
  preparation.
- All major domains are already implemented: notes, modules, characters,
  parties, monsters, encounters, combats, maps/locations, timers, jukebox and
  ambient sound.
- The command-menu and global-search proposals provide the fast access Play
  needs.
- There is no persisted notion of what the user is doing (preparing vs running).

## 2. Product principles

1. **One data model.** Modes change navigation, defaults and emphasis, not
   records, stores or routes.
2. **No locked doors.** Every Scribe action remains reachable in Play, usually
   through a secondary “Manage” affordance.
3. **Play is optimized for speed.** Search, recent items, pinned encounters,
   active combat, timers and scene controls come first.
4. **Scribe is optimized for depth.** Editors, lists, import/export and
   configuration stay in their familiar places.
5. **Mode is persistent but easy to change.** Remember the last mode, but make
   switching one click and never block content behind it.
6. **No duplicate views.** Reuse existing detail/list/editor components; mode
   only changes the shell and the home dashboard.

## 3. Mode model

```ts
// src/utils/configStore.ts
export type AppMode = 'scribe' | 'play';

appMode: Ref<AppMode>; // first launch: 'scribe'; last mode is restored
```

- Persisted through the existing config-store localStorage watcher.
- Optional later: per-device default in Settings.
- A small `useAppMode()` composable exposes `mode`, `isPlay`, `isScribe`,
  `setMode()`.
- Switching modes does not navigate away or close an editor. The current route
  stays valid.
- The shell should remember the last route per mode only if that feels useful;
  do not implement it in the first version.

## 4. Navigation

### Scribe

The current navigation stays essentially unchanged:

- Home / Scribe dashboard
- Notes
- Characters
- Parties
- Monsters
- Encounters
- Modules
- Maps / Locations
- Tools (Jukebox, Ambient, Dice calculator, Timers)
- Settings, Help

### Play

Play promotes session tools and demotes authoring:

- **Session** (Play dashboard)
- **Search** (global entity search)
- **Combat** (active combat or encounter launcher)
- **Timers**
- **Scenes** (ambient/jukebox quick controls)
- **Notes** (quick capture and recent notes)
- **Reference** (characters, parties, monsters, locations)
- **Manage** (the full Scribe navigation, including editors and settings)

The same routes are reused. Play navigation is a filtered/reordered projection
of the existing routes, not a second route tree.

## 5. Play dashboard

The Play Home replaces the entity-count Home when `appMode === 'play'`.

```text
┌──────────────────────────────────────────────────────────────┐
│ Session                                      [Scribe | Play] │
├──────────────────────────────────────────────────────────────┤
│ [Search campaign…]                                           │
│                                                              │
│ Active combat            Running timers                      │
│ Round 3, turn 2          “Torch” 08:42                       │
│ [Open combat]            [Open timers]                       │
│                                                              │
│ Pinned for this session                                      │
│ • The Sunken Crypt encounter                                 │
│ • Harbour district map                                       │
│ • Rainy tavern ambience                                      │
│                                                              │
│ Recent notes             Party                               │
│ • Session 12 notes       • The Lantern Club                  │
│ • Mira Voss              • 4 characters                      │
│                                                              │
│ Quick actions                                                │
│ [+ Quick note] [Start encounter] [Open jukebox]              │
└──────────────────────────────────────────────────────────────┘
```

Initial widgets:

- **Active combat** if one exists; otherwise a compact “Start encounter”
  launcher.
- **Running timers** with remaining time.
- **Pinned session items** (encounters, locations, scenes, notes).
- **Recent notes** (last edited, mode-independent).
- **Party** summary.
- **Quick actions**: quick note, start encounter, open scenes, open search.

Pinned items can start as a simple list in `configStore` or a future
`SessionSettings` record. Avoid a new entity store in the first phase.

## 6. Scribe dashboard

Keep the current Home layout with small adjustments:

- add the mode switcher;
- add “Start Play” / “Resume session” shortcut;
- show active combat/timers as “currently running” but keep preparation links
  primary;
- keep backup/restore and import module actions.

Scribe does not need a new dashboard implementation; it can remain the current
Home view with mode-aware labels.

## 7. Shared editing in Play

Play should not become read-only.

- Detail pages keep **Edit** buttons.
- List views keep create/edit actions, but they move into an overflow menu or
  “Manage” section.
- Quick capture opens the existing note editor.
- The command menu exposes both session actions and management commands.
- A clear “Manage” section in the Play drawer prevents hunting for editors.
- If the user opens an editor from Play, it behaves exactly as in Scribe.

## 8. Mode switcher

- Place a compact `QBtnToggle` in the header or drawer footer:
  **Scribe | Play** with book/play icons.
- On mobile, use an icon-only toggle with an accessible label.
- Persist the choice immediately.
- Optionally show a one-time tooltip explaining that Play is a session-focused
  view, not a separate account or data set.
- Add a command-menu action: “Switch to Scribe / Play”.
- Add a Settings preference only if users ask for a fixed default.

## 9. Integration with search and command menu

Play depends on fast retrieval:

- Global search opens from the Play dashboard and `Ctrl/Cmd+K`.
- Empty search state shows recent notes, pinned session items and common
  actions.
- Entity results open the existing routes; edit actions remain available.
- The command menu is mode-aware:
  - Scribe: create/organize/import actions first.
  - Play: combat, timers, scenes, search and quick-capture actions first.
  - Both modes expose the full command set through sections or “Manage”.
- See [global-and-local-search.md](global-and-local-search.md) and
  [hotkeys-and-command-menu.md](hotkeys-and-command-menu.md).

## 10. Data and routing

- No schema migration is required for the first version.
- `appMode` lives in `configStore` (localStorage).
- Existing routes stay stable; deep links always work regardless of mode.
- Do **not** create `/scribe/*` and `/play/*` duplicates.
- If a mode-specific dashboard route is desired, use `/` with a mode-aware Home
  component rather than a second route tree.
- Optional later: a `sessions` store for session title/date/pins/checklist;
  this proposal does not require it.

## 11. Implementation sketch

```text
src/composables/useAppMode.ts
src/components/AppModeToggle.vue
src/components/play/PlayDashboard.vue
src/components/play/SessionCombatCard.vue
src/components/play/SessionTimersCard.vue
src/components/play/SessionPinnedCard.vue
src/components/play/SessionRecentNotes.vue
src/components/play/SessionQuickActions.vue
```

Shell changes:

- `App.vue` computes drawer sections from `mode`.
- `HomeView.vue` renders the current Scribe dashboard or `PlayDashboard`.
- Command registry exposes `mode` in command `when` predicates.
- `configStore` adds `appMode`.

Suggested menu model:

```ts
interface NavItem {
  id: string;
  labelKey: string;
  icon: Component;
  route: string;
  modes: AppMode[]; // ['scribe', 'play'] for shared items
  section: 'session' | 'content' | 'tools' | 'manage';
}
```

This keeps navigation declarative and avoids duplicating templates.

## 12. Phases

### Phase 1 — mode state and shell

- Add `appMode` to `configStore`.
- Add `useAppMode()`, header toggle and i18n strings.
- Make the drawer mode-aware while keeping all routes.
- Add the mode-aware Home switch (Play dashboard can start as a compact
  placeholder).

### Phase 2 — Play dashboard MVP

- Active combat and timers cards.
- Recent notes and party summary.
- Pinned session items (encounters, locations, scenes, notes).
- Quick actions: quick note, start encounter, open scenes.

### Phase 3 — session workflows

- Encounter → combat launch from Play.
- Scene/jukebox/ambient controls surfaced on the dashboard.
- Quick capture and recent notes behavior tuned for the table.
- Manage section for full authoring.
- Mode-aware command menu and search results.

### Phase 4 — polish

- Remember last route per mode (optional).
- Session title/date/pins record (optional).
- Settings default mode.
- Keyboard shortcuts for switching mode and opening Play search.
- Responsive and accessibility pass.

## 13. Acceptance criteria

- The mode switcher persists `Scribe` / `Play` across reloads.
- First launch defaults to Scribe; the last-used mode is restored afterwards.
- Play shows a session-focused dashboard and navigation without breaking any
  existing route.
- All Scribe actions remain reachable in Play; no data is read-only.
- Existing editors, lists, detail pages and backup/restore behave identically
  in both modes.
- Search and quick capture are available from Play.
- The mode is a view preference only; no data is copied, filtered or hidden
  permanently.
- English and Russian labels are complete.
- Keyboard and mobile navigation remain usable.

## 14. Non-goals

- A player-facing or shared-campaign mode.
- Permissions, roles or read-only access.
- Separate databases or stores per mode.
- Duplicated routes or components per mode.
- Automatically starting/ending a session when switching modes.
- Full session-log/timeline implementation in the first version.

## 15. Risks and open questions

| Risk                                  | Mitigation                                                         |
| ------------------------------------- | ------------------------------------------------------------------ |
| Users think Play hides data           | clear mode label, Manage section, no route/data restrictions       |
| Two navigation models drift           | one declarative nav config with `modes` metadata                   |
| Duplicate dashboards                  | reuse cards and existing stores; only the composition changes      |
| Feature creep into session management | keep phase 1 to mode state + shell + dashboard                     |
| Command menu becomes mode-confusing   | grouped sections; both modes can search/run everything             |
| Editing in Play is too prominent      | move authoring actions behind Manage/overflow, keep them one click |
| Mobile clutter                        | compact icon toggle; dashboard cards collapse or scroll            |

Open questions:

- Should Play hide creation buttons by default or only demote them?
- Should pinned session items be a simple `configStore` list or a future
  `sessions` entity?
- Should the app remember a separate last route for each mode?
- Should switching to Play automatically surface the active combat when one
  exists?
- Do we need a “session active” state, or is Play simply a UI mode?
- Should first-run default be Scribe? (Current proposal: yes; later launches
  restore the last-used mode.)

## 16. References

- [feature-proposals.md](feature-proposals.md) — A1 session dashboard, A3
  command menu, A5 hotkeys.
- [global-and-local-search.md](global-and-local-search.md) — Play search.
- [hotkeys-and-command-menu.md](hotkeys-and-command-menu.md) — command menu and
  mode-aware shortcuts.
