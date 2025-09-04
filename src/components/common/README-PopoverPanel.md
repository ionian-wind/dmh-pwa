# PopoverPanel Component

A flexible and accessible popover panel component that can be triggered by click, hover, or focus events. The component automatically positions itself relative to the trigger element and includes features like focus trapping, keyboard navigation, and responsive design.

## Features

- **Multiple trigger types**: Click, hover, or focus
- **Flexible positioning**: 12 different placement options with automatic viewport detection
- **Accessibility**: ARIA attributes, keyboard navigation, focus management
- **Responsive**: Automatically adjusts for mobile devices
- **Customizable**: Configurable styling, animations, and behavior
- **TypeScript support**: Fully typed with comprehensive interfaces

## Props

| Prop                  | Type                            | Default    | Description                                          |
| --------------------- | ------------------------------- | ---------- | ---------------------------------------------------- |
| `isOpen`              | `boolean`                       | -          | Controls the visibility of the popover (required)    |
| `trigger`             | `'click' \| 'hover' \| 'focus'` | `'click'`  | How the popover is triggered                         |
| `placement`           | `string`                        | `'bottom'` | Position relative to trigger (see placement options) |
| `offset`              | `number`                        | `8`        | Distance between trigger and popover in pixels       |
| `showArrow`           | `boolean`                       | `true`     | Whether to show the pointing arrow                   |
| `closeOnClickOutside` | `boolean`                       | `true`     | Close when clicking outside the popover              |
| `closeOnEscape`       | `boolean`                       | `true`     | Close when pressing Escape key                       |
| `autoFocus`           | `boolean`                       | `false`    | Automatically focus the first focusable element      |
| `trapFocus`           | `boolean`                       | `false`    | Trap focus within the popover                        |
| `title`               | `string`                        | -          | Optional title for the popover header                |
| `maxWidth`            | `string`                        | `'300px'`  | Maximum width of the popover                         |
| `minWidth`            | `string`                        | `'200px'`  | Minimum width of the popover                         |

### Placement Options

The `placement` prop supports the following values:

- `'top'` - Above the trigger, centered
- `'bottom'` - Below the trigger, centered
- `'left'` - To the left of the trigger, centered
- `'right'` - To the right of the trigger, centered
- `'top-start'` - Above the trigger, aligned to start
- `'top-end'` - Above the trigger, aligned to end
- `'bottom-start'` - Below the trigger, aligned to start
- `'bottom-end'` - Below the trigger, aligned to end
- `'left-start'` - To the left of the trigger, aligned to start
- `'left-end'` - To the left of the trigger, aligned to end
- `'right-start'` - To the right of the trigger, aligned to start
- `'right-end'` - To the right of the trigger, aligned to end

## Events

| Event   | Description                     |
| ------- | ------------------------------- |
| `open`  | Emitted when the popover opens  |
| `close` | Emitted when the popover closes |

## Slots

| Slot      | Description                           |
| --------- | ------------------------------------- |
| `trigger` | The element that triggers the popover |
| `default` | The content inside the popover panel  |

## Exposed Methods

| Method     | Description                          |
| ---------- | ------------------------------------ |
| `open()`   | Programmatically open the popover    |
| `close()`  | Programmatically close the popover   |
| `toggle()` | Toggle the popover open/closed state |

## Usage Examples

### Basic Usage

```vue
<template>
  <PopoverPanel :is-open="isOpen" @close="isOpen = false">
    <template #trigger>
      <Button @click="isOpen = !isOpen"> Click me </Button>
    </template>

    <div>
      <p>This is the popover content!</p>
      <Button @click="isOpen = false">Close</Button>
    </div>
  </PopoverPanel>
</template>

<script setup>
import { ref } from 'vue';
import PopoverPanel from '@/components/common/PopoverPanel.vue';
import Button from '@/components/common/Button.vue';

const isOpen = ref(false);
</script>
```

### Hover Trigger

```vue
<template>
  <PopoverPanel
    :is-open="isOpen"
    trigger="hover"
    placement="top"
    @open="isOpen = true"
    @close="isOpen = false"
  >
    <template #trigger>
      <span class="info-icon">ℹ️</span>
    </template>

    <div>
      <h4>Help Information</h4>
      <p>This is helpful information that appears on hover.</p>
    </div>
  </PopoverPanel>
</template>
```

### With Title and Custom Styling

```vue
<template>
  <PopoverPanel
    :is-open="isOpen"
    title="User Menu"
    placement="bottom-end"
    :max-width="'250px'"
    :auto-focus="true"
    :trap-focus="true"
    @close="isOpen = false"
  >
    <template #trigger>
      <Button @click="isOpen = !isOpen">
        <i class="si si-user"></i>
        Profile
      </Button>
    </template>

    <div class="user-menu">
      <a href="/profile">View Profile</a>
      <a href="/settings">Settings</a>
      <a href="/logout">Logout</a>
    </div>
  </PopoverPanel>
</template>
```

### Focus Trigger with Form

```vue
<template>
  <PopoverPanel
    :is-open="isOpen"
    trigger="focus"
    placement="bottom"
    :auto-focus="true"
    @open="isOpen = true"
    @close="isOpen = false"
  >
    <template #trigger>
      <input type="text" placeholder="Search..." @focus="isOpen = true" />
    </template>

    <div class="search-results">
      <div v-for="result in searchResults" :key="result.id">
        {{ result.name }}
      </div>
    </div>
  </PopoverPanel>
</template>
```

### Programmatic Control

```vue
<template>
  <div>
    <Button @click="openPopover">Open Popover</Button>
    <Button @click="closePopover">Close Popover</Button>

    <PopoverPanel ref="popoverRef" :is-open="isOpen" @close="isOpen = false">
      <template #trigger>
        <span>Trigger Element</span>
      </template>

      <div>Popover content</div>
    </PopoverPanel>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import PopoverPanel from '@/components/common/PopoverPanel.vue';
import Button from '@/components/common/Button.vue';

const isOpen = ref(false);
const popoverRef = ref();

function openPopover() {
  popoverRef.value?.open();
}

function closePopover() {
  popoverRef.value?.close();
}
</script>
```

## Styling

The component uses CSS custom properties from your design system:

- `--color-background` - Background color
- `--color-border` - Border color
- `--color-text` - Text color
- `--border-radius` - Border radius
- `--shadow-lg` - Box shadow
- `--spacing-md` - Padding
- `--transition-normal` - Transition timing

### Custom Styling

You can customize the appearance by overriding CSS variables or using scoped styles:

```vue
<template>
  <PopoverPanel :is-open="isOpen" class="custom-popover">
    <!-- content -->
  </PopoverPanel>
</template>

<style scoped>
.custom-popover :deep(.popover-panel) {
  background: var(--color-primary);
  color: white;
  border: none;
}

.custom-popover :deep(.popover-panel__arrow) {
  background: var(--color-primary);
  border: none;
}
</style>
```

## Accessibility

The component includes several accessibility features:

- **ARIA attributes**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- **Keyboard navigation**: Escape to close, Tab for focus management
- **Focus management**: Auto-focus and focus trapping options
- **Screen reader support**: Proper semantic structure and labels

### Keyboard Shortcuts

- `Escape` - Close the popover (when `closeOnEscape` is true)
- `Tab` - Navigate through focusable elements (when `trapFocus` is true)
- `Shift + Tab` - Navigate backwards through focusable elements

## Best Practices

1. **Always provide a trigger element**: The trigger slot is required and should be a meaningful interactive element.

2. **Use appropriate placement**: Choose placement based on available space and content length.

3. **Handle state properly**: Always manage the `isOpen` state and handle the `close` event.

4. **Consider mobile**: The component automatically adjusts for mobile devices, but test on various screen sizes.

5. **Accessibility**: Use `autoFocus` and `trapFocus` for forms and complex interactions.

6. **Performance**: The component automatically handles cleanup of event listeners and positioning calculations.

## Browser Support

- Modern browsers with ES6+ support
- Vue 3.x
- TypeScript 4.x+

## Dependencies

- Vue 3.x
- No external dependencies

## Related Components

- `BaseModal` - For full-screen modal dialogs
- `Button` - For trigger elements
- `BaseCard` - For consistent card styling
