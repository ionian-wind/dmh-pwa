# Shared Common Components

This part documents the reusable components under `src/components/common/` plus
the small form controls in `src/components/form/`. Domain cards/editors are
covered in their feature documents.

## Cards

### `BaseCard.vue`

Props: `showView`, `showEdit`, `showDelete`, `title`.
Slots: `header`, default, `actions`.
Emits: `view`, `edit`, `delete`.

- Header (title or `header` slot) is clickable and emits `view`.
- Body renders only if the default slot has meaningful content (ignores
  comments/empty text, handles fragments).
- Actions row renders if a slot exists or any action flag is set.
- Copy is supported when `showCopy` is set; domain cards enable it.

### Domain cards

Thin wrappers that forward events:
`NoteCard`, `ModuleCard`, `PartyCard`, `MonsterCard`, `CharacterCard`,
`EncounterCard`, `TrackCard` (jukebox, custom layout).

Variations:
- `NoteCard` renders Markdown, clamps at 600px, and has tag chips.
- `ModuleCard`/`PartyCard` show descriptions and metadata.
- `MonsterCard` hides all actions unless `showActions` is passed (no caller
  does).
- `EncounterCard` adds a run-combat button.
- `CharacterCard` only shows the title.
- `TrackCard` is a `QItem` with artwork, duration, add/remove actions.

## Lists

### `BaseListView.vue`

Props: `items`, `cardComponent`, `editorComponent`, `emptyMessage`,
`createTitle`, `cardProps(item)`, `editorProps(item)`, `sidePanelVisible`,
`viewStyle` (`masonry` | `grid` | anything else → list), `draggable`,
`hideHeader`, `rightDrawerIcon`.

Emits: `create`, `edit`, `delete`, `submit`, `cancel`, `update:searchQuery`,
`view`, `tag-click`, `copy`, `update:sidePanelVisible`, `sort`, `drop`,
`dragover`, `dragleave`.

Behavior:
- Clones `items` into `localItems` for optional `vuedraggable` sorting.
- Emits `sort(localItems)` on drag end.
- Internally opens the editor when a card emits `edit`; create resets the
  editing item.
- Uses the typed `useLayout()` store to publish a `ViewHeader` with create and
  optional search controls. Search props/events are forwarded from the list
  view to the domain store.
- `@view`, `@edit`, `@delete`, `@tag-click`, `@copy` are re-emitted from cards.
- The `draggable` branch binds the same card listeners as the other layouts,
  so cards remain interactive while sorting.
- `show-search`, `search-query`, and `search-placeholder` are real props.
- `viewStyle` `masonry` uses four large columns, `grid` uses three; both use
  `q-col-gutter-*` so column widths stay centered and do not overflow.
- `handleDelete` is an empty stub; deletion is delegated upward.
- The empty state is a normal padded block, not a fixed-position element.

### `BaseEntityView.vue`

Props: entity, name, list route, delete/edit callbacks, `title`, `subtitle`,
`loading`, `notFound`, `hideHeader`, `unwrapContent`, header button flags/array,
right drawer icon.

- Shows loading text, `NotFoundView`, or the page.
- Injects and publishes `ViewHeader` for the app header; clears it on unmount.
- Clears the header on delete only if `onDelete()` resolves `true`; navigation
  uses `router.push(listRoute)`.
- **Does not pass `subtitle` to the header**, so subtitles are never displayed.
- Renders the default slot, `editor`, `actions`, and `sub`; publishes a
  `sidepanel` slot to the right drawer.
- `unwrapContent` skips the inner content wrapper.

### `BaseEntityTabView.vue`

Wraps `BaseEntityView` with `QTabs`/`QTabPanels`.

- Props: same as entity view plus `tabs` and `modelValue`.
- Maintains an internal `activeTab`, syncs to `modelValue`, and selects the
  first enabled tab if the current one disappears.
- Emits `update:modelValue`, `tab-click`, `tab-close`, `tab-add`.
- Forwards the tab slots plus `actions`, `sub`, `sidepanel`, and `editor` to
  `BaseEntityView`.
- Passes all props through `v-bind="props"` to `BaseEntityView`, including
  `tabs`/`modelValue`, which become stray attributes.

## Headers

### `ViewHeader.vue`

Renders:
- title or spacer,
- optional search `QInput`,
- `buttons[]` (icon, color, title key, disabled, event),
- create/edit/delete buttons,
- right-drawer toggle.

Title strings are treated as i18n keys (`t(btn.title)`, `t('common.create')`).
Search state is controlled via `searchQuery` + `update:searchQuery`, but no
caller passes these, and `BaseListView` never supplies them.

### `IconRightDrawer.vue`

Reads the injected `rightDrawerOpen` ref and shows a filled/outline sidebar
icon.

## Selectors and chips

### `ModuleSelector.vue`

- Single-select `QSelect` of modules.
- Always adds a `{ value: 'none', label: 'No Module' }` option, plus `any`
  when `allowAnyModule`.
- Selecting "No Module" yields the string `'none'`, not `null`; this leaks into
  records (notably encounters, which require a real module ID).
- Loads modules on mount.

### `ModuleMultipleSelector.vue`

- Multi-select with chips, `v-model: string[]`.
- Normalizes values in callers (PartyEditor/MonsterEditor/PlaylistEditor).

### `TagSelector.vue`

- Add/remove string tags.
- Used only by the commented-out note UI; effectively dormant.
- Duplicate/whitespace checks are minimal.

### `TagChip.vue`

Presentational chip with optional remove button and icon slot.

### `LanguageSwitcher.vue`

`QSelect` bound to Vue I18n locale + config store. Not mounted in the shell.

## Inputs and controls

### `Button.vue`

Quasar `QBtn` wrapper with semantic `variant` (`primary`, `secondary`,
`danger`, `success`, `warning`, `link`, `light`, `none`) and `size`
(`small`/`medium`/`large`). Maps to Quasar colors/sizes and stops click
propagation.

Caveat: `v-bind="$attrs"` comes after `@click`, so an inherited `onClick`
could be bound twice; callers generally use `@click`.

### `ToggleSwitch.vue`

`QToggle` wrapper using `v-model="props.modelValue"` (direct prop mutation).
It also emits `update:modelValue`. Parent-controlled usage works, but Vue warns
about mutating a prop and the local value can desync if the parent ignores the
update.

### `NumberSpinner.vue`

Vertical +/- buttons around a numeric `QInput`. Supports press-and-hold repeat.
The text field is not bound back to the model, so only the buttons change the
value.

### `RangeSlider.vue`

Custom pointer/touch slider with horizontal/vertical modes. Clamps and steps
values. Currently exercised by tests only.

### `TabGroup.vue` / `TabPanel.vue`

A non-Quasar tab system:
- `TabGroup` renders buttons from `tabs`, manages `activeTab`, provides it, and
  renders the default slot.
- `TabPanel` injects `activeTab` and renders its slot only when `tabId`
  matches.
- Supports variants (default/pills/underline/cards), sizes, closable/addable
  tabs, vertical mode.
- Used by the module sidepanel.

### `PopoverPanel.vue`

`QMenu` wrapper with an internal trigger span, open/close/toggle exposure, and
placement/offset props. `offset` is typed as a number but passed to `QMenu`,
which expects an array (`[x, y]`), causing a type error and likely ignored
offset at runtime.

### `FloatActionButton.vue`

Quasar `QFab` wrapper with position/size/variant props and automatic hiding when
a modal is open (`useModalState`). Even when `static` is false, it renders a
`QFab` with fixed positioning; the large stylesheet targets class names that
the wrapper never applies, so most custom CSS is dead.

### `PopoverPanelDemo.vue`

A demo page for `PopoverPanel`; not routed and references `popoverDemo.*`
translation keys that do not exist.

## Other common components

- `Mentions.vue` — groups `{kind,id}` refs by kind and links to detail routes.
- `TableOfContents.vue` — TOC with scroll-spy; rendered in the module sidepanel.
- `Bookmark.vue` — toggles a bookmark for a note in a module.
- `BaseModal.vue` — see [modals-and-navigation.md](modals-and-navigation.md).
- `Markdown.vue`, `MarkdownEditor.vue` — see
  [markdown-editor.md](markdown-editor.md).

## Styling notes

- `global.css` defines a light theme (`--color-background: #fff`, dark text)
  while Quasar's primary is near-black (`#1e1e2e`) and the header/left drawer
  use `bg-primary` with white text. The result is a dark chrome with a light
  content area, not the "dark theme" claimed by the README.
- Many components still carry CSS from the pre-Quasar implementation (class
  names with no matching markup).
- `quasar-variables.sass` defines `.form-section`/`.form-grid` by `@extend`ing
  Quasar utility classes.
