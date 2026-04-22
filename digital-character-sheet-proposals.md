### Digital Character Sheet — Implementation Proposals

This document proposes an architecture and incremental plan to implement a system-agnostic digital character sheet and sheet editor in a Vue 3 + TypeScript + Quasar application, aligned with existing code style and project patterns.

### Goals
- **System-agnostic**: Schema and UI components independent of any single TTRPG system.
- **Visual editor**: Drag components from a panel onto an editable canvas; place and resize them using Quasar layout.
- **Runtime sheet**: Render an interactive sheet based on saved configuration.
- **Entity-aware**: Components can reference existing entities (characters, monsters, encounters, notes, etc.).
- **Collections**: A component that manages a dynamic list of items at runtime (add/remove/reorder).
- **Persisted and versioned**: Stored locally with migrations, export/import, and validation.

### Non-Goals (for initial release)
- Real-time multi-user collaboration.
- Cross-device sync (beyond existing app backup/import mechanisms).

### UX Overview
- **Sheets View**: List of character sheets; new/edit; duplicate; import/export.
- **Basic Sheet Data Modal (standard app modal)**:
  - Managed via the same modal pattern used for other entities in the app.
  - Fields (initial): name, description, icon (optional), tags (optional), associated character/entity (optional), created/updated metadata (read-only).
  - Used for create and quick edits to metadata only.
- **Sheet Editor (separate page, not a modal)**:
  - Dedicated route to edit canvas layout and components; full-page workspace.
  - Left: Components panel with searchable categories.
  - Center: Canvas using CSS Grid; drag-and-drop via `@vue-dnd-kit`; resize handles.
  - Right: Inspector for selected component props, bindings, styles.
  - Top bar: Undo/redo, zoom, snap-to-grid, save.
- **Sheet Runtime**: Rendered, interactive sheet; supports inline editing where applicable.

### Component Catalog (initial)
- **Text**: Static text or computed text; optional title.
- **Number**: Numeric field with min/max/step; optional modifiers and roll button.
- **Progress**: HP/Resource bar (current/max), optional temp/overflow.
- **Toggle**: Checkbox/toggle; optional label.
- **Select**: Dropdown or chips; bound to enum/options.
- **Note**: Multiline text area; markdown preview optional.
- **Image**: From file/url.
- **Table**: Rows/columns; columns configured with types (text/number/select/toggle).
- **Roll Button**: Executes dice notation; outputs to existing roll log/toast.
- **Entity Reference**: Picker to bind to an entity and display selected fields.
- **Collection**: Dynamic list (runtime add/remove); item template composed of sub-components.

Notes:
- All components support optional title and description.
- All components support visibility condition and basic styles (padding, alignment, font size, color).

### Layout and Editing
- **Grid model**: Snap-to-grid with `col`, `row`, `colSpan`, `rowSpan`. Default 12 columns.
- **Drag & drop**: Use `@vue-dnd-kit` for drag-and-drop between the components panel and canvas, and for reordering/moving components on the canvas. Keyboard sensors enabled for accessibility.
- **Placement**: Use CSS Grid for spatial placement on the canvas; compute target cell from pointer position and snap to grid on drop.
- **Resize**: Use a lightweight resize utility (e.g., `interact.js` or a Vue resizable directive) with `ResizeObserver` to update `rowSpan`/`colSpan`.
- **Quasar integration**: Canvas embeds within `QLayout`/`QPage` and uses Quasar spacings; components rendered via Quasar controls (`QInput`, `QSelect`, `QToggle`, `QTable`, `QKnob`/`QLinearProgress`, etc.).
- **Z-order and selection**: Click to select; show bounding box and handles; keyboard nudge; delete.
- **Undo/redo**: Editor-local history using a command pattern stack.

### Data Model (Draft)
```ts
// Sheet definition
interface CharacterSheet {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  version: number; // migrations-compatible
  grid: { columns: number; rowHeightPx: number; gutterPx: number };
  components: SheetComponent[];
  // optional: variables and computed values
  variables?: Record<string, number | string | boolean>;
}

// Component base
interface SheetComponentBase {
  id: string;
  kind: SheetComponentKind;
  title?: string;
  visibleIf?: Expression; // simple expression language, e.g., `variables.level >= 5`
  style?: Partial<{
    align: 'left' | 'center' | 'right';
    paddingPx: number;
    fontSizePx: number;
    color: string;
    background: string;
  }>;
  layout: { col: number; row: number; colSpan: number; rowSpan: number };
}

// Component kinds and their props
type SheetComponent =
  | (SheetComponentBase & { kind: 'text'; content: string; computed?: Expression })
  | (SheetComponentBase & { kind: 'number'; key: string; min?: number; max?: number; step?: number; roll?: string })
  | (SheetComponentBase & { kind: 'progress'; currentKey: string; maxKey: string; tempKey?: string })
  | (SheetComponentBase & { kind: 'toggle'; key: string })
  | (SheetComponentBase & { kind: 'select'; key: string; options: Array<{ label: string; value: string }> })
  | (SheetComponentBase & { kind: 'note'; key: string; markdown?: boolean })
  | (SheetComponentBase & { kind: 'image'; src: string; fit?: 'contain' | 'cover' })
  | (SheetComponentBase & { kind: 'table'; key: string; columns: TableColumnDef[] })
  | (SheetComponentBase & { kind: 'roll'; label: string; formula: string })
  | (SheetComponentBase & { kind: 'entity'; entityType: EntityType; entityId?: string; fields: string[] })
  | (SheetComponentBase & { kind: 'collection'; key: string; template: SheetComponent[] });

interface TableColumnDef { key: string; label: string; type: 'text' | 'number' | 'toggle' | 'select'; options?: string[] }

type EntityType = 'character' | 'monster' | 'encounter' | 'note' | 'party' | 'module';

type Expression = string; // kept simple; validate and sandbox at runtime
```

Validation will be enforced via JSON Schema in `src/schemas/characterSheet.schema.json` and TypeScript types.

### State and Persistence
- **Store**: New Pinia store `useCharacterSheetStore` with CRUD (list/create/update/delete/duplicate). Use patterns from existing stores in `src/stores/`.
- **Storage**: IndexedDB via existing abstraction (follow patterns in `migrations/` and stores). Add a migration introducing a `characterSheets` table/collection.
- **Versioning**: Increment `version` in sheet; handle `migrations` akin to other entities.
- **Import/Export**: JSON export/import with schema validation.

### Entity References
- Use existing stores to resolve entities by `entityType` and `entityId`.
- Inspector allows binding to an entity or to a query (e.g., character by name) in later phases.
- For rendering, display selected fields using a simple mapping; optionally link to entity view.

### Collections Component (runtime add items)
- Stored under a `key` in sheet-local state, e.g., `variables[key]` as an array of item objects.
- Editor defines the item `template` (a mini-canvas of components). At runtime, the template renders for each item with an implicit `item` scope.
- Users can add/remove/reorder items within the runtime sheet; persisted per sheet instance.

### Dice/Roll Integration
- Reuse existing dice notation utilities and `RollButton` component where possible.
- `roll` and `roll button` components use a shared action that logs results in the app’s standard output UI.

### Security and Safety
- **Expression sandbox**: Evaluate expressions using a small whitelist (no `Function`/`eval`). Consider `jsep` to parse and a safe evaluator.
- **Schema validation**: Validate imported sheets against JSON Schema.
- **Size limits**: Reasonable caps on number of components and nested depth for performance.

### Internationalization
- Titles/labels support i18n keys or plain text. For v1: plain text; later: toggle to treat value as an i18n key and resolve via existing i18n setup.

### Testing Strategy
- **Unit**: Stores, schema validators, expression evaluator, serialization.
- **Component**: Editor canvas interactions (drag/resize), inspector binding, runtime rendering for each component type.
- **E2E (optional)**: Create a sheet, place components, persist, reload, and render.

### Performance Considerations
- Virtualize heavy lists (collections, tables) where possible.
- Debounce drag/resize updates; persist on idle or explicit save.
- Avoid deep reactive trees by normalizing component arrays and using `shallowRef` for large structures.

### Phased Implementation Plan
1. **Foundation**
   - Add `characterSheets` schema and Pinia store.
   - List view with actions: create (opens Basic Sheet Data modal), edit metadata (modal), delete, duplicate, open canvas editor (navigates to page).
2. **Editor MVP (separate page)**
   - Canvas with CSS Grid layout; drag from panel and move components on canvas using `@vue-dnd-kit`; resize via resizable utility.
   - Inspector for base props (title, visibility, style, layout).
   - Persist and re-open sheets.
3. **Component Basics**
   - Implement Text, Number, Toggle, Progress, Roll Button.
   - Add entity reference component (read-only fields).
4. **Collections**
   - Implement Collection component with runtime add/remove and item template rendering.
   - Add Table component.
5. **Bindings and Expressions**
   - Introduce simple expressions for computed fields and visibility.
   - Safe evaluator and validation.
6. **Polish**
   - Import/Export; i18n support toggle; undo/redo stack; keyboard shortcuts; snap settings.

### Key Files and Locations (proposed)
- `src/schemas/characterSheet.schema.json` — JSON Schema for validation.
- `src/stores/characterSheet.store.ts` — Pinia store for sheets.
- `src/character-sheets/SheetList.vue` — Sheets list with actions and modal triggers.
- `src/character-sheets/SheetMetaModal.vue` — Basic Sheet Data modal (standard app modal pattern).
- `src/character-sheets/Editor.vue` — Full-page sheet editor view (canvas editing).
- `src/character-sheets/SheetView.vue` — Runtime rendering view.
- `src/character-sheets/components/` — Sheet component renderers (Text, Number, etc.).
- `src/character-sheets/editor/` — Editor-specific widgets (components panel, inspector, canvas wrapper).
- `src/character-sheets/editor/dnd/` — DnD setup and sensors using `@vue-dnd-kit`.
- `src/utils/expressions.ts` — Safe expression parsing/eval.
- Router entries:
  - `/sheets` → list view
  - `/sheets/:id/canvas` → canvas editor (separate page)
  - `/sheets/:id` → runtime view

### Open Questions
- Should collections support nested collections in v1?
- Preferred resize utility: `interact.js` vs a Vue resizable directive?
- Where should per-sheet runtime state live (store vs component-local persisted state)?

### Appendix: Tech Choices
- **Drag & Drop**: `@vue-dnd-kit` for sensors, sortable contexts, and collision strategies.
- **Grid/Placement**: CSS Grid with snap-to-grid calculations for `col`/`row`.
- **Resize**: `interact.js` or a Vue resizable directive, with `ResizeObserver`.
- **Validation**: `ajv` for JSON Schema (already possibly used elsewhere; align with project).
