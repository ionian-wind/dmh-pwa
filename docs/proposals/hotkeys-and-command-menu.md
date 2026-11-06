# Hotkeys and Command Menu

**Status:** proposal — not implemented.

**Priority:** P1.

**Goal:** make the app keyboard-first without making it keyboard-only. A global
shortcut layer and a searchable command menu give experienced users a fast path
while keeping every action available through the existing UI.

**References:**

- [`hotkeys-js`](https://github.com/jaywcjlove/hotkeys-js) — dependency
  candidate
- [global-and-local-search.md](global-and-local-search.md) — entity search
  results hosted by the command menu
- [`vue-cmd-menu`](https://github.com/BetaHuhn/vue-cmd-menu) — UX inspiration
- [feature-proposals.md](feature-proposals.md) — A3 and A5

---

## 1. Summary

The app currently has no global shortcut layer. Individual controls handle
their own keys, and `Esc`/modal behaviour is handled locally. A command menu
was already sketched as A3, but there is no shared registry or hotkey model.

This proposal adds:

1. a small hotkey service built on `hotkeys-js`, with scopes, input filtering,
   cleanup, conflict detection and persisted overrides;
2. a Vue 3 command menu inspired by `vue-cmd-menu`, backed by a command
   registry rather than a hard-coded list;
3. a Settings keyboard section for discovering, recording and resetting
   shortcuts;
4. an integration path where `Ctrl/Cmd+K` opens the command menu and individual
   views/modal editors register contextual commands and shortcuts.

`vue-cmd-menu` itself is **not** a dependency candidate: its README states that
it currently supports Vue 2 only, while this app uses Vue 3. We can reuse its
interaction model (top-centred overlay, fuzzy filtering, key hints, nested
actions) in a native Vue 3 component.

---

## 2. Goals and non-goals

### Goals

- One place to register global and contextual shortcuts.
- One searchable menu for navigation and actions.
- Shortcuts must not fire while typing unless explicitly allowed.
- Users can see and change bindings; defaults are discoverable.
- Commands can come from the current view or open modal.
- No action should be reachable **only** by keyboard.
- No extra network or backend requirements.

### Non-goals

- Vim-style modal editing.
- A full scripting/plugin command API in the first version.
- Mobile gesture navigation.
- Replacing existing toolbar buttons or menus.
- Browser-reserved shortcuts such as `Ctrl/Cmd+W` or `Ctrl/Cmd+T`.

---

## 3. Hotkeys

### 3.1 Dependency

Use `hotkeys-js` for capture, key normalisation, scopes and unbinding:

- no dependencies;
- roughly 3.8 kB gzipped;
- supports `ctrl`, `command`, `alt`, `shift`, special keys and key combinations;
- supports scopes and a global input filter;
- exposes `unbind` and `getAllKeyCodes` for diagnostics.

It should be imported once, in the hotkey service, not in individual
components.

### 3.2 Service model

```ts
// src/utils/hotkeys.ts

export type HotkeyScope =
  'global' | 'list' | 'editor' | 'modal' | 'jukebox' | 'ambient' | 'image';

export interface HotkeyDefinition {
  id: string;
  /** hotkeys-js syntax, e.g. 'ctrl+k, command+k'. */
  keys: string;
  scope: HotkeyScope;
  /** i18n key used in Settings and command hints. */
  labelKey: string;
  descriptionKey?: string;
  /** Optional predicate; returning false skips this binding. */
  when?: () => boolean;
  /** Allow firing inside input, textarea and contenteditable. */
  allowInInput?: boolean;
  /** Prevent the browser default when the shortcut fires. */
  preventDefault?: boolean;
  handler: (event: KeyboardEvent) => void;
}

export type UnregisterHotkey = () => void;

export function registerHotkey(definition: HotkeyDefinition): UnregisterHotkey;

export function useHotkeys(definitions: HotkeyDefinition[]): void; // registers on mount, unregisters on unmount

export function setHotkeyScope(scope: HotkeyScope): void;
export function getHotkeyScope(): HotkeyScope;
export function getHotkeyLabel(id: string): string;
export function getHotkeyConflicts(): HotkeyConflict[];
```

Implementation rules:

- Keep a `Map<id, definition>` for diagnostics and Settings.
- `hotkeys(keys, { scope }, handler)` for each binding.
- Register only once per id/scope; re-register when the effective key changes.
- `hotkeys.filter` ignores `INPUT`, `TEXTAREA`, `SELECT` and
  `[contenteditable]` by default.
- `allowInInput` bindings are registered with a dedicated scope or bypass the
  global filter only for that handler. Never disable the filter globally.
- Use `preventDefault` only for shortcuts the app owns, such as `Ctrl/Cmd+S`
  while editing. Do not swallow `Escape` inside browser-native dialogs.
- Always return an unregister function; `useHotkeys` calls it on unmount.

### 3.3 Scopes

`hotkeys-js` supports one active scope plus `all`. The app maintains a scope
stack:

- `global` is always active.
- A list view sets `list`.
- An editor sets `editor` and restores the previous scope on close.
- A modal sets `modal`; nested modals push/pop the scope.
- Jukebox/ambient/image views may set their own scope.

`useModalState` is the natural place to push/pop `modal` when the top modal
changes. Avoid each modal calling `setHotkeyScope` independently.

### 3.4 Default bindings

Keep the default set small and discoverable:

| Scope        | Keys           | Action                                 |
| ------------ | -------------- | -------------------------------------- |
| global       | `Ctrl/Cmd+K`   | Open command menu                      |
| global       | `?`            | Open shortcut help (when not typing)   |
| global       | `Esc`          | Close command menu / top modal         |
| editor       | `Ctrl/Cmd+S`   | Save the current editor                |
| list         | `/`            | Focus list search (when available)     |
| jukebox      | `Space`        | Play/pause (opt-in, not inside inputs) |
| ambient      | `Space`        | Pause/resume ambient preview (opt-in)  |
| command menu | `ArrowUp/Down` | Move selection                         |
| command menu | `Enter`        | Run selected command                   |
| command menu | `Esc`          | Close menu                             |

Avoid browser-owned combinations such as `Ctrl/Cmd+N`, `Ctrl/Cmd+T`,
`Ctrl/Cmd+W`, `Ctrl/Cmd+Shift+N` and `Ctrl/Cmd+Shift+T`.

### 3.5 Display and platform differences

- Normalise `ctrl` to `Ctrl` and `command` to `⌘` on macOS.
- Provide `Ctrl+K` / `⌘K` labels from the same definition.
- Use `navigator.userAgentData?.platform` where available, with a
  `navigator.platform` fallback and a neutral `Ctrl` default.
- Never hard-code `meta` in stored bindings; store the semantic
  `Ctrl/Cmd+K` form and expand at render time.

### 3.6 Overrides and conflicts

Store overrides in `configStore`:

```ts
hotkeyOverrides: Ref<Record<string, string>>; // hotkey id -> new keys
```

Rules:

- Defaults live in code and remain the source of truth for labels.
- An override changes only the effective keys for that id.
- Reset one binding or all bindings.
- Detect duplicate effective keys in the same scope and warn in Settings.
- Disallow a binding that is empty, malformed or reserved by the browser.
- If a user binds a key already used by another command in the same scope,
  show the conflict and let them replace or cancel.
- Persist overrides through the existing `configStore` localStorage watcher.

### 3.7 Settings UI

Add a **Keyboard** section to `SettingsDialog`:

- searchable list grouped by scope;
- current key label and description;
- **Record** button that captures the next key combination;
- **Reset** per binding and **Reset all**;
- conflict warnings;
- link to the command menu and shortcut help.

Recording must ignore modifier-only presses and show a clear “press keys”
state. Do not save while the recorder is waiting.

---

## 4. Command menu

### 4.1 Do not add vue-cmd-menu directly

The linked `vue-cmd-menu` is a Vue 2 library. Adding it to this Vue 3 app would
require a compatibility layer or a fork. Build a small native component instead:

- reuse `QDialog`, `QInput`, `QList`, `QItem`, Quasar spacing and the app's
  theme variables;
- reuse `useModalState` for focus/stack behaviour;
- reuse the command registry for actions;
- keep the first version flat with section groups; nested folders can come
  later.

The UX to borrow:

- top-centred overlay;
- strong search input with autofocus;
- grouped actions with icons and shortcut hints;
- keyboard navigation and Enter to run;
- recent commands;
- optional nested actions for create flows.

### 4.2 Command registry

```ts
// src/commands/types.ts

export interface CommandContext {
  router: Router;
  source?: 'menu' | 'hotkey' | 'view';
}

export interface Command {
  id: string;
  /** i18n key; resolved at render time so language changes are live. */
  titleKey: string;
  titleParams?: Record<string, unknown>;
  sectionKey: string;
  icon?: Component;
  keywords?: string[];
  /** Hotkey id, not a raw key string. */
  hotkeyId?: string;
  when?: () => boolean;
  run: (context: CommandContext) => void | Promise<void>;
}
```

Registry:

```ts
registerCommand(command): () => void;
registerCommands(commands): () => void;
getCommands(): Command[];
```

Rules:

- Global commands are registered once in `App.vue` or a
  `useGlobalCommands()` composable.
- A view registers contextual commands in `onMounted` and unregisters in
  `onBeforeUnmount`.
- A command should be a thin wrapper over an existing action, not a second
  implementation.
- `when` hides commands that are invalid in the current context.
- Commands with `hotkeyId` show the current binding and can be triggered from
  the menu or the hotkey service.

### 4.3 Opening the menu

- `Ctrl/Cmd+K` via the hotkey service.
- A search/command button in the app header next to the existing right-drawer
  toggle.
- Optional `?` shortcut-help entry; the command menu can also show a
  “Keyboard shortcuts” command.
- Opening the menu pushes the `modal` scope and focuses the input.
- Closing restores focus to the element that had focus before opening.

### 4.4 Menu component

```text
┌──────────────────────────────────────────────────────┐
│  Search commands…                              Esc  │
├──────────────────────────────────────────────────────┤
│  Navigation                                          │
│  Home                                               ↵ │
│  Notes                                        Ctrl+… │
│  Create                                              │
│  New note                                           │
│  New character                                      │
│  Playback                                            │
│  Play / pause jukebox                                │
│  Settings                                            │
│  Open settings                                       │
└──────────────────────────────────────────────────────┘
```

Features:

- autofocus search input;
- grouped sections with small uppercase headings;
- icons from `@tabler/icons-vue`;
- optional shortcut hint on the right;
- selected row highlight and `aria-selected`;
- empty state;
- recent commands at the top or in a separate “Recent” group;
- loading state for async commands;
- error toast if a command rejects.

### 4.5 Filtering

Start without a new dependency:

- normalise case and trim;
- exact prefix match scores highest;
- word-prefix then substring matches;
- keywords and section titles are searchable;
- recent commands get a small boost;
- show a “No commands found” state rather than an empty list.

If the command set grows large, add `fuse.js` behind the same search function.
Do not add Fuse for the first version unless measurements show a need.

### 4.6 Keyboard and accessibility

- `ArrowDown`/`ArrowUp` move the active option.
- `Home`/`End` jump to the first/last option.
- `Enter` runs the active command.
- `Escape` closes the menu without running.
- `Tab` stays inside the dialog (focus trap).
- The input uses `role="combobox"`, the list `role="listbox"`, rows
  `role="option"` and `aria-selected`.
- Announce the active command through `aria-activedescendant`.
- Restore focus on close.
- Mouse hover and keyboard selection share the same active index.

### 4.7 Command set (initial)

Global:

- Go home
- Open notes
- Open parties
- Open monsters
- Open encounters
- Open characters
- Open modules
- Open locations/maps
- Open jukebox
- Open ambient sound
- Open probability calculator
- Open timers
- Open settings
- Create note
- Create character
- Create party
- Create monster
- Create encounter
- Create location
- Toggle jukebox play/pause
- Stop ambient sound
- Backup data
- Restore data
- Open keyboard shortcuts

Contextual examples:

- Note editor: save, toggle edit/view, insert mention.
- List view: create item, toggle edit mode, focus search.
- Jukebox: play/pause, next/previous track, add folder.
- Combat: next turn, previous turn, end combat.
- Image tools (future): open, export, filters.

Create commands can navigate to the list route with a `?create=1` query or
call the same `openCreate` path used by the list. Standardise one approach so
the command does not duplicate editor-opening logic.

### 4.8 Recent commands

- Persist the last 5–10 command ids in `configStore`.
- Exclude commands whose `when` is false.
- Show recent commands first when the query is empty.
- Do not treat “recent” as a separate hidden store; ids are enough.
- Reset recent commands from Settings or the command menu footer.

---

## 5. Integration points

| Area                | Integration                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `App.vue`           | Mount `<CommandMenu />`; register global commands; push/pop scopes |
| `useModalState`     | Track top modal and manage the `modal` hotkey scope                |
| `configStore`       | Persist hotkey overrides and recent command ids                    |
| `SettingsDialog`    | Add Keyboard section and shortcut recorder                         |
| Router              | Navigation commands; create routes with a query flag               |
| Domain stores       | “Open …” and create commands; entity search later                  |
| `useLayout`         | Header command/search button beside the right-drawer toggle        |
| `BaseModal`         | Ensure Escape closes the top modal once, not every stacked modal   |
| `@tabler/icons-vue` | Command icons                                                      |
| i18n                | All titles, sections, hints and errors                             |

Suggested files:

```text
src/utils/hotkeys.ts
src/composables/useHotkeys.ts
src/commands/types.ts
src/commands/registry.ts
src/commands/globalCommands.ts
src/components/command-menu/CommandMenu.vue
src/components/command-menu/CommandMenuInput.vue
src/components/command-menu/CommandMenuList.vue
src/components/command-menu/CommandShortcut.vue
src/components/settings/HotkeySettings.vue
```

---

## 6. Testing

### Unit

- `registerHotkey()` returns an unregister function and removes only its id.
- scopes: global bindings remain active; modal/editor bindings do not leak.
- input filtering: shortcuts do not fire in inputs, textareas or
  contenteditable; `allowInInput` does.
- `preventDefault` is applied only when requested.
- conflict detection reports duplicates within a scope.
- override persistence and reset.
- command registry add/remove and `when` filtering.
- command search scoring and recent boost.
- keyboard navigation wraps at the ends.
- async command success/failure states.

### Component / integration

- `Ctrl/Cmd+K` opens the menu and focuses the input.
- typing filters; Enter navigates; Escape closes and restores focus.
- context commands appear only in their view.
- a shortcut does not fire while typing in a text field.
- Settings recorder saves, resets and warns on conflict.
- top modal scope is restored after nested modals close.

### E2E

- Open the app, press `Ctrl/Cmd+K`, type “notes”, press Enter, assert the
  notes route.
- Type into a note editor and press a single-letter shortcut; assert the
  editor receives the character.
- Override a shortcut in Settings, reload, and verify the new binding works.
- Open a modal over a list and verify the list shortcut no longer fires.

---

## 7. Bundle and performance

- `hotkeys-js` is roughly 3.8 kB gzipped and dependency-free; it can live in
  the main bundle.
- `CommandMenu.vue` can be dynamically imported or loaded with the app shell;
  measure before introducing a separate chunk.
- Command filtering over a few dozen commands is trivial; avoid a fuzzy-search
  dependency until the set grows.
- Hotkey registration is event-driven and has no render-loop cost.
- Do not register a shortcut per list row or per entity card.

---

## 8. Phases

### Phase 1 — hotkey service

- Add `hotkeys-js` and the registry.
- Register `Ctrl/Cmd+K` to open a placeholder command menu.
- Add input filtering, cleanup and a basic scope stack.
- Add unit tests.

### Phase 2 — command menu MVP

- Command registry and global navigation commands.
- Top-centred dialog, search, sections, keyboard navigation, focus restore.
- Header command button.
- i18n and accessibility attributes.

### Phase 3 — actions and context

- Create commands and editor save.
- Contextual commands from notes, lists, jukebox, combat.
- Recent commands.
- Async command loading/error states.

### Phase 4 — customization

- Settings Keyboard section and recorder.
- Overrides, reset, conflict warnings.
- Shortcut help view.
- E2E coverage for persistence and input filtering.

---

## 9. Risks and open questions

| Risk                               | Mitigation                                        |
| ---------------------------------- | ------------------------------------------------- |
| Shortcut conflicts with browser/OS | stay within safe defaults; detect conflicts       |
| Shortcuts firing while typing      | global input filter; explicit per-binding opt-in  |
| Nested modal scope bugs            | central scope stack in `useModalState`            |
| Command menu becoming a second UI  | commands call existing actions only               |
| Accessibility regressions          | combobox/listbox roles, focus trap, focus restore |
| i18n drift                         | title/section keys resolved at render time        |
| Mobile users                       | keep all actions in normal UI; menu is optional   |
| `Escape` double handling           | one owner per layer; stop propagation carefully   |

Open questions:

- Should create commands navigate with `?create=1` or use a shared command
  event/state?
- Should the command menu include live entity search in phase 1, or only
  actions? See [global-and-local-search.md](global-and-local-search.md).
- Do we need nested command folders, or are flat sections enough?
- Should `?` open shortcut help globally, or only inside the command menu?
- Which combat/jukebox shortcuts are valuable enough to enable by default?

---

## 10. Acceptance criteria

- `Ctrl/Cmd+K` opens a searchable command menu from every main view.
- A user can navigate to notes with the keyboard only, and the same action
  remains available from the normal UI.
- Shortcuts do not fire in text inputs unless explicitly allowed.
- Modal and view scopes are restored correctly after closing.
- Global and contextual commands unregister cleanly on unmount.
- Users can see and change default bindings in Settings; conflicts are
  reported.
- The command menu is keyboard-accessible, has a focus trap and restores focus.
- The feature works without a network connection.
- All text is localized in English and Russian.
