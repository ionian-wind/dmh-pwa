# Shared Common Components

This part documents the reusable components under `src/components/common/` plus
the small form controls in `src/components/form/`. Domain cards/editors are
covered in their feature documents.

## Cards

### `BaseCard.vue`

Props: `showView`, `showEdit`, `showDelete`, `showCopy`, `hoverExpand`,
`title`, `dragEntity`.
Slots: `media`, `header`, default, `actions`.
Emits: `view`, `edit`, `delete`, `copy`.

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
- `showCopy` adds the copy action; domain cards enable it.
- `hoverExpand` can disable the hover growth for cards that manage their own
  expansion (the note card uses it while expanded).
- When `dragEntity` (`{ kind, id, title }`) is present, a drag handle appears
  at the right edge of the title on hover. Dragging uses a small offscreen
  `QCard` ghost with the entity icon and title.

### Domain cards

Thin wrappers that forward events:
`NoteCard`, `PartyCard`, `PawnCard`, `CharacterCard`, `EncounterCard`,
`LocationCard`, `JukeboxPlaylistCard`, and `TrackCard` (jukebox, custom
layout).

Variations:

- `NoteCard` renders Markdown, clamps at 600px, shows tag chips, and adds
  download and expand/collapse actions.
- `PartyCard` shows a three-line-clamped description and a character count.
- `PawnCard` and `CharacterCard` show a picture and a short plain-text notes
  preview. `PawnCard` gates every action behind `showActions`; the pawns list
  passes `true`.
- `EncounterCard` adds a run-combat action and a pawn-count summary.
- `LocationCard` shows a description and location drag metadata.
- `JukeboxPlaylistCard` shows the name, track count and a play action.
- `TrackCard` is a `QItem` with artwork, duration, playback progress, bulk
  selection, drag handle, and add/remove menu actions.

### `SidebarItem.vue`

Reusable card-style sidebar row used by map markers/areas and the probability
calculator code library.

Props: `title`, `color` (optional side-border color).
Slots: `left`, default, `actions`.

- `left` holds an icon, checkbox or other control.
- `actions` holds edit/delete buttons and is only revealed on hover or keyboard
  focus.
- Omit `color` for no colored side border.

### `SidebarActionItem.vue`

`QItem`-based sidebar row for playable/removable entries. Props: `title`,
`active`, `playing`, `clickable`, `playable`, `removable`, `actionsVisible`,
`removeLabel`. Emits `activate`, `toggle` and `remove`; the `leading` and
`actions` slots add icons or extra buttons. Used by the ambient scene panel and
the jukebox playlist list.

### `DiceRollerPanel.vue`

Draggable, closeable dice panel containing a vertical `QMenu`, anchored beside the main menu at the bottom-left corner. Its anchor follows the drag and the menu is repositioned during movement. DiceBox runs in on-screen mode, and its canvas keeps the size from creation: the Babylon render loop stops after dice settle, so resizing the canvas would clear the scene without drawing again. Buttons cover d2,
d4, d6, d8, d10, d12, d20 and d100 (`2d10`), with a separator and a Clear
action. It renders `@3d-dice/dice-box` on a fixed, pointer-events-free
full-screen surface so dice animations are click-through. The surface is kept
in viewport pixels on resize so the 3D canvas does not stretch.

### `LightCodeEditor.vue`

Thin `@editora/light-code-editor` wrapper used by the probability calculator. It supports custom syntax modes, completions and diagnostics.

Props: `modelValue`, `language`, `theme`, `readonly`, `height`, `options`.
Emits: `update:modelValue`, `ready`.

- Creates the editor on mount and disposes it on unmount.
- Watches external value, language and readonly changes.
- Exposes `focus()` and `getEditor()` for marker integration.

## Lists

### `BaseListView.vue`

Props: `items`, `cardComponent`, `editorComponent`, `emptyMessage`,
`emptyActionTitle`, `createTitle`, `createLoading`, `cardProps(item)`,
`editorProps(item)`, `sidePanelVisible`, `viewStyle` (`masonry` | `grid` |
anything else → list), `draggable`, `dragHandle`, `hideHeader`,
`rightDrawerIcon`, `showSearch`, `searchQuery`, `searchPlaceholder`, `tabs`,
`activeTab`, `headerButtons`, `leftHeaderButtons`.

Emits: `create`, `edit`, `delete`, `submit`, `cancel`, `update:searchQuery`,
`view`, `tag-click`, `copy`, `update:sidePanelVisible`, `sort`, `drop`,
`dragover`, `dragleave`, `tab-click`, `update:activeTab`.

Behavior:

- Clones `items` into `localItems` for optional `SortableList` sorting.
- Emits `sort(localItems)` on drag end.
- Internally opens the editor when a card emits `edit`; create resets the
  editing item.
- Uses the typed `useLayout()` store to publish a `ViewHeader` with create
  controls. It also forwards the optional header tabs (`tabs`/`activeTab`),
  `headerButtons` and `leftHeaderButtons`.
- Optional search props/events are still forwarded when supplied, but no list
  view enables the header search field right now.
- `@view`, `@edit`, `@delete`, `@tag-click`, `@copy` are re-emitted from cards.
- The `draggable` branch binds the same card listeners as the other layouts,
  so cards remain interactive while sorting.
- `show-search`, `search-query`, and `search-placeholder` remain available for
  future use; the current list views do not set them.
- `viewStyle` `masonry` uses four large columns, `grid` uses three; both use
  `q-col-gutter-*` so column widths stay centered and do not overflow.
- `handleDelete` is an empty stub; deletion is delegated upward.
- The empty state is a normal padded block, not a fixed-position element.
- Empty lists render a large positive create button below the empty-state text;
  `emptyActionTitle` overrides its label and `createLoading` shows progress. It
  runs the same create action as the header button.

### `BaseEntityView.vue`

Props: `entity`, `entityName`, `listRoute`, delete/edit callbacks, `title`,
`subtitle`, `loading`, `notFound`, `hideHeader`, `unwrapContent`, header button
flags/arrays, `tabs`, `modelValue`, right drawer icon, `fill`.

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
- `unwrapContent` skips the inner content wrapper. `fill` switches the layout
  to a full-height flex column so the title stays fixed above the
  scrollable/fill content area.

### `BaseEntityTabView.vue`

Wraps `BaseEntityView` with `QTabs`/`QTabPanels`.

- Props: same as entity view plus `tabs` and `modelValue`.
- Maintains an internal `activeTab`, syncs to `modelValue`, and selects the
  first enabled tab if the current one disappears.
- Emits `update:modelValue` and `tab-click`; `tab-close`/`tab-add` are declared
  but not currently emitted.
- Forwards the tab slots plus `actions`, `sub`, `sidepanel`, and `editor` to
  `BaseEntityView`.
- Passes its props through `v-bind`, but replaces the incoming `modelValue`
  with the internal `activeTab` and sets `unwrap-content` on the wrapped view.

## Headers

### `ViewHeader.vue`

Renders:

- a leftmost delete `QBtnGroup`, before page-specific `leftButtons`,
- a title/subtitle block or spacer,
- optional centered tabs (`tabs` + `modelValue`, emitting `tab-click`),
- optional search `QInput`,
- a primary `QBtnGroup` containing `buttons[]` (icon, color, title key,
  disabled, event, optional `href`/`target`/`rel`) plus create/edit buttons,
- a vertical `QSeparator` when both primary actions and a sidebar exist,
- a separate `QBtnGroup` with the right-drawer toggle.

Button titles are treated as i18n keys (`t(btn.title)`), and `createLoading`
disables and spins the create button. Search state is controlled via
`searchQuery` + `update:searchQuery`, but no caller passes these right now; the
header search field is therefore hidden. `href`/`target`/`rel` let actions
open static pages such as the help center.

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

| Source    | Link targets                                                |
| --------- | ----------------------------------------------------------- |
| Note      | Party, Pawn, Encounter, Character, Location                 |
| Party     | Note, Character, Location, Playlist                         |
| Character | Note, Party, Location                                       |
| Pawn      | Note, Encounter, Location, Playlist                         |
| Encounter | Note, Pawn, Location, Playlist                              |
| Location  | Note, Party, Pawn, Encounter, Character, Location, Playlist |
| Playlist  | Party, Pawn, Encounter, Location                            |

Relations stored on the target side are updated in reverse: for example,
dropping a Character on Party updates `party.characters`, and dropping a Pawn
on Encounter updates `encounter.pawns`.

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
emits the full updated ref list. It provides a virtualised linked list with
remove actions, and clicking a row opens `EntityInfoDialog` for the linked
entity. It opens `EntityLinkingDialog` for searchable selection. Existing links are included in
the dialog pre-selected, so links can be removed by unchecking them there as
well as from the linked list. In readonly mode the add and remove actions are
hidden, so it can display links in view-only contexts. Located under
`src/components/common/`.

### `EntityLinkingDialog.vue`

Searchable entity picker used by `EntitiesLinking`. It accepts the entity
`kind`, dialog `title`, available `options`, already `linkedIds`, optional
`multiple` and `allowCreate`; linked entities are shown pre-selected. Emits
`add` with the full selected ref set (so unchecking linked entries removes
them) plus labels for entities created inline, or `cancel`. It renders the
shared `EntityLinkingList` and can forward an `item-extra` slot (used by combat
for initiative inputs). The create (+) action opens `EntityCreateDialog`.
Located under `src/components/common/`.

### `EntityLinkingList.vue`

Searchable multi-select list used inside `EntityLinkingDialog`. Props:
`options` (`{ id, label }[]`), `modelValue` (selected ids), optional `multiple`,
`createdIds`, and `kind`. Emits `update:modelValue` and `created`; exposes
`resetSearch()`. It provides `search-actions` and `item-extra` slots.

### `EntityCreateDialog.vue`

Kind-driven create wrapper. It resolves the feature link kind's editor through
`getEntityKindOption()` and mounts it with the expected `isOpen`/empty-entity
props. Emits `created({ ref, label })` or `cancel`; playlist editors are also
listened to through their `saved` event.

### `EntityViewLinks.vue`

Read-only view of an entity's main-entity links. It accepts `links` as
`MapEntityRef[]`, groups them by kind, and renders each group with
`EntitiesLinking` in `readonly` mode. Add, remove and inline-create actions are
hidden. Shows a translated empty state when there are no links.

### `EntityInfoDialog.vue`

General entity view dialog shared by linked lists, combat, active-combat and
encounter sidebars. Props: `isOpen`, `title`, optional `picture`, `notes`, `to`,
`entityKind`, `entityId`. Emits `cancel`.

- Wraps `BaseModal` with expand and close controls and resolves the entity's
  feature store from `entityKind`; the title, body and picture fall back to the
  passed props when the store has no record.
- Shows **Main** (`IconEye`) and **Linked entities** (`IconAffiliate`) tabs when
  the kind has link targets, mirroring the standard view/edit split. Kinds
  without targets render only the content body.
- A centered View/Edit `QBtnGroup` in the modal footer appears when an
  `entityId` is present and the store exposes `update`; it toggles inline
  editing of the title, body and (for entities with a `picture` field) the
  picture. Notes require title or content; other kinds require a name.
- In edit mode it renders `EntityInlineEditor`, `EntityPicturePicker` and
  `EntityMarkdownEditor`; in view mode it renders `MilkdownView` (with mention
  modals) and `EntityPicture`.
- The linked tab uses `EntityViewLinks` in view mode and editable
  `EntitiesLinking` blocks in edit mode. Link changes are written immediately
  through `useEntityLinkRelations()`.
- Note editing adds a footer options popup with the async, feature-gated
  `NoteOptions` component (`__FEATURE_NOTES__`) plus a visual-mode toggle.
- An external-link header action calls `cancel` and navigates to the entity
  route when one exists (`to` or `entityRoute()`).
- Opens outside the modal stack (`useModalStack: false`) so pickers and info
  dialogs can nest inside editors.

### `entityViewTabs.ts` / `entityEditorTabs.ts`

`useEntityViewTabs()` returns the standard detail-page tabs: **View**
(`IconEye`) and **Linked entities** (`IconAffiliate`). View headers render them
icon-only with accessible titles. Used by note, character, party and pawn
detail pages so their view tabs mirror the editor's Main/Links split.

`useEntityEditorTabs()` returns the matching dialog tabs: **Main editor**
(`IconForms`) and **Linked entities** (`IconAffiliate`). Used by note,
character, party, pawn, encounter, map and playlist editors plus the scene
player dialog.

### `EntityTabs.vue`

Dense Quasar `QTabs`/`QTab` bar shared by entity views, the ambient page and the
scene player. It accepts `tabs` (`id`, `label`, optional `disabled`) and supports
`v-model` plus a `tab-click` event.

### `EntityGroup.vue`

Section wrapper for grouped entity lists. It renders an uppercase group title
followed by a flexible separator, an optional `actions` slot beside the title,
and the group content through the default slot. Optional `to` renders the title
as a link and `onTitleClick` handles its click. Consecutive groups get vertical
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

### `ColorPicker.vue`

Quasar `QColor` popup trigger. Props: `modelValue`, optional `label`, `id`,
`clearable`, `clearLabel`; emits `update:modelValue` with a hex string. Used by
note type and map marker/area editors.

### `IconPicker.vue`

Searchable icon palette for a named collection. Props: `modelValue`, `icons`,
`collection`, optional `searchPlaceholder` and `noIconLabel`; emits
`update:modelValue` as `collection:name` (or an empty string for no icon). Used
by note types and map marker/area editors.

### Shared entity view/edit components

- `EntityContentSurface.vue` — the note-style padded content surface used by
  detail view modes (`min-height: 100%`, standard padding/radius; no props).
- `EntityInlineEditor.vue` — borderless title/name input (`title`,
  `titlePlaceholder`, optional `titleRequired`, `validationError`), content slot
  and validation-error block used by detail edit modes.
- `EntityMarkdownEditor.vue` — shared `MarkdownEditor` wrapper with
  `enableMentions`, entity id/type context, optional `tags` and a
  `getMarkdown()` exposure.
- `EntityMainContent.vue` — read-only main-tab renderer for `kind` + `entity`.
  Notes and encounter descriptions use `MilkdownView`; party/location
  descriptions are plain paragraphs; pawn/character notes render in a titled
  block. Used by `MentionModalStack`.
- `EntityPicture.vue` — stored-file picture thumbnail with size/alt/rounded
  props and a placeholder icon.
- `EntityPicturePicker.vue` — 240 px picture preview plus select/remove actions;
  imports the chosen image through the generic file API.
- `EntityModeControls.vue` — the sidebar visual-editor toggle, optional delete
  action and View/Edit switch shared by note, character, party, pawn, encounter
  and location sidebars.
- `useEntityEditMode` (`src/composables/useEntityEditMode.ts`) — draft
  lifecycle, dirty tracking, save-on-view, delete/discard callbacks,
  route-leave confirmation and the `beforeunload` guard.

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
- Entity sidebars use the note variant: `side-panel-content` →
  `sidebar-tab-content` → `TabGroup`, with each tab panel padded by `q-pa-md`.
- Used by the note, character, party, pawn and encounter sidebars plus the
  location map tab.

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

- `StatCard.vue` (`src/components/`) — home stat card. It receives
  `{ route, icon, key, count }`, renders the `icon` component itself (Tabler
  icons today), and translates its label with `statCard.<key>`. `HomeView`
  builds these from the enabled feature home cards sorted by `order`, then
  renders them as a grid.
- `EmptyState.vue` — shared centered icon/title/hint block used by ambient sound
  and entity list pages when no items are available. `BaseListView` splits its
  `emptyMessage` at the first sentence into the title and subtitle.
- `Mentions.vue` — wraps each mention section in `EntityGroup`, groups
  `{kind,id}` refs by kind, and links to detail routes. Resolves labels for
  notes, parties, pawns, encounters, characters and locations.
- `TableOfContents.vue` — TOC with scroll-spy. Entries are real `#anchor` links
  that also emit `item-click`; used by the note and probability-syntax
  sidepanels.
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
