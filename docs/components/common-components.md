# Shared Common Components

This part documents the reusable components under `src/components/common/` plus
the small form controls in `src/components/form/`. Domain cards/editors are
covered in their feature documents.

## Cards

### `BaseCard.vue`

Props: `showView`, `showEdit`, `showDelete`, `title`, `dragEntity`.
Slots: `header`, default, `actions`.
Emits: `view`, `edit`, `delete`.

- Header (title or `header` slot) is clickable and emits `view`.
- Body renders only if the default slot has meaningful content (ignores
  comments/empty text, handles fragments).
- Actions row renders if a slot exists or any action flag is set.
- Actions are hidden until the card is hovered or contains keyboard focus
  (`focus-within`).
- On hover the card gains bottom padding equal to the action-bar height, so the
  toolbar sits below the content rather than covering it.
- `BaseCard` wraps the card in a shell that reserves the card's resting height.
  While hovered, the real card is absolutely positioned inside that shell, so
  following cards keep their place and the hovered card paints above them.
- Hover toggles Quasar's `shadow-5`; the card's combined transition animates
  both its height and box-shadow. On hover-out the shadow transition starts
  immediately, while the card remains floating for the collapse animation.
- On hover, the card first enters its floating state, then its height and action
  bar animate in together. On leave, the height and bar animate out together
  before the floating state ends and the card returns to normal flow.
- Touch devices keep actions in normal flow and permanently visible.
- Copy is supported when `showCopy` is set; domain cards enable it.
- When `dragEntity` (`{ kind, id, title }`) is present, a drag handle appears
  at the right edge of the title on hover. Dragging uses a small offscreen
  `QCard` ghost with the entity icon and title.

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

### `SidebarItem.vue`

Reusable card-style sidebar row used by map markers/areas and the probability
calculator code library.

Props: `title`, `color` (optional side-border color).
Slots: `left`, default, `actions`.

- `left` holds an icon, checkbox or other control.
- `actions` holds edit/delete buttons and is only revealed on hover or keyboard
  focus.
- Omit `color` for no colored side border.

### `MonacoEditor.vue`

Thin Monaco wrapper used by the probability calculator.

Props: `modelValue`, `language`, `theme`, `readonly`, `height`, `options`.
Emits: `update:modelValue`, `ready`.

- Creates the editor on mount and disposes it on unmount.
- Watches external value, language and readonly changes.
- Exposes `focus()` and `getEditor()` for marker integration.

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

- Clones `items` into `localItems` for optional `SortableList` sorting.
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
- Empty lists render a large positive **Create** button below the empty-state
  text; it runs the same create action as the header button.

### `BaseEntityView.vue`

Props: entity, name, list route, delete/edit callbacks, `title`, `subtitle`,
`loading`, `notFound`, `hideHeader`, `unwrapContent`, header button flags/array,
right drawer icon.

- Shows loading text, `NotFoundView`, or the page.
- Renders the entity title and subtitle at the top of the page content, not in
  the app header.
- Injects and publishes `ViewHeader` for app-header actions and optional page
  tabs; clears it on unmount.
- When `tabs`/`modelValue` are supplied, tabs render in the `#main_header` panel
  above the page body.
- Clears the header on delete only if `onDelete()` resolves `true`; navigation
  uses `router.push(listRoute)`.
- Renders the default slot, `editor`, `actions`, and `sub`; publishes a
  `sidepanel` slot to the right drawer.
- `unwrapContent` skips the inner content wrapper. Fill layouts keep the title
  fixed above the scrollable/fill content area.

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
- a primary `QBtnGroup` containing `buttons[]` (icon, color, title key,
  disabled, event) and create/edit/delete buttons,
- a vertical `QSeparator` when both primary actions and a sidebar exist,
- a separate `QBtnGroup` with the right-drawer toggle.

Title strings are treated as i18n keys (`t(btn.title)`, `t('common.create')`).
Search state is controlled via `searchQuery` + `update:searchQuery`, but no
caller passes these, and `BaseListView` never supplies them.

### `IconRightDrawer.vue`

Reads the injected `rightDrawerOpen` ref and shows a filled/outline sidebar
icon.

## Selectors and chips

### Entity linking

Main-entity references are edited with `EntitiesLinking` blocks in editor
dialogs, not with standalone dropdown selectors. Each block owns one entity
type and provides its own searchable add flow. The add modal's search row also
has a create (+) button that opens the related entity editor without leaving the
linking flow. After saving, the new entity is selected and marked “Created” so
it can be linked immediately. Linked rows highlight on hover and expose the
unlink action only on hover or keyboard focus. Internal options such as note
types and map layers keep their dedicated selectors.

### Entity drag linking

Domain cards provide `dragEntity` metadata to `BaseCard`. Starting a drag opens
`EntityDragLinkingOverlay`, a semi-transparent full-screen drop area with a
`Link <type> to:` heading and large `QCard` targets for the entity kinds the
dragged model can link to.
While dragging, the page scroll is locked and its scrollbar is hidden; the drop
grid hides its own scrollbars and only scrolls when the viewport is too small.
Dropping on a kind opens `EntityLinkingDialog` for that kind; applying the
dialog writes the relationship to the model fields:

| Source    | Link targets                                                 |
| --------- | ------------------------------------------------------------ |
| Note      | Module, Location                                             |
| Module    | Note, Party, Monster, Encounter, Location                    |
| Party     | Module, Character, Location                                  |
| Character | Party, Location                                              |
| Monster   | Module, Encounter, Location                                  |
| Encounter | Module, Monster, Location                                    |
| Location  | Note, Module, Party, Monster, Encounter, Character, Location |

Relations stored on the target side are updated in reverse: for example,
dropping a Character on Party updates `party.characters`, and dropping a Monster
on Encounter updates `encounter.monsters`.

### `SortableList.vue`

Generic drag-and-drop list built on `@vue-dnd-kit/core`. It accepts a
`modelValue` array, an `itemKey` (default `id`), optional `tag`, `handle`,
`groups` and `disabled` props, and emits `update:modelValue` after reordering
plus `end({ oldIndex, newIndex })`. It renders the `item` slot for each entry.
The shared `SortableItem` wrapper starts drags from the row while ignoring
buttons, links, form controls and `[data-no-drag]` targets.

### `EntitiesLinking.vue`

Shared entity-link block. It accepts one entity `kind`, a `modelValue` of
`{ kind, id }` refs, optional `multiple`, `label`, `options` and `readonly`, and
emits the full updated ref list. It provides a linked list with remove actions
and opens `EntityLinkingDialog` for searchable selection. Existing links are included in
the dialog pre-selected, so links can be removed by unchecking them there as
well as from the linked list. In readonly mode the add and remove actions are
hidden, so it can display links in view-only contexts. Located under
`src/components/common/`.

### `EntityLinkingDialog.vue`

Searchable entity picker used by `EntitiesLinking`. It accepts the entity
`kind`, dialog `title`, available `options`, already `linkedIds` and optional
`multiple`; linked entities are shown pre-selected. Emits `add` with the full
selected ref set (so unchecking linked entries removes them) plus labels for
entities created inline, or `cancel`. The create (+) action opens `EntityCreateDialog`. Located
under `src/components/common/`.

### `EntityViewLinks.vue`

Read-only view of an entity's main-entity links. It accepts `links` as
`MapEntityRef[]`, groups them by kind, and renders each group with
`EntitiesLinking` in `readonly` mode. Add, remove and inline-create actions are
hidden. Shows a translated empty state when there are no links.

### `entityViewTabs.ts`

Returns the standard detail-page tabs: **View** (`IconEye`) and **Linked
entities** (`IconAffiliate`). View headers render them icon-only with accessible
titles. Used by note, party and monster detail pages so their view tabs mirror
the editor's Main/Links split.

### `EntityTabs.vue`

Dense Quasar `QTabs`/`QTab` bar shared by entity views, the ambient page and the
scene player. It accepts `tabs` (`id`, `label`, optional `disabled`) and supports
`v-model` plus a `tab-click` event.

### `EntityGroup.vue`

Section wrapper for grouped entity lists. It renders an uppercase group title
followed by a flexible separator, an optional `actions` slot beside the title,
and the group content through the default slot. Consecutive groups get vertical
spacing. Used by the ambient ambience/one-shot galleries, scene player groups and
`EntitiesLinking` blocks.

### `VolumeControl.vue`

Shared speaker button with a hover/wheel volume popup. It accepts a `modelValue`
in the 0–1 range, a `label` used for the title/aria text and slider label, and
an optional `muteable` flag. It emits `update:modelValue` with the next clamped
volume and, when muteable, `toggle-mute` on click. Percentages are always shown
as integers. Used by the jukebox player and the ambient scene title line.

### `CommitBadge.vue`

Fixed, non-interactable badge in the page's bottom-left corner. It displays the
commit SHA inlined by Vite at build time from `VITE_COMMIT_SHA` in dark text
over a semi-transparent light background. Local builds fall back to `dev`. No
runtime request is made.

### `ProgressButton.vue`

Quasar `QBtn` wrapper around the shared `ProgressIndicator` content. Props:

| Prop      | Type                               | Default | Description                         |
| --------- | ---------------------------------- | ------- | ----------------------------------- |
| `state`   | `'none' \| 'loading' \| 'playing'` | `none`  | Current button progress state.      |
| `percent` | `number`                           | `0`     | Progress percentage, clamped 0–100. |

- The default slot (label or other content) is always rendered.
- `none` shows only the default slot.
- `loading` delegates to the native Quasar `QBtn` loading spinner.
- `playing` adds the closest Tabler percentage icon and fades between values as
  the percentage changes, while keeping the label visible.
- Reaching `100` fades the icon out, switches the rendered state to `none`, and
  emits `update:state` plus `finish`. Use `v-model:state` to keep the parent in
  sync.

Percentage icons used: `IconPercentage0`, `IconPercentage10`,
`IconPercentage20`, `IconPercentage25`, `IconPercentage30`, `IconPercentage33`,
`IconPercentage40`, `IconPercentage50`, `IconPercentage60`, `IconPercentage66`,
`IconPercentage70`, `IconPercentage75`, `IconPercentage80`, `IconPercentage90`
and `IconPercentage100`.

### `ProgressIndicator.vue`

Non-button percentage progress content shared by `ProgressButton` and the
ambient temporary mood toggle. It renders the default slot plus the nearest
Tabler percentage icon while playing, and no icon in the none state. Native
`QBtn` loading is handled by the button wrapper instead. At 100% the icon fades
and the component emits `update:state` plus `finish`.

### `TagSelector.vue`

- Adds and removes string tags with a standard outlined `QInput` and `QChip`
  list.
- Focusing or typing opens a suggestion menu sourced from `noteStore.allTags`
  plus the currently selected tags. Suggestions exclude tags already selected
  and sort prefix matches first.
- When the typed text does not match an existing tag, the menu shows a
  `Create #tag` action. Arrow keys move the highlight, Enter creates the typed
  tag (or adds the highlighted suggestion), and Escape closes the menu.
- Used by the note editor and the note detail sidebar options panel.
- Duplicate/whitespace checks are minimal.

### `TagChip.vue`

Presentational chip with optional remove button and icon slot.

### `LanguageSwitcher.vue`

`QSelect` bound to Vue I18n locale + config store. Not mounted in the shell.

## Inputs and controls

### `Button.vue`

Quasar `QBtn` wrapper with semantic `variant` (`primary`, `secondary`,
`danger`, `success`, `warning`, `link`, `light`, `ghost`, `none`) and `size`
(`small`/`medium`/`large`). `ghost` maps to a flat, transparent, neutral button.
Maps to Quasar colors/sizes and stops click propagation.

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

Labels may be translation keys or already-translated strings; keys are resolved
with `te()` before translation.

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

- `EmptyState.vue` — shared centered icon/title/hint block used by ambient sound
  and entity list pages when no items are available. `BaseListView` splits its
  `emptyMessage` at the first sentence into the title and subtitle.
- `Mentions.vue` — wraps each mention section in `EntityGroup`, groups
  `{kind,id}` refs by kind, and links to detail routes. Resolves labels for
  notes, modules, parties, monsters, encounters, characters and locations.
- `TableOfContents.vue` — TOC with scroll-spy. Entries are real `#anchor` links
  that also emit `item-click`; used by the module and probability-syntax
  sidepanels.
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
