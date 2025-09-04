# FloatActionButton Component

A customizable floating action button that provides quick access to primary actions. Features intelligent positioning, automatic hiding when modals are open, and responsive behavior.

## Features

- **Smart Positioning**: Automatically adjusts position to avoid footer overlap
- **Modal Integration**: Automatically hides when modals are open
- **Multiple Positions**: Top-left, top-right, bottom-left, bottom-right
- **Size Variants**: Small, medium, and large sizes
- **Color Variants**: Primary, secondary, success, danger, warning
- **Responsive Design**: Adapts to different screen sizes
- **Smooth Animations**: Hover effects and transitions
- **Accessibility**: Keyboard navigation and ARIA support
- **Performance Optimized**: Efficient scroll and resize handling

## Props

| Prop          | Type                                                             | Default          | Description                          |
| ------------- | ---------------------------------------------------------------- | ---------------- | ------------------------------------ |
| `position`    | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'`   | `'bottom-right'` | Position of the button on screen     |
| `size`        | `'small' \| 'medium' \| 'large'`                                 | `'medium'`       | Size of the button                   |
| `variant`     | `'primary' \| 'secondary' \| 'success' \| 'danger' \| 'warning'` | `'primary'`      | Color variant of the button          |
| `disabled`    | `boolean`                                                        | `false`          | Whether the button is disabled       |
| `hideOnModal` | `boolean`                                                        | `true`           | Whether to hide when modals are open |

## Events

| Event   | Payload      | Description                    |
| ------- | ------------ | ------------------------------ |
| `click` | `MouseEvent` | Emitted when button is clicked |

## Usage

### Basic Usage

```vue
<template>
  <FloatActionButton @click="handleClick"> + </FloatActionButton>
</template>

<script setup>
import FloatActionButton from '@/components/common/FloatActionButton.vue';

const handleClick = () => {
  console.log('FAB clicked!');
};
</script>
```

### With Custom Position and Size

```vue
<template>
  <FloatActionButton
    position="top-right"
    size="large"
    variant="success"
    @click="addItem"
  >
    ➕
  </FloatActionButton>
</template>

<script setup>
import FloatActionButton from '@/components/common/FloatActionButton.vue';

const addItem = () => {
  console.log('Adding new item...');
};
</script>
```

### Multiple FABs

```vue
<template>
  <div>
    <!-- Primary action -->
    <FloatActionButton
      position="bottom-right"
      variant="primary"
      @click="createNew"
    >
      ➕
    </FloatActionButton>

    <!-- Secondary action -->
    <FloatActionButton
      position="bottom-left"
      variant="secondary"
      @click="showSettings"
    >
      ⚙️
    </FloatActionButton>
  </div>
</template>

<script setup>
import FloatActionButton from '@/components/common/FloatActionButton.vue';

const createNew = () => {
  console.log('Creating new item...');
};

const showSettings = () => {
  console.log('Opening settings...');
};
</script>
```

### With Disabled State

```vue
<template>
  <FloatActionButton
    :disabled="isLoading"
    variant="primary"
    @click="handleAction"
  >
    {{ isLoading ? '⏳' : '➕' }}
  </FloatActionButton>
</template>

<script setup>
import { ref } from 'vue';
import FloatActionButton from '@/components/common/FloatActionButton.vue';

const isLoading = ref(false);

const handleAction = async () => {
  isLoading.value = true;
  try {
    await performAction();
  } finally {
    isLoading.value = false;
  }
};
</script>
```

## Positioning Behavior

The component intelligently handles positioning:

### Default Behavior

- **Bottom-right**: Standard position, 20px from edges
- **Footer Avoidance**: Automatically adjusts to stay 50px above footer
- **Responsive**: Maintains proper spacing on all screen sizes

### Position Variants

```vue
<!-- Top-left corner -->
<FloatActionButton position="top-left">📝</FloatActionButton>

<!-- Top-right corner -->
<FloatActionButton position="top-right">🔍</FloatActionButton>

<!-- Bottom-left corner -->
<FloatActionButton position="bottom-left">📞</FloatActionButton>

<!-- Bottom-right corner (default) -->
<FloatActionButton position="bottom-right">➕</FloatActionButton>
```

## Size Variants

```vue
<!-- Small (48px) -->
<FloatActionButton size="small">➕</FloatActionButton>

<!-- Medium (56px) - default -->
<FloatActionButton size="medium">➕</FloatActionButton>

<!-- Large (64px) -->
<FloatActionButton size="large">➕</FloatActionButton>
```

## Color Variants

```vue
<!-- Primary (blue) -->
<FloatActionButton variant="primary">➕</FloatActionButton>

<!-- Secondary (gray) -->
<FloatActionButton variant="secondary">⚙️</FloatActionButton>

<!-- Success (green) -->
<FloatActionButton variant="success">✅</FloatActionButton>

<!-- Danger (red) -->
<FloatActionButton variant="danger">🗑️</FloatActionButton>

<!-- Warning (yellow) -->
<FloatActionButton variant="warning">⚠️</FloatActionButton>
```

## Modal Integration

The component automatically integrates with the global modal state:

```vue
<template>
  <div>
    <!-- This FAB will automatically hide when any modal is open -->
    <FloatActionButton @click="openModal"> ➕ </FloatActionButton>

    <!-- This FAB will always be visible -->
    <FloatActionButton
      :hide-on-modal="false"
      position="top-right"
      @click="emergencyAction"
    >
      🚨
    </FloatActionButton>
  </div>
</template>
```

## Styling

The component uses CSS custom properties for theming:

```css
:root {
  --color-primary: #2196f3;
  --color-primary-dark: #1976d2;
  --color-secondary: #6c757d;
  --color-secondary-dark: #545b62;
  --color-success: #28a745;
  --color-success-dark: #1e7e34;
  --color-danger: #dc3545;
  --color-danger-dark: #c82333;
  --color-warning: #ffc107;
  --color-warning-dark: #e0a800;
}
```

### CSS Classes

- `.float-action-button`: Main button container
- `.float-action-button--{position}`: Position-specific styling
- `.float-action-button--{size}`: Size-specific styling
- `.float-action-button--{variant}`: Color variant styling
- `.float-action-button--disabled`: Disabled state
- `.float-action-button--hidden`: Hidden state (when modal is open)
- `.float-action-button--near-footer`: When positioned near footer

## Performance Features

- **Debounced Scroll Handling**: Uses `requestAnimationFrame` for smooth performance
- **MutationObserver**: Watches for DOM changes that might affect positioning
- **Passive Event Listeners**: Optimized scroll and resize event handling
- **Memory Management**: Proper cleanup of event listeners and observers

## Accessibility

- **Keyboard Navigation**: Tab-accessible and Enter/Space activation
- **ARIA Support**: Proper `aria-label` and `role` attributes
- **Focus Management**: Visible focus indicators
- **Screen Reader Support**: Descriptive content and state announcements

## Best Practices

1. **Use for Primary Actions**: Reserve FABs for the most important actions
2. **Limit Quantity**: Use at most 2-3 FABs per page to avoid clutter
3. **Clear Icons**: Use intuitive icons that clearly represent the action
4. **Consistent Positioning**: Use consistent positions across your app
5. **Consider Mobile**: Ensure touch targets are large enough (minimum 44px)
6. **Provide Alternatives**: Always provide alternative ways to access the same functionality

## Examples

### E-commerce App

```vue
<template>
  <div>
    <!-- Add to cart FAB -->
    <FloatActionButton
      position="bottom-right"
      variant="primary"
      @click="addToCart"
    >
      🛒
    </FloatActionButton>

    <!-- Wishlist FAB -->
    <FloatActionButton
      position="bottom-left"
      variant="secondary"
      @click="addToWishlist"
    >
      ❤️
    </FloatActionButton>
  </div>
</template>
```

### Social Media App

```vue
<template>
  <div>
    <!-- Create post FAB -->
    <FloatActionButton
      position="bottom-right"
      variant="primary"
      @click="createPost"
    >
      ✏️
    </FloatActionButton>

    <!-- Camera FAB -->
    <FloatActionButton
      position="top-right"
      variant="success"
      @click="openCamera"
    >
      📷
    </FloatActionButton>
  </div>
</template>
```

### Dashboard App

```vue
<template>
  <div>
    <!-- Quick add FAB -->
    <FloatActionButton
      position="bottom-right"
      variant="primary"
      @click="quickAdd"
    >
      ➕
    </FloatActionButton>

    <!-- Settings FAB -->
    <FloatActionButton
      position="top-right"
      variant="secondary"
      @click="openSettings"
    >
      ⚙️
    </FloatActionButton>

    <!-- Help FAB -->
    <FloatActionButton position="top-left" variant="warning" @click="showHelp">
      ❓
    </FloatActionButton>
  </div>
</template>
```

### Task Management App

```vue
<template>
  <div>
    <!-- Add task FAB -->
    <FloatActionButton
      position="bottom-right"
      variant="success"
      @click="addTask"
    >
      ✅
    </FloatActionButton>

    <!-- Quick note FAB -->
    <FloatActionButton
      position="bottom-left"
      variant="secondary"
      @click="addNote"
    >
      📝
    </FloatActionButton>
  </div>
</template>
```
