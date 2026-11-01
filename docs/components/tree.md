# Tree Component

## Purpose

A recursive, drag-and-drop tree used to edit a module's document structure
(`ModuleDocumentTree.vue`). It is adapted from the `@vue-dnd-kit/components`
generator (see the upstream README in the folder).

## Files

`src/components/Tree/`

- `Tree.vue` — root droppable container, renders `TreeItem` for each node.
- `TreeItem.vue` — one node, expands/collapses, renders nested `Tree`.
- `TreeControls.vue` — arrow + drag handle.
- `TreeArrow.vue`, `TreeDragHandle.vue` — standalone controls (not used by
  `TreeItem`; `TreeControls` inlines equivalents).
- `types.d.ts` — `TValidItemKeys<T>`, `TValidNestingKeys<T>`.
- `styles.css` — shared tree styles.
- `README.md` — upstream usage documentation.
- `index.ts` — barrel exports.

## API

### `Tree`

| Prop | Type | Meaning |
| --- | --- | --- |
| `data` | `T[]` | Nodes at this level |
| `itemKey` | keyof T (string/number) | Unique key |
| `nestingKey` | keyof T (T[] \| undefined) | Children array |
| `groups` | `string[]` (default `['tree']`) | DnD groups |

Slot: `default({ item })`.

The root registers `useDroppable({ groups, data: { source: data }, onDrop:
DnDOperations.applyTransfer })`.

### `TreeItem`

Giteneric over `T`; props `data`, `itemKey`, `nestingKey`, `source`, `index`,
`groups`. It registers `useDraggable({ data: { source, index } })`, keeps a
local `isExpanded` (default `true`), and renders `TreeControls` plus the default
slot content and a nested `Tree`.

### Type constraints

```ts
type TValidItemKeys<T> = {
  [K in keyof T]-?: T[K] extends string | number ? K : never;
}[keyof T];

type TValidNestingKeys<T> = {
  [K in keyof T]: T[K] extends T[] | undefined ? K : never;
}[keyof T];
```

`Generic` components require the node type to extend
`Record<string, unknown>`.

## Usage in the app

`ModuleDocumentTree` converts:

```ts
ModuleTreeNode { noteId, children }
        ⇅
ExtendedTreeNode { id: noteId, noteId, title, children }
```

`id` is the Tree key and is set to the note ID. The slot renders the title and
three buttons (add child, edit note, remove subtree). Local tree changes are
watched and emitted as `update:noteTree`; the parent persists them.

## Drag-and-drop behavior

- Dragging is initiated from the drag handle (`@pointerdown="onDragStart"`).
- The root and every nested `Tree` are drop targets.
- `DnDOperations.applyTransfer` is expected to mutate the data structure based
  on `{ source, index }` metadata.

### Important defect

Nested `Tree` instances are rendered **without** the `groups` prop:

```vue
<Tree v-if="children && isExpanded" :data="children" ...>
```

so nested trees use the default group `['tree']`. Draggables are registered
without `groups` as well. Depending on the kit's matching rules, nested drops
may not resolve consistently. The component works for the common root-level
case but nested drag/drop should be treated as fragile.

Also, `TreeItem` stores expansion state locally and independently; there is no
central expand/collapse-all, and the state resets when the tree is rebuilt from
props (which happens on every external update).

## Styling

`styles.css` provides `.tree-container`, `.tree-item`, `.tree-item-content`,
`.tree-children`, `.tree-item-text`, `.tree-controls`, `.tree-arrow`,
`.tree-drag-handle`, `.tree-item-dot`, plus `-overed` highlight classes.
`TreeControls` and the standalone controls also define scoped styles; there is
duplication.

## Limitations

- No keyboard navigation or ARIA tree roles.
- No cycle detection; malformed data can recurse indefinitely.
- No virtualization; large books create many nested components.
- No multi-select or drag to reorder siblings only (the drop target is the
  whole container).
- The module tree is the only consumer; the component is not generic enough for
  other domains without adaptation.
- The upstream README documents a `show-arrow`/`show-drag-handle` API that this
  copy does not implement.
