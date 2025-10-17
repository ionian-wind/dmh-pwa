# Digital Character Sheets - Proposal

## Overview
Design and implement a game system-agnostic digital character sheet system that allows users to create, edit, and display character sheets using a WYSIWYG editor with draggable, resizable components in a grid-based layout. The sheet system will be independent from the existing character system but can optionally link to characters. This implementation should align with the current project architecture and use existing patterns.

## Goals
- Create a flexible, game system-agnostic character sheet editor
- Implement WYSIWYG interface with drag-and-drop capabilities using existing project patterns
- Use grid-based layout system for responsive design
- Ensure all components are resizable and movable
- Provide a render component that can be embedded in any page
- Support multiple game systems through configuration
- Create an independent sheet system that optionally links to existing character management features

## Technical Stack (Aligned with Current Project)
- Vue 3 with Composition API
- TypeScript (strict mode) - following existing tsconfig
- Quasar UI Framework (already in project)
- Existing project dependencies and patterns

## Third-Party Libraries to Use (Based on Current Project)

### Drag & Drop and Grid Layout
- **@vue-dnd-kit/components** and **@vue-dnd-kit/core** - Already in project, for drag-and-drop capabilities
- **vuedraggable** - Already used in project for drag-and-drop, may be used for component palette
- **vue-virtual-scroller** - Already in project, may be useful for performance with large sheets

### Form Components
- **Quasar Form Components** - Already used throughout project (QInput, etc.)
- **@milkdown/kit** - Markdown editor components already in project if needed

### State Management
- **Pinia** - Already used in project with pinia-plugin-persistedstate
- **Existing character store patterns** - Follow existing store patterns

### Editor UI
- **Existing BaseModal component** - Reuse existing modal patterns
- **Existing component patterns** - Follow existing component architecture

## Component Architecture (Aligned with Current Project Structure)

### Core Components
1. **SheetEditor** - Main WYSIWYG editor component
   - Follows existing patterns from CharacterEditor
   - Uses existing BaseModal component
   - Follows existing form-grid layout patterns
   - Contains grid-based layout using existing drag-and-drop patterns

2. **SheetRenderer** - Component for displaying completed character sheets
   - Uses existing view patterns from CharacterView
   - Accepts layout configuration as props
   - Renders components based on configuration
   - Follows existing component composition patterns

3. **SheetComponent** - Base class/interface for all sheet components
   - Defines common properties and methods for sheet components
   - Abstract component that others extend
   - Independent from Character interface

4. **Component Library** - Pre-built components for character sheets, following existing patterns:
   - **TextInput** - Using QInput (following existing form patterns)
   - **NumberInput** - Using QInput (following existing form patterns)
   - **SelectInput** - Using QSelect (following existing form patterns)
   - **Checkbox** - Using QCheckbox (following existing form patterns)
   - **TextArea** - Using QInput with textarea type (following existing patterns)
   - **Label** - Static text components using existing typography
   - **Image** - For character portraits using existing image handling
   - **StatBar** - Custom component following existing component patterns
   - **SkillGrid** - Custom grid component following existing grid patterns
   - **CustomComponent** - For game-specific logic

### Supporting Components (Following Existing Patterns)
- **PropertyPanel** - Similar to existing editor modal structure
- **ComponentPalette** - Similar to existing sidebar patterns
- **LayoutToolbar** - Following existing toolbar patterns
- **ComponentPreview** - Following existing component preview patterns

## Data Structure (Aligned with Existing Types)

### Sheet Configuration Object
```typescript
// New sheet-specific interface that is independent from Character
export interface Sheet {
  id: UUID;
  name: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  layout: LayoutItem[];
  gameSystem?: string;
  sheetConfig?: Record<string, any>; // Additional configuration specific to sheets
}

export interface LayoutItem {
  id: string;
  componentType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, any>;
  locked?: boolean;
  name?: string; // User-friendly name for the component
}
```

## Implementation Steps (Following Project Patterns)

### Phase 1: Infrastructure Setup
1. Create new files following existing project structure
   - `src/sheets/SheetEditor.vue` (following existing editor patterns)
   - `src/sheets/SheetView.vue` (following existing view patterns)
   - `src/sheets/SheetRenderer.vue` (for rendering)
   - `src/sheets/types/sheet.types.ts` (sheet-specific types)
   - `src/sheets/components/` directory for sheet components
   - `src/sheets/stores/sheets.ts` (dedicated sheet store)
2. Update existing `src/types/index.ts` to include sheet types
3. Create sheet-specific store following existing store patterns
4. Ensure all new components use existing i18n patterns

### Phase 2: Basic Sheet Components
1. Create `SheetView` component following existing view patterns
2. Create `SheetRenderer` component for display-only view
3. Implement basic grid layout using existing CSS patterns (form-grid, etc.)
4. Create a basic layout component using existing drag-and-drop patterns

### Phase 3: Editor Components
1. Create `SheetEditor` component following existing editor patterns
2. Implement basic component palette using existing modal patterns
3. Create basic sheet components (TextInput, NumberInput) using existing Quasar components
4. Implement drag-and-drop functionality using existing vuedraggable or @vue-dnd-kit patterns

### Phase 4: Advanced Editor Features
1. Implement grid-based layout system following existing project patterns
2. Add component resizing capabilities
3. Create property panel for component customization
4. Implement save/load functionality following existing store patterns

### Phase 5: Enhanced Components
1. Implement more complex components (StatBar, SkillGrid)
2. Create game system-specific component sets
3. Add conditional rendering capabilities
4. Implement sheet template system

### Phase 6: Integration
1. Update existing CharacterView to include sheet tab (following existing TabGroup example)
2. Add navigation links to existing character management views
3. Ensure proper routing integration with existing router
4. Add sheet management to existing character list views

### Phase 7: Polish & Testing
1. Implement proper validation and error handling
2. Add comprehensive tests following existing vitest patterns
3. Add localization strings following existing i18n patterns
4. Create documentation and examples

## Updated File Structure (Following Current Project Organization)
```
src/
├── sheets/                             # Dedicated sheets directory
│   ├── SheetView.vue                  # Sheet view component
│   ├── SheetEditor.vue                # Sheet editor component  
│   ├── SheetRenderer.vue              # Sheet renderer component
│   ├── components/                    # Sheet-specific components
│   │   ├── SheetEditor/
│   │   │   ├── SheetEditor.vue
│   │   │   ├── ComponentPalette.vue
│   │   │   └── PropertyPanel.vue
│   │   ├── SheetRenderer/
│   │   │   └── SheetRenderer.vue
│   │   ├── SheetComponents/           # Individual sheet components
│   │   │   ├── TextInput/
│   │   │   │   └── SheetTextInput.vue
│   │   │   ├── NumberInput/
│   │   │   │   └── SheetNumberInput.vue
│   │   │   ├── SelectInput/
│   │   │   │   └── SheetSelectInput.vue
│   │   │   └── [more components...]
│   ├── composables/
│   │   └── sheet.composables.ts       # Sheet-specific composables
│   ├── types/
│   │   └── sheet.types.ts             # Sheet-specific types
│   └── stores/
│       └── sheets.ts                  # Dedicated sheet store
├── components/
│   └── common/
│       └── [any reusable components...]
├── stores/
│   └── characters.ts                  # Existing character store
├── types/
│   └── index.ts                       # Extend existing types
└── composables/
    └── [other composables...]
```

## Integration with Existing Architecture

### Store Integration
- Create dedicated `useSheetStore` following existing store patterns
- Optionally link sheets to existing character entities where needed
- Use existing pinia patterns and persistence (pinia-plugin-persistedstate)

### Routing Integration
- Add new routes following existing patterns in `router.ts`
- Create dedicated sheet routes (e.g., /sheets/:id, /sheets/:id/edit)
- Optionally link from character views where appropriate

### UI Integration
- Follow existing dark theme patterns from global.css
- Use existing Quasar components and styling
- Maintain responsive design with existing breakpoints
- Follow existing accessibility patterns

## Database Migration

### Current Database Structure
The project uses IndexedDB for local storage with existing stores for characters, notes, modules, etc.

### New Stores to Create
1. **sheets** store - For storing sheet configurations and layouts
   - Key: sheet.id
   - Value: Sheet object conforming to the proposed Sheet interface
   - Fields: id, name, createdAt, updatedAt, layout, gameSystem, sheetConfig

2. **sheetTemplates** store - For storing reusable sheet templates
   - Key: template.id
   - Value: Template object with layout and configuration
   - Fields: id, name, gameSystem, layout, createdAt, updatedAt

### Migration Plan
1. **Migration 0**: Initial sheet stores creation
   - Create `sheets` object store with key path 'id'
   - Create `sheetTemplates` object store with key path 'id'
   - Add indexes: createdAt, updatedAt, gameSystem

2. **Migration 1**: Add relationships (optional)
   - Add characterId field to sheets for linking to characters
   - Add indexes for efficient character lookups

3. **Migration 2**: Advanced features (later)
   - Add sharing and permissions fields if needed
   - Add versioning fields for sheet templates

### Migration Implementation
- Use existing `migrations` directory pattern
- Follow existing migration implementation in `generate-migration.js`
- Use existing IndexedDB setup from stores
- Ensure backward compatibility during migration

## Considerations for Migration
- Ensure existing character data remains intact
- Handle migration failures gracefully
- Provide fallback options if migration fails
- Test migration with different data sizes

### Internationalization
- Add sheet-specific translation keys following existing patterns
- Use existing i18n setup in components

## Considerations (Based on Current Project)

### Performance
- Use existing virtual scroller if performance becomes an issue
- Follow existing performance patterns from other views
- Implement lazy loading where appropriate

### Security
- Use existing sanitization patterns (sanitize-html already in project)
- Follow existing validation patterns from forms
- Implement proper input sanitization

### Accessibility
- Follow existing accessibility patterns from current components
- Maintain keyboard navigation capabilities
- Use proper ARIA attributes following existing patterns

### Consistency with Existing Code
- Follow existing naming conventions
- Use existing coding patterns and style
- Maintain consistency with existing component architecture
- Follow existing testing patterns with vitest

## Potential Challenges
- Creating an independent sheet system while maintaining optional links to character management
- Maintaining responsive design across different device sizes
- Managing complex layout interactions with existing project patterns
- Balancing feature richness with performance
