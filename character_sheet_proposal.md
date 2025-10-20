# Digital Character Sheet Feature Proposal

## Overview
This document proposes the implementation of a digital character sheet system for the DM Helper PWA. The system will be system-agnostic, user-friendly, and built using existing project patterns and technologies. It will include a WYSIWYG editor with a grid-based layout system that allows users to create and customize character sheets with visual drag-and-drop capabilities.

## Objectives
- Create a system-agnostic digital character sheet that can work with any TTRPG system
- Provide an intuitive WYSIWYG editor that enables non-technical users to create character sheets
- Implement a grid-based layout system that allows for flexible component arrangement
- Reuse existing project patterns and technologies to maintain consistency
- Provide a seamless user experience with tabs for information, rendered view, and editing

## Existing Technologies to Leverage
Based on the project analysis:
- Vue 3 with TypeScript (existing stack)
- Quasar components (using Pascal case naming)
- Milkdown WYSIWYG editor (already in dependencies)
- IndexedDB for storage (existing pattern)
- Pinia for state management (existing pattern)
- Tailwind CSS classes for responsive grid layouts

## Proposed Architecture

### Components Structure

#### 1. SheetsList Component (`SheetsList.vue`)
- Displays all available character sheets in a card layout
- Based on BaseListView pattern
- Provides actions: View, Edit, Delete, Copy
- Implements search/filter functionality

#### 2. SheetCard Component (`SheetCard.vue`)
- Individual card for displaying a single sheet
- Based on BaseCard component pattern
- Each card shows sheet name, system, and metadata
- Provides actions: View, Edit, Delete, Copy

#### 3. SheetEditor Component (`SheetEditor.vue`)
- Modal dialog for creating/editing sheet definitions
- Based on BaseModal component
- Contains basic information fields: Name, Description, System
- Implements save/cancel functionality

#### 4. SheetView Component (`SheetView.vue`)
- Full page view for a single character sheet
- Based on BaseEntityTabView component
- Contains tabs as specified in the SheetEditor:
  - Information tab (basic metadata)
  - Rendered Sheet tab (preview of the current layout)
  - WYSIWYG Editor tab (grid-based editor, for editing mode)
- Implements view/edit modes with appropriate actions

#### 5. SheetRenderer Component (`SheetRenderer.vue`)
- Renders a character sheet using the defined layout structure
- Can be embedded in any other page or component
- Takes sheet definition as input and renders the grid layout with components
- Responsive design that works on different screen sizes

#### 6. Grid-Based WYSIWYG Editor Component (`SheetLayoutEditor.vue`)
- 12-column grid system based on Quasar UI (responsive layout)
- Visual grid with drag handles and resize controls
- Row management: add/remove rows
- Cell management: 
  - Add cells by splitting or merging
  - Merge cells by "resizing" them (dragging edges)
  - Split merged cells to restore to individual grid units
  - Empty cells show "+" button for component selection
- Component placement using Quasar UI components:
  - Component selection dialog appears on "+" click
  - Components fill their cells fully
  - Support for Quasar text fields, number inputs, select dropdowns, etc.
- Component management:
  - Edit placed components
  - Remove components while preserving cell structure
  - When merging cells that contain components, prompt user which component to keep
  - When splitting a merged cell that contains a component, the component remains in the first new cell and the second (and subsequent) cell(s) are empty
- Side panel (right panel) for component properties and settings:
  - Appears when a component is selected
  - Allows editing of component properties (label, type, default value, etc.)
  - Uses existing right panel approach from the project
  - Collapsible for more workspace when needed

### Data Structure

#### Sheet Definition Type
```typescript
interface SheetDefinition extends WithMetadata {
  name: string;
  description?: string;
  system?: string; // TTRPG system (optional)
  layout: SheetRow[]; // Grid layout
  metadata?: Record<string, unknown>; // Additional metadata
}

interface SheetRow {
  id: string;
  columns: number; // Total columns in row (max 12)
  cells: SheetCell[];
}

interface SheetCell {
  id: string;
  span: number; // Number of grid columns this cell spans (1-12)
  component?: SheetComponent;
}

interface SheetComponent {
  id: string;
  type: string; // 'text', 'input', 'number', 'select', etc.
  props: Record<string, unknown>; // Component-specific properties
  label?: string;
  value?: any;
}
```

### State Management
- Create `useSheetStore` following existing store patterns
- Implement CRUD operations using existing IndexedDB utilities
- Add current sheet tracking for active editing/viewing

### UI/UX Patterns
- Leverage existing Quasar components (Pascal case: `QCard`, `QInput`, etc.)
- Use existing dialog patterns for sheet editor
- Follow existing tab navigation patterns (like `CalculatorView`)
- Implement responsive grid using Quasar's grid system
- Reuse existing icons from Tabler Icons

## Implementation Plan

### Phase 1: Core Infrastructure
1. Define new types for sheet structures in `src/types/`
2. Create the sheets store (`src/stores/sheets.ts`) following existing store patterns
3. Implement basic grid component for layout visualization
4. Create the `SheetDefinition` schema for validation

### Phase 2: Core Components
1. Implement `SheetCard` component based on `BaseCard` pattern
2. Implement `SheetsList` component based on `BaseListView` pattern
3. Implement `SheetRenderer` component for rendering sheet layouts
4. Create the grid-based WYSIWYG editor component (`SheetLayoutEditor`)

### Phase 3: Editor Components
1. Build `SheetEditor` modal component based on `BaseModal`
2. Implement `SheetView` component based on `BaseEntityTabView` with tabs
3. Implement side panel for component properties in `SheetLayoutEditor`
4. Implement component selection and placement logic
5. Add row and cell management functionality

### Phase 4: Advanced Features
1. Implement cell merging and splitting functionality
2. Add component editing and removal capabilities
3. Implement responsive design for all components
4. Add undo/redo functionality if needed

### Phase 5: Integration
1. Add navigation routes for sheets
2. Connect with existing character/monster systems
3. Add import/export functionality if needed
4. Implement responsive layout for mobile devices

## Technical Considerations

### Grid System Implementation
- Use CSS Grid with 12-column layout
- Implement drag-and-drop using existing `@vue-dnd-kit` dependency
- Handle cell merging by adjusting `span` values in adjacent cells
- Maintain layout integrity when rows/cells are added/removed

### Component Management
- Implement component registry system for different field types
- Create generic component wrapper that can render different input types
- Handle component state and validation within each cell
- Implement undo/redo functionality using existing patterns

### Performance
- Optimize rendering for complex sheets with many components
- Implement virtual scrolling if sheets become very large
- Cache frequently used layout calculations

## User Experience Flow

1. **List View**: User sees all sheets in a card layout with actions
2. **Create/Edit**: User clicks "New" or "Edit" to open sheet editor dialog
3. **Tab Navigation**: User can switch between:
   - Information tab (basic metadata)
   - Rendered Sheet tab (preview of current layout)
   - WYSIWYG Editor tab (grid layout editor)
4. **Grid Editing**:
   - User adds rows as needed
   - User clicks "+" in empty cells to add components
   - User merges cells by dragging resize handles
   - User configures placed components
5. **Save/Cancel**: User saves or cancels changes

## Testing Strategy
- Unit tests for core grid layout logic
- Component tests for editor functionality
- Integration tests for store operations
- End-to-end tests covering the complete workflow

## Estimated Timeline
- Phase 1: 2-3 days
- Phase 2: 4-5 days 
- Phase 3: 2-3 days
- Total: 8-11 days

This proposal leverages existing project patterns and technologies while delivering a powerful and user-friendly digital character sheet system that will work with any TTRPG system.