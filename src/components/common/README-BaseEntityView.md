# BaseEntityView Component

A reusable layout component that provides a standardized view structure for displaying entity details with header actions, content area, and optional editor modal.

## Features

- **Standardized Layout**: Consistent header with title, subtitle, and action buttons
- **Flexible Content**: Content area with slot for custom entity display
- **Action Buttons**: Built-in Edit, Delete, and Back buttons with customizable visibility
- **Editor Integration**: Optional editor modal slot for inline editing
- **Responsive Design**: Mobile-friendly layout with responsive breakpoints
- **Navigation**: Automatic routing to list views and entity management
- **Loading States**: Support for loading and not found states

## Props

| Prop         | Type                  | Default     | Description                                                 |
| ------------ | --------------------- | ----------- | ----------------------------------------------------------- |
| `entity`     | `any \| null`         | -           | The entity object to display                                |
| `entityName` | `string`              | -           | Name of the entity type (used in buttons and confirmations) |
| `listRoute`  | `string`              | -           | Route to navigate to when clicking "Back" button            |
| `onDelete`   | `() => Promise<void>` | -           | Function to handle entity deletion                          |
| `onEdit`     | `() => void`          | `undefined` | Optional function to handle edit action                     |
| `isEditing`  | `boolean`             | `false`     | Whether the entity is currently being edited                |
| `title`      | `string`              | -           | Main title displayed in the header                          |
| `subtitle`   | `string`              | `''`        | Optional subtitle displayed below the title                 |
| `loading`    | `boolean`             | `false`     | Whether to show loading state                               |
| `notFound`   | `boolean`             | `false`     | Whether to show not found state                             |

## Events

| Event    | Payload | Description                           |
| -------- | ------- | ------------------------------------- |
| `edit`   | -       | Emitted when edit button is clicked   |
| `delete` | -       | Emitted when delete button is clicked |

## Slots

| Slot      | Description                                     |
| --------- | ----------------------------------------------- |
| `default` | Main content area for displaying entity details |
| `editor`  | Optional slot for editor modal or form          |

## Usage

### Basic Usage

```vue
<template>
  <BaseEntityView
    :entity="character"
    entity-name="Character"
    list-route="/characters"
    title="Aragorn"
    subtitle="Level 10 Ranger"
    :on-delete="deleteCharacter"
    :on-edit="startEditing"
    :is-editing="isEditing"
  >
    <!-- Entity content -->
    <div class="character-details">
      <p>Race: Human</p>
      <p>Class: Ranger</p>
      <p>Level: 10</p>
    </div>

    <!-- Editor modal -->
    <template #editor>
      <CharacterEditor
        v-if="isEditing"
        :character="character"
        @submit="saveCharacter"
        @cancel="cancelEditing"
      />
    </template>
  </BaseEntityView>
</template>

<script setup>
import { ref } from 'vue';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import CharacterEditor from '@/components/CharacterEditor.vue';

const character = ref({
  name: 'Aragorn',
  race: 'Human',
  class: 'Ranger',
  level: 10,
});
const isEditing = ref(false);

const deleteCharacter = async () => {
  // Handle character deletion
  console.log('Deleting character...');
};

const startEditing = () => {
  isEditing.value = true;
};

const saveCharacter = (updatedCharacter) => {
  // Handle character save
  character.value = updatedCharacter;
  isEditing.value = false;
};

const cancelEditing = () => {
  isEditing.value = false;
};
</script>
```

### With Loading State

```vue
<BaseEntityView
  :entity="character"
  entity-name="Character"
  list-route="/characters"
  title="Loading Character..."
  :loading="isLoading"
  :on-delete="deleteCharacter"
>
  <div v-if="!isLoading" class="character-details">
    <!-- Character content -->
  </div>
</BaseEntityView>
```

### With Not Found State

```vue
<BaseEntityView
  :entity="character"
  entity-name="Character"
  list-route="/characters"
  title="Character Not Found"
  :not-found="!character"
  :on-delete="deleteCharacter"
>
  <div v-if="character" class="character-details">
    <!-- Character content -->
  </div>
</BaseEntityView>
```

## Styling

The component uses CSS custom properties for theming:

```css
:root {
  --color-text: #333;
  --color-text-light: #666;
  --color-border: #ddd;
  --color-background: #fff;
  --border-radius: 8px;
}
```

### CSS Classes

- `.base-entity-container`: Main container wrapper
- `.base-entity-view`: Main view container with max-width and padding
- `.entity-header`: Header section with title and actions
- `.header-content`: Title and subtitle container
- `.entity-subtitle`: Subtitle styling
- `.header-actions`: Action buttons container
- `.entity-content`: Main content area

## Responsive Behavior

- **Desktop**: Header displays with title on left, actions on right
- **Mobile**: Header stacks vertically with actions below title
- **Tablet**: Responsive breakpoint at 768px

## Accessibility

- Proper heading hierarchy with h1 for main title
- Keyboard navigation support for action buttons
- ARIA labels and roles for interactive elements
- Focus management for modal interactions

## Best Practices

1. **Always provide entity data**: The component expects an entity object or null
2. **Use descriptive titles**: Make titles clear and meaningful
3. **Handle loading states**: Show loading indicators for async data
4. **Provide delete confirmation**: The component includes a basic confirmation dialog
5. **Use consistent routing**: Ensure list routes are consistent across your app
6. **Implement proper error handling**: Handle cases where entities don't exist

## Examples

### Monster View

```vue
<BaseEntityView
  :entity="monster"
  entity-name="Monster"
  list-route="/monsters"
  title="Dragon"
  subtitle="Ancient Red Dragon - CR 20"
  :on-delete="deleteMonster"
  :on-edit="editMonster"
>
  <MonsterStats :monster="monster" />
  <MonsterAbilities :monster="monster" />
</BaseEntityView>
```

### Encounter View

```vue
<BaseEntityView
  :entity="encounter"
  entity-name="Encounter"
  list-route="/encounters"
  title="Goblin Ambush"
  subtitle="Forest Trail - Medium Difficulty"
  :on-delete="deleteEncounter"
  :on-edit="editEncounter"
>
  <EncounterDetails :encounter="encounter" />
  <MonsterList :monsters="encounter.monsters" />
</BaseEntityView>
```
