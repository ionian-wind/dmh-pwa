# BaseModal Component

A comprehensive modal dialog component with built-in accessibility features, keyboard navigation, and history management.

## Features

- **Accessibility**: Full keyboard navigation, ARIA support, and focus management
- **History Integration**: Automatic browser history management with back button support
- **Keyboard Shortcuts**: ESC key to close, Enter key for submit
- **Click Outside**: Click outside modal to close
- **Body Scroll Lock**: Prevents background scrolling when modal is open
- **Global State**: Integrates with global modal state management
- **Flexible Content**: Supports any content via slots
- **Customizable Actions**: Built-in submit/cancel buttons with custom labels
- **Responsive Design**: Mobile-friendly with proper sizing and positioning

## Props

| Prop          | Type      | Default     | Description                        |
| ------------- | --------- | ----------- | ---------------------------------- |
| `isOpen`      | `boolean` | -           | Controls modal visibility          |
| `title`       | `string`  | -           | Modal title displayed in header    |
| `showSubmit`  | `boolean` | `false`     | Whether to show submit button      |
| `showCancel`  | `boolean` | `false`     | Whether to show cancel button      |
| `submitLabel` | `string`  | `'Save'`    | Label for submit button            |
| `cancelLabel` | `string`  | `'Cancel'`  | Label for cancel button            |
| `modalId`     | `string`  | `undefined` | Optional ID for global modal state |

## Events

| Event    | Payload | Description                                                                   |
| -------- | ------- | ----------------------------------------------------------------------------- |
| `submit` | -       | Emitted when submit button is clicked or form is submitted                    |
| `cancel` | -       | Emitted when modal is closed (ESC, click outside, cancel button, back button) |

## Slots

| Slot      | Description                                        |
| --------- | -------------------------------------------------- |
| `default` | Main modal content                                 |
| `actions` | Custom action buttons (overrides built-in buttons) |

## Usage

### Basic Modal

```vue
<template>
  <BaseModal
    :is-open="isModalOpen"
    title="Confirm Action"
    show-submit
    show-cancel
    submit-label="Confirm"
    cancel-label="Cancel"
    @submit="handleConfirm"
    @cancel="closeModal"
  >
    <p>Are you sure you want to perform this action?</p>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';

const isModalOpen = ref(false);

const handleConfirm = () => {
  console.log('Action confirmed!');
  isModalOpen.value = false;
};

const closeModal = () => {
  isModalOpen.value = false;
};
</script>
```

### Form Modal

```vue
<template>
  <BaseModal
    :is-open="isModalOpen"
    title="Edit User"
    show-submit
    show-cancel
    @submit="handleSubmit"
    @cancel="closeModal"
  >
    <form @submit.prevent="$emit('submit')">
      <div class="form-group">
        <label for="name">Name:</label>
        <input id="name" v-model="form.name" type="text" required />
      </div>

      <div class="form-group">
        <label for="email">Email:</label>
        <input id="email" v-model="form.email" type="email" required />
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';

const isModalOpen = ref(false);
const form = ref({
  name: '',
  email: '',
});

const handleSubmit = () => {
  console.log('Form submitted:', form.value);
  isModalOpen.value = false;
};

const closeModal = () => {
  isModalOpen.value = false;
};
</script>
```

### Custom Actions

```vue
<template>
  <BaseModal :is-open="isModalOpen" title="Custom Actions" @cancel="closeModal">
    <p>This modal has custom action buttons.</p>

    <template #actions>
      <Button variant="danger" @click="handleDelete"> Delete </Button>
      <Button variant="secondary" @click="handleArchive"> Archive </Button>
      <Button variant="primary" @click="handleSave"> Save </Button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import Button from '@/components/common/Button.vue';

const isModalOpen = ref(false);

const handleDelete = () => {
  console.log('Delete action');
  isModalOpen.value = false;
};

const handleArchive = () => {
  console.log('Archive action');
  isModalOpen.value = false;
};

const handleSave = () => {
  console.log('Save action');
  isModalOpen.value = false;
};

const closeModal = () => {
  isModalOpen.value = false;
};
</script>
```

### Complex Content Modal

```vue
<template>
  <BaseModal
    :is-open="isModalOpen"
    title="Character Details"
    show-cancel
    @cancel="closeModal"
  >
    <div class="character-modal">
      <div class="character-header">
        <h3>{{ character.name }}</h3>
        <span class="character-level">Level {{ character.level }}</span>
      </div>

      <div class="character-stats">
        <div class="stat-grid">
          <div class="stat-item">
            <span class="stat-label">STR</span>
            <span class="stat-value">{{ character.stats.str }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">DEX</span>
            <span class="stat-value">{{ character.stats.dex }}</span>
          </div>
          <!-- More stats... -->
        </div>
      </div>

      <div class="character-abilities">
        <h4>Abilities</h4>
        <ul>
          <li v-for="ability in character.abilities" :key="ability.name">
            <strong>{{ ability.name }}:</strong> {{ ability.description }}
          </li>
        </ul>
      </div>
    </div>
  </BaseModal>
</template>
```

## Keyboard Navigation

- **ESC**: Closes the modal
- **Enter**: Submits the form (if focus is on submit button)
- **Tab**: Navigates through focusable elements
- **Shift+Tab**: Navigates backwards through focusable elements

## Browser History Integration

The modal automatically manages browser history:

- **Opening**: Pushes a new history state
- **Closing**: Removes the modal state from history
- **Back Button**: Automatically closes the modal when back button is pressed

## Global Modal State

The modal integrates with the global modal state system:

```typescript
// The modal automatically calls these when opened/closed:
openModal(modalId); // When opened
closeModal(modalId); // When closed
```

## Styling

The component uses CSS custom properties for theming:

```css
:root {
  --color-background: #fff;
  --color-text: #333;
  --color-border: #ddd;
  --border-radius: 8px;
}
```

### CSS Classes

- `.modal`: Main modal overlay
- `.modal-dialog`: Modal dialog container
- `.modal-header`: Header section with title
- `.modal-form`: Form wrapper for submit handling
- `.modal-scrollable`: Scrollable content area
- `.modal-actions`: Action buttons container

## Accessibility Features

- **ARIA Attributes**: Proper `role`, `aria-label`, and `aria-describedby`
- **Focus Management**: Traps focus within modal when open
- **Screen Reader Support**: Proper heading structure and announcements
- **Keyboard Navigation**: Full keyboard accessibility
- **Click Outside**: Accessible click outside detection

## Best Practices

1. **Always provide a title**: Helps with accessibility and user understanding
2. **Use semantic HTML**: Wrap form content in `<form>` tags for proper submit handling
3. **Handle all close scenarios**: Implement proper cleanup in cancel handler
4. **Provide meaningful labels**: Use descriptive submit/cancel button labels
5. **Consider content length**: Use scrollable content for long modals
6. **Test keyboard navigation**: Ensure all interactive elements are keyboard accessible

## Examples

### Confirmation Dialog

```vue
<BaseModal
  :is-open="showConfirm"
  title="Delete Item"
  show-submit
  show-cancel
  submit-label="Delete"
  cancel-label="Cancel"
  @submit="confirmDelete"
  @cancel="cancelDelete"
>
  <p>Are you sure you want to delete this item? This action cannot be undone.</p>
</BaseModal>
```

### Settings Modal

```vue
<BaseModal
  :is-open="showSettings"
  title="Application Settings"
  show-submit
  show-cancel
  @submit="saveSettings"
  @cancel="closeSettings"
>
  <div class="settings-form">
    <div class="setting-group">
      <label>
        <input type="checkbox" v-model="settings.darkMode" />
        Enable Dark Mode
      </label>
    </div>
    <div class="setting-group">
      <label>
        <input type="checkbox" v-model="settings.notifications" />
        Enable Notifications
      </label>
    </div>
  </div>
</BaseModal>
```

### Image Viewer Modal

```vue
<BaseModal
  :is-open="showImage"
  title="Image Preview"
  show-cancel
  @cancel="closeImage"
>
  <div class="image-viewer">
    <img :src="selectedImage.url" :alt="selectedImage.alt" />
    <div class="image-info">
      <p>{{ selectedImage.description }}</p>
      <p>Size: {{ selectedImage.width }} × {{ selectedImage.height }}</p>
    </div>
  </div>
</BaseModal>
```
