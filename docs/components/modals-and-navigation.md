# Modals, Dialogs, and Navigation Chrome

This part covers the modal stack, promise-based dialogs, the shared modal shell,
and the shell regions used to inject page chrome.

## Modal shell (`BaseModal.vue`)

Props:

| Prop                                          | Default   | Meaning                                                |
| --------------------------------------------- | --------- | ------------------------------------------------------ |
| `isOpen`                                      | required  | Visibility                                             |
| `modalId`                                     | required  | Stack identity                                         |
| `title`                                       | —         | Header text/translation key                            |
| `showSubmit` / `showCancel`                   | —         | Action buttons                                         |
| `showDelete`                                  | —         | Standard delete action (editing existing entities)     |
| `submitLabel` / `cancelLabel` / `deleteLabel` | —         | Override labels                                        |
| `showClose`                                   | —         | Whether the header exists (combined with title/expand) |
| `showExpand` / `isExpanded`                   | —         | Maximize toggle                                        |
| `disableSubmit`                               | —         | Disable submit button                                  |
| `tabs`                                        | —         | Header tab definitions (`{ name, title, icon }`)       |
| `activeTab`                                   | first tab | Controlled active tab                                  |
| `useModalStack`                               | `true`    | Set `false` for pickers nested inside another modal    |
| `fillContent`                                 | `false`   | Make the body fill the remaining card height           |

Emits: `submit`, `cancel`, `delete`, `update:activeTab`, `update:isOpen`,
`update:isExpanded`.

Header slots include `header-actions` on the right and `header-left-actions`
next to the expand control. When `tabs` is provided, `BaseModal` renders the
tabs inside the header toolbar, centered between the expand/close controls, and
renders the matching named slot as the dialog body. The text title is hidden while tabs are shown. A tab
definition is:

```ts
{
  name: string;   // named-slot key
  title?: string; // tooltip/accessible label
  label?: string; // fallback visible label
  icon?: Component;
}
```

Tab content uses named slots (`<template #main>`, `<template #links>`, …). The
default slot is used only when no tabs are supplied.

`useModalStack: false` keeps a dialog outside the global modal stack. Use it for
a picker dialog that opens from inside another `BaseModal` (for example the
`EntitiesLinking` search modal), so the parent dialog stays mounted.

### Editor action buttons (required)

Every entity editor dialog must expose **Delete**, **Cancel**, and **Save** from
the standard `BaseModal` action area:

- Pass `showSubmit`, `showCancel`, and `showDelete` to `BaseModal`.
- Use `showDelete` only when editing an existing entity; new entities have
  nothing to delete yet.
- Handle `@delete` in the editor and emit the entity id to the parent.
- Do **not** place a delete button inside the dialog body or a custom content
  section. Custom `#actions` content is reserved for non-standard actions.

Entity editors must also follow the layout and tab requirements in
[editor-dialog-pattern.md](../architecture/editor-dialog-pattern.md).

Behavior:

- Uses `useModalState().openModal/closeModal` on mount, on `isOpen` change, and
  on unmount.
- `actuallyOpen = props.isOpen && currentModalId === props.modalId`; only the
  top of the global modal stack stays visible. This allows nested modals.
- `QDialog` is `persistent` (no backdrop/escape close).
- Body is a `<form @submit.prevent>`, so Enter submits.
- Header is shown when there is a title, header-actions slot, expand, or close.
- Close button always emits `cancel`.
- `showClose: false` hides the X button; otherwise it renders whenever the
  modal has a header.
- The dialog is read-only-computed for `v-model`; Quasar cannot write it closed,
  but `persistent` prevents user-initiated close anyway.
- `footer`, `footer-center` and `actions` slots render before the standard
  action buttons. `footer-center` is absolutely centered in the action bar, so
  dialogs can keep their primary actions on the right while showing a centered
  control (for example `EntityInfoDialog`'s View/Edit switch).
  `update:isOpen` is emitted when the shell requests closing.

### Nested-modal support

`useModalState` maintains:

```ts
modalStack: string[]
mentionModalStack: { modalId, entity, kind }[]
```

`openModal` pushes only if not already at the top; `closeModal` pops only the
top (otherwise removes all occurrences). `currentModalId` is the top.

## Mention modals

`MentionModalStack.vue` is mounted once in `App.vue`:

- Shows the top mention modal when its `modalId` is current. The entity title is
  rendered inside the dialog body using the same `entity-page-title` heading
  markup as entity detail pages.
- Renders note content as `Markdown` with `enableMentionModal`, so links inside
  the modal can open further entity modals.
- Body content reuses `EntityMainContent`, mirroring the entity view's main
  information tab (note markdown/drawing preview, party/location
  description, pawn/character notes, encounter description) without tabs or
  sidebar. Unknown/missing entities show "not found".
- When the mentioned entity kind has a detail route, an `IconExternalLink`
  header action closes the modal and navigates to that entity view.
- `openMentionModal` has a special case: if the newly requested entity equals
  the entity two levels down, it closes the current modal (acts like "back").

## Promise dialogs (`src/dialogs/`)

Thin wrappers around Quasar `Dialog`:

```ts
alert(message, options?): Promise<void>
confirm(message, options?): Promise<boolean>
confirmUnsavedChanges(message?): Promise<'save' | 'discard' | 'cancel'>
prompt(message, options?): Promise<string | null>
```

`confirmUnsavedChanges` (in `src/dialogs/unsavedChanges.ts`) opens
`UnsavedChangesDialog.vue` through Quasar's custom-component dialog API. It
offers **Save**, **Do not save**, and **Cancel** and is used by the shared
`useEntityEditMode` navigation guard on note, character, party, pawn, encounter
and location detail pages. The custom component is imported directly instead of being re-exported
from the `src/dialogs` barrel, so normal confirm/alert users do not load it.

All use `persistent: true`. Default labels come from Vue I18n (`common.ok`,
`common.cancel`, `common.confirm`, `common.alert`, `common.prompt`) and can be
overridden per call.

Caveats:

- Options are spread **after** the explicit config, so `ok`, `cancel`,
  `persistent`, etc. can be overridden accidentally if present in options.
- `prompt` passes `model` and `type` but no validation.
- `alert`/`confirm` resolve only on OK/cancel; persistent prevents dismissal
  without a choice.
- The wrappers are not typed to Vue I18n; callers pass translated strings.

## Right drawer and footer layout

`App.vue` calls `provideLayout()`; consumers use:

```ts
useLayout(); // typed topMenu/rightDrawer/bottomDrawer state
useRightDrawer(); // owner-scoped set/clear for the right drawer
```

Consumers:

| View                               | Right drawer                    | Footer               | Header       |
| ---------------------------------- | ------------------------------- | -------------------- | ------------ |
| Any list view (`BaseListView`)     | —                               | —                    | `ViewHeader` |
| Any entity view (`BaseEntityView`) | `#sidepanel` when supplied      | —                    | `ViewHeader` |
| `NoteView`                         | `NoteViewSidebar`               | —                    | `ViewHeader` |
| `PartyView`                        | `PartyViewSidebar`              | —                    | `ViewHeader` |
| `PawnView`                         | `PawnViewSidebar`               | —                    | `ViewHeader` |
| `EncounterView`                    | `EncounterViewSidebar`          | —                    | `ViewHeader` |
| `CombatView`                       | `EncounterViewSidebar` (scenes) | —                    | `ViewHeader` |
| `CharacterView`                    | `CharacterViewSidebar`          | —                    | `ViewHeader` |
| `LocationView`                     | `#sidepanel` (map sidebar)      | —                    | `ViewHeader` |
| `AmbientSoundView`                 | `SoundPackSidebar`              | `AmbientPlayerPanel` | `ViewHeader` |
| `JukeboxView`                      | `PlaylistList`                  | `JukeboxPlayer`      | `ViewHeader` |
| `ProbabilityCalculatorView`        | `CodeLibraryPanel`              | —                    | `ViewHeader` |

Entity detail pages render their title/subtitle in the page content. The
`ViewHeader` in `#main_header` hosts page tabs, actions and the right-drawer
toggle.

- The right drawer is owner-scoped: only the view that set the content can
  clear it.
- `NotesView` does not touch another view's drawer.
- Views that set a footer (`JukeboxView`, `AmbientSoundView`) clear both the
  right drawer and the bottom drawer on unmount. The others clear the right
  drawer only.

Because the drawer content is a global singleton, navigating between pages
relies on each view clearing its content. `BaseEntityView` publishes its
`sidepanel` slot for views that need one (`LocationView`) and clears it on
unmount. Detail views that own a dedicated sidebar component set and clear the
drawer directly.

## Settings dialog

`SettingsDialog.vue` is a `BaseModal` opened from the left navigation’s
Settings item. It currently has three sections:

- **Interface**
  - **Language** — the `LanguageSwitcher` (`en` / `ru`), persisted in
    `configStore.savedLanguage`; Quasar’s locale follows the selection.
  - **UI theme** — `QBtnToggle` with **Light** (default), **Dark** and
    **Auto**. Persisted in `configStore.uiTheme`; `auto` follows the OS
    `prefers-color-scheme` setting.
  - **Confirm deletion** — default `true`. When off, `confirm()` resolves
    `true` immediately without opening a confirmation dialog.
  - **Expand menu** — default `true`. When on, hovering the left menu expands it
    from icons to labels. When off, the menu stays mini and only shows icons;
    each item exposes its label as a native `title` tooltip. When Expand menu is
    off, the Tools item stacks a small chevron under the wrench and still
    toggles the tools group. Hovering out of an expandable menu keeps the normal
    side chevron.
- **Player**
  - Smooth track change.
  - Animate player background.
  - Display cover while playing.
  - Show player dialog (off → the Jukebox menu item opens `/jukebox`). This
    only controls the music player dialog, not future ambient controls.
- **Content**
  - **Storage** — reports usage/quota, file counts by source kind, unavailable
    records and whether the origin has persistent storage. The **Request**
    button calls `navigator.storage.persist()` and shows whether the browser
    granted it; a denial links to the help center pages for installing the app
    and reviewing site settings.
  - **Reconnect files** — appears when records are unavailable or a handle
    permission was lost. Picks replacements and relinks them by record ID.
  - **Move large files to OPFS** — appears when IndexedDB still has Blob-backed
    records; migrates them to the origin-private file system.
  - **Include linked files in backups** — opt-in copy of external File System
    Access files into backup archives.
  - **Clear storage** — danger button. Always asks for confirmation, even when
    Confirm deletion is off. Confirming deletes all IndexedDB databases, OPFS
    files, `localStorage`, `sessionStorage`, cookies, Cache Storage and service
    worker registrations, then reloads the app at the main page.

The player toggles mirror the persisted options used by the jukebox player.
The dialog closes through the modal cancel/close path and emits
`update:modelValue`.

## Bottom sheets

`SoundControlDialog.vue` and `CalculatorView.vue` are `QDialog position="bottom"`
with `useDragSnap`:

- Drag the toolbar; the card follows the pointer.
- Dragging up more than 200px leaves it open; otherwise it snaps back.
- `transitionHide` switches between `fade` and default based on drag offset.
- `SoundControlDialog` has a docked bottom-panel mode and a floating dialog
  mode. Dragging it up from the bottom switches to the floating layout; dragging
  it back near the viewport bottom docks it again. The transition begins as
  soon as the drag crosses the detach/dock threshold. Detaching happens after a
  5 px upward drag; docking uses a 10 px snap area measured from the dialog's
  bottom edge, and only becomes active after the dialog leaves that area.
  Docking ends the drag gesture. On detach, the floating dialog's header centre
  is placed under the pointer. In dialog mode the card can be moved freely
  across the page.
- Both are opened from the left nav and are mounted for the app lifetime.

## Toast notifications

`Notify` is registered globally. The timer store uses it for completions:

```ts
Notify.create({
  color: 'secondary',
  textColor: 'primary',
  position: 'top',
  timeout: 0,
  closeBtn: true,
});
```

These notifications never auto-dismiss (`timeout: 0`).

## Navigation chrome summary

- **Header**: injected per route; Delete sits at the far left, while
  create/edit/custom actions stay on the right.
- **Left drawer**: primary navigation, collapsible Scribe and Tools groups, and
  the jukebox/dice shortcuts.
- **Right drawer**: contextual sidebar (mentions, scene links, TOC, playlists).
- **Footer**: only the jukebox player.
- **Overlays**: PWA status/install, mention modals, calculator, jukebox dialog.

## Known issues

- Modals are all `persistent`, so users cannot escape with the backdrop or Esc.
- `BaseEntityTabView` declares `tab-close`/`tab-add` events that are not
  emitted by its current tab bar.
- The right drawer is a global singleton, but clearing is owner-scoped via
  `useRightDrawer()`.
