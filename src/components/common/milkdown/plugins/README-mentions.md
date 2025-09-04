# Mentions Plugin for Milkdown/Crepe

This plugin adds mention functionality to the Milkdown/Crepe editor, allowing users to insert links to other entities (notes, modules, parties, monsters, encounters) in their content.

## Features

### 1. Toolbar Mentions
- Adds a "Mentions" group to the editor toolbar
- Provides buttons for each entity type (Note, Module, Party, Monster, Encounter)
- Clicking a button inserts a mention at the current cursor position

### 2. BlockEdit Mentions
- Adds a "Mentions" section to the slash menu (BlockEdit feature)
- Available when typing `/` in the editor
- Provides the same entity types as the toolbar
- Inserts mention markdown at the cursor position

## Entity Types

The plugin supports the following entity types:

- **Note**: `[Note Title](note://id)`
- **Module**: `[Module Name](module://id)`
- **Party**: `[Party Name](party://id)`
- **Monster**: `[Monster Name](monster://id)`
- **Encounter**: `[Encounter Name](encounter://id)`

## Usage

### In Toolbar
1. Click the "Mentions" group in the toolbar
2. Select the desired entity type
3. The mention will be inserted at the current cursor position

### In BlockEdit (Slash Menu)
1. Type `/` in the editor
2. Navigate to the "Mentions" section
3. Select the desired entity type
4. The mention will be inserted at the current cursor position

## Implementation

### Files
- `mention.ts` - Main plugin implementation
- `MilkdownEditor.vue` - Editor component with feature configuration

### Key Functions
- `buildMentionToolbar()` - Builds toolbar buttons for mentions
- `buildMentionMenu()` - Builds BlockEdit menu items for mentions
- `mentionFeature()` - Registers the mention mark schema
- `insertMentionCommand()` - Command for inserting mentions

### Configuration
The plugin is configured in `MilkdownEditor.vue`:

```typescript
featureConfigs: {
  [CrepeFeature.Toolbar]: {
    buildToolbar: buildMentionToolbar,
  },
  [CrepeFeature.BlockEdit]: {
    buildMenu: buildMentionMenu,
  },
}
```

## Markdown Format

Mentions are stored in markdown format as:
```markdown
[Entity Title](entity-type://entity-id)
```

This format allows for:
- Human-readable titles
- Machine-readable entity type and ID
- Standard markdown link syntax
- Easy parsing and rendering

## Integration

The plugin integrates with:
- **MilkdownEditor.vue** - Main editor component
- **MarkdownEditor.vue** - Wrapper component for markdown editing
- **NoteEditor.vue** - Note editing interface
- Other editor components that use the Milkdown/Crepe system

## Future Enhancements

Potential improvements:
- Entity search/autocomplete in mentions
- Mention validation (check if entity exists)
- Mention suggestions based on context
- Rich mention display with entity details
- Mention analytics and tracking 