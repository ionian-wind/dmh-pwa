# Button Component

A versatile button component with multiple variants, sizes, and states. Built with accessibility in mind and designed to work seamlessly with your design system.

## Features

- **Multiple Variants**: Primary, secondary, danger, success, warning
- **Size Options**: Small, medium, large
- **Loading State**: Built-in loading spinner with disabled state
- **Accessibility**: Full keyboard navigation and ARIA support
- **Responsive Design**: Adapts to different screen sizes
- **Customizable**: Extensive styling options and slot-based content
- **Type Support**: Button, submit, and reset types
- **Focus Management**: Visible focus indicators for all variants

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'success' \| 'warning'` | `'primary'` | Color variant of the button |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Size of the button |
| `disabled` | `boolean` | `false` | Whether the button is disabled |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `loading` | `boolean` | `false` | Whether to show loading state |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `MouseEvent` | Emitted when button is clicked |

## Slots

| Slot | Description |
|------|-------------|
| `default` | Button content (text, icons, etc.) |

## Usage

### Basic Button

```vue
<template>
  <Button @click="handleClick">
    Click Me
  </Button>
</template>

<script setup>
import Button from '@/components/common/Button.vue';

const handleClick = () => {
  console.log('Button clicked!');
};
</script>
```

### Button Variants

```vue
<template>
  <div class="button-examples">
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="success">Success</Button>
    <Button variant="danger">Danger</Button>
    <Button variant="warning">Warning</Button>
  </div>
</template>

<script setup>
import Button from '@/components/common/Button.vue';
</script>
```

### Button Sizes

```vue
<template>
  <div class="button-sizes">
    <Button size="small">Small</Button>
    <Button size="medium">Medium</Button>
    <Button size="large">Large</Button>
  </div>
</template>

<script setup>
import Button from '@/components/common/Button.vue';
</script>
```

### Loading State

```vue
<template>
  <div class="loading-examples">
    <Button :loading="isLoading" @click="handleAsyncAction">
      {{ isLoading ? 'Loading...' : 'Submit' }}
    </Button>
    
    <Button :loading="isLoading" disabled>
      Disabled Loading
    </Button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Button from '@/components/common/Button.vue';

const isLoading = ref(false);

const handleAsyncAction = async () => {
  isLoading.value = true;
  try {
    await performAsyncOperation();
  } finally {
    isLoading.value = false;
  }
};
</script>
```

### Form Buttons

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="formData.name" placeholder="Name" required />
    
    <div class="form-actions">
      <Button type="submit" :loading="isSubmitting">
        {{ isSubmitting ? 'Saving...' : 'Save' }}
      </Button>
      <Button type="reset" variant="secondary">
        Reset
      </Button>
    </div>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import Button from '@/components/common/Button.vue';

const formData = ref({ name: '' });
const isSubmitting = ref(false);

const handleSubmit = async () => {
  isSubmitting.value = true;
  try {
    await saveData(formData.value);
  } finally {
    isSubmitting.value = false;
  }
};
</script>
```

### Button with Icons

```vue
<template>
  <div class="icon-buttons">
    <Button variant="primary">
      <span class="icon">➕</span>
      Add Item
    </Button>
    
    <Button variant="secondary">
      <span class="icon">✏️</span>
      Edit
    </Button>
    
    <Button variant="danger">
      <span class="icon">🗑️</span>
      Delete
    </Button>
  </div>
</template>

<script setup>
import Button from '@/components/common/Button.vue';
</script>

<style scoped>
.icon-buttons {
  display: flex;
  gap: 1rem;
}

.icon {
  margin-right: 0.5rem;
}
</style>
```

## Variants

### Primary (Default)
```vue
<Button variant="primary">Primary Button</Button>
```
- **Use for**: Main actions, primary CTAs
- **Color**: Blue background with white text
- **Hover**: Darker blue background

### Secondary
```vue
<Button variant="secondary">Secondary Button</Button>
```
- **Use for**: Secondary actions, less important actions
- **Color**: Gray background with dark text
- **Hover**: Darker gray background

### Success
```vue
<Button variant="success">Success Button</Button>
```
- **Use for**: Positive actions, confirmations
- **Color**: Green background with white text
- **Hover**: Darker green background

### Danger
```vue
<Button variant="danger">Danger Button</Button>
```
- **Use for**: Destructive actions, deletions
- **Color**: Red background with white text
- **Hover**: Darker red background

### Warning
```vue
<Button variant="warning">Warning Button</Button>
```
- **Use for**: Cautionary actions, warnings
- **Color**: Yellow background with dark text
- **Hover**: Darker yellow background

## Sizes

### Small
```vue
<Button size="small">Small Button</Button>
```
- **Height**: 2rem (32px)
- **Padding**: 0.375rem 0.75rem
- **Font Size**: 0.875rem
- **Use for**: Compact interfaces, inline actions

### Medium (Default)
```vue
<Button size="medium">Medium Button</Button>
```
- **Height**: 2.5rem (40px)
- **Padding**: 0.5rem 1rem
- **Font Size**: 1rem
- **Use for**: Standard buttons, most use cases

### Large
```vue
<Button size="large">Large Button</Button>
```
- **Height**: 3rem (48px)
- **Padding**: 0.75rem 1.5rem
- **Font Size**: 1.125rem
- **Use for**: Prominent actions, mobile-friendly

## States

### Normal State
```vue
<Button>Normal Button</Button>
```
- Fully interactive
- Hover effects enabled
- Focus indicators visible

### Disabled State
```vue
<Button disabled>Disabled Button</Button>
```
- Not interactive
- Reduced opacity
- No hover effects
- Still focusable for accessibility

### Loading State
```vue
<Button :loading="true">Loading Button</Button>
```
- Shows spinner animation
- Disabled interaction
- Maintains button size
- Prevents multiple clicks

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
  --border-radius: 8px;
}
```

### CSS Classes

- `.btn`: Main button container
- `.btn--{variant}`: Variant-specific styling
- `.btn--{size}`: Size-specific styling
- `.btn--disabled`: Disabled state styling
- `.btn__loading`: Loading state container
- `.btn__spinner`: Loading spinner animation

### Custom Styling

```vue
<template>
  <Button class="custom-button">
    Custom Styled Button
  </Button>
</template>

<style scoped>
.custom-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.custom-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}
</style>
```

## Accessibility

### Keyboard Navigation
- **Tab**: Navigate to button
- **Enter/Space**: Activate button
- **Focus**: Visible focus indicators

### ARIA Support
- Proper `role` attributes
- `aria-disabled` for disabled state
- `aria-busy` for loading state
- Screen reader announcements

### Focus Management
- Visible focus indicators for all variants
- Proper focus colors for different button types
- Maintains focus during loading states

## Best Practices

1. **Use Descriptive Text**: Make button text clear and actionable
2. **Choose Appropriate Variants**: Use variants that match the action's importance
3. **Consider Loading States**: Use loading states for async operations
4. **Provide Alternatives**: Ensure keyboard-only users can access all functionality
5. **Test Interactions**: Verify all states work correctly
6. **Consistent Sizing**: Use consistent button sizes within the same interface

## Examples

### Action Buttons
```vue
<template>
  <div class="action-buttons">
    <Button variant="primary" @click="save">
      Save Changes
    </Button>
    <Button variant="secondary" @click="cancel">
      Cancel
    </Button>
    <Button variant="danger" @click="delete">
      Delete
    </Button>
  </div>
</template>
```

### Form Actions
```vue
<template>
  <form @submit.prevent="submit">
    <!-- Form fields -->
    
    <div class="form-actions">
      <Button type="submit" :loading="isSubmitting" variant="primary">
        {{ isSubmitting ? 'Submitting...' : 'Submit' }}
      </Button>
      <Button type="button" variant="secondary" @click="reset">
        Reset
      </Button>
    </div>
  </form>
</template>
```

### Confirmation Dialog
```vue
<template>
  <div class="confirmation-dialog">
    <p>Are you sure you want to delete this item?</p>
    
    <div class="dialog-actions">
      <Button variant="danger" @click="confirmDelete">
        Delete
      </Button>
      <Button variant="secondary" @click="cancel">
        Cancel
      </Button>
    </div>
  </div>
</template>
```

### Toolbar Buttons
```vue
<template>
  <div class="toolbar">
    <Button size="small" variant="secondary">
      <span class="icon">📁</span>
      Open
    </Button>
    <Button size="small" variant="secondary">
      <span class="icon">💾</span>
      Save
    </Button>
    <Button size="small" variant="secondary">
      <span class="icon">🖨️</span>
      Print
    </Button>
  </div>
</template>
```

### Status Actions
```vue
<template>
  <div class="status-actions">
    <Button variant="success" @click="approve">
      ✅ Approve
    </Button>
    <Button variant="warning" @click="review">
      ⚠️ Review
    </Button>
    <Button variant="danger" @click="reject">
      ❌ Reject
    </Button>
  </div>
</template>
``` 