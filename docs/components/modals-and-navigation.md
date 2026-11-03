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

Emits: `submit`, `cancel`, `delete`, `update:activeTab`, `update:isOpen`,
`update:isExpanded`.

When `tabs` is provided, `BaseModal` renders the tabs inside the header toolbar,
centered between the expand/close controls, and renders the matching named slot
as the dialog body. The text title is hidden while tabs are shown. A tab
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
- `footer` and `actions` slots render before the standard action buttons;
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

- Shows the top mention modal when its `modalId` is current.
- Renders note content as `Markdown` with `enableMentionModal`, so links inside
  the modal can open further entity modals.
- Module/party show `description`; monster/encounter show `name` +
  `description`; unknown/missing entities show "not found".
- `openMentionModal` has a special case: if the newly requested entity equals
  the entity two levels down, it closes the current modal (acts like "back").

## Promise dialogs (`src/dialogs/`)

Thin wrappers around Quasar `Dialog`:

```ts
alert(message, options?): Promise<void>
confirm(message, options?): Promise<boolean>
prompt(message, options?): Promise<string | null>
```

All use `persistent: true`. Defaults are English ("OK", "Cancel", "Confirm",
"Alert", "Prompt") rather than i18n keys.

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

| View                               | Right drawer           | Footer          | Header       |
| ---------------------------------- | ---------------------- | --------------- | ------------ |
| Any list view (`BaseListView`)     | via view prop          | —               | `ViewHeader` |
| Any entity view (`BaseEntityView`) | via view               | —               | `ViewHeader` |
| `NoteView`                         | `NoteViewSidebar`      | —               | `ViewHeader` |
| `PartyView`                        | `PartyViewSidebar`     | —               | `ViewHeader` |
| `MonsterView`                      | `MonsterViewSidebar`   | —               | `ViewHeader` |
| `EncounterView`                    | `EncounterViewSidebar` | —               | `ViewHeader` |
| `CharacterView`                    | `#sidepanel`           | —               | `ViewHeader` |
| `ModuleView`                       | `#sidepanel`           | —               | `ViewHeader` |
| `JukeboxView`                      | `PlaylistList`         | `JukeboxPlayer` | `ViewHeader` |

- The right drawer is owner-scoped: only the view that set the content can
  clear it.
- `NotesView` does not touch another view's drawer.
- `JukeboxView` clears both on unmount. The others clear the right drawer only.

Because the drawer content is a global singleton, navigating between pages
relies on each view clearing its content. `BaseEntityView` publishes its
`sidepanel` slot for views that need one (`CharacterView`, `ModuleView`) and
clears it on unmount.

## Settings dialog

`SettingsDialog.vue` is a `BaseModal` opened from the left navigation’s
Settings item. It currently has two sections:

- **Interface**
  - **Language** — the `LanguageSwitcher` (`en` / `ru`), persisted in
    `configStore.savedLanguage`; Quasar’s locale follows the selection.
  - **Confirm deletion** — default `true`. When off, `confirm()` resolves
    `true` immediately without opening a confirmation dialog.
- **Player**
  - Smooth track change.
  - Animate player background.
  - Display cover while playing.
  - Show player dialog (off → the Jukebox menu item opens `/jukebox`). This
    only controls the music player dialog, not future ambient controls.

The player toggles mirror the persisted options used by the jukebox player.
The dialog closes through the modal cancel/close path and emits
`update:modelValue`.

## Bottom sheets

`SoundControlDialog.vue` and `CalculatorView.vue` are `QDialog position="bottom"`
with `useDragSnap`:

- Drag the toolbar; the card follows the pointer.
- Dragging up more than 200px leaves it open; otherwise it snaps back.
- `transitionHide` switches between `fade` and default based on drag offset.
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

- **Header**: injected per route; includes create/edit/delete and custom header
  buttons.
- **Left drawer**: primary navigation + jukebox/calculator shortcuts.
- **Right drawer**: contextual sidebar (mentions, TOC, playlists).
- **Footer**: only the jukebox player.
- **Overlays**: PWA status/install, mention modals, calculator, jukebox dialog.

## Known issues

- Named slots used by views but never forwarded (`sidepanel`, `actions`,
  `sub`).
- No `footer` slot in `BaseModal` despite usage.
- No `update:isOpen` emit despite usage.
- Modals are all `persistent`, so users cannot escape with the backdrop or Esc.
- Dialog defaults are not translated.
- The right drawer is a global singleton, but clearing is owner-scoped via
  `useRightDrawer()`.
