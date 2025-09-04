# ToggleSwitch Component

A customizable toggle switch component with smooth animations, multiple sizes, and full accessibility support. Perfect for boolean settings and state toggles.

## Features

- **Smooth Animations**: CSS transitions for smooth state changes
- **Multiple Sizes**: Small, medium, and large size variants
- **Accessibility**: Full keyboard navigation and ARIA support
- **Customizable**: Custom colors, labels, and styling options
- **Form Integration**: Works with v-model for reactive state
- **Disabled State**: Visual and functional disabled state
- **Loading State**: Optional loading indicator
- **Responsive Design**: Adapts to different screen sizes

## Props

| Prop          | Type                             | Default     | Description                           |
| ------------- | -------------------------------- | ----------- | ------------------------------------- |
| `modelValue`  | `boolean`                        | `false`     | Current state of the toggle (v-model) |
| `disabled`    | `boolean`                        | `false`     | Whether the toggle is disabled        |
| `loading`     | `boolean`                        | `false`     | Whether to show loading state         |
| `size`        | `'small' \| 'medium' \| 'large'` | `'medium'`  | Size of the toggle switch             |
| `label`       | `string`                         | `undefined` | Optional label text                   |
| `description` | `string`                         | `undefined` | Optional description text             |

## Events

| Event               | Payload   | Description                       |
| ------------------- | --------- | --------------------------------- |
| `update:modelValue` | `boolean` | Emitted when toggle state changes |
| `change`            | `boolean` | Emitted when toggle state changes |

## Slots

| Slot      | Description                                 |
| --------- | ------------------------------------------- |
| `default` | Custom label content (overrides label prop) |

## Usage

### Basic Toggle

```vue
<template>
  <ToggleSwitch v-model="isEnabled" />
</template>

<script setup>
import { ref } from 'vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';

const isEnabled = ref(false);
</script>
```

### Toggle with Label

```vue
<template>
  <ToggleSwitch
    v-model="darkMode"
    label="Dark Mode"
    description="Enable dark theme for the application"
  />
</template>

<script setup>
import { ref } from 'vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';

const darkMode = ref(false);
</script>
```

### Different Sizes

```vue
<template>
  <div class="toggle-sizes">
    <ToggleSwitch v-model="setting1" size="small" label="Small Toggle" />
    <ToggleSwitch v-model="setting2" size="medium" label="Medium Toggle" />
    <ToggleSwitch v-model="setting3" size="large" label="Large Toggle" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';

const setting1 = ref(false);
const setting2 = ref(true);
const setting3 = ref(false);
</script>
```

### Disabled and Loading States

```vue
<template>
  <div class="toggle-states">
    <ToggleSwitch v-model="enabled" label="Enabled Toggle" />

    <ToggleSwitch v-model="disabled" :disabled="true" label="Disabled Toggle" />

    <ToggleSwitch v-model="loading" :loading="true" label="Loading Toggle" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';

const enabled = ref(true);
const disabled = ref(false);
const loading = ref(true);
</script>
```

### Custom Label Content

```vue
<template>
  <ToggleSwitch v-model="notifications">
    <template #default>
      <div class="custom-label">
        <span class="label-text">Push Notifications</span>
        <span class="label-icon">🔔</span>
      </div>
    </template>
  </ToggleSwitch>
</template>

<script setup>
import { ref } from 'vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';

const notifications = ref(true);
</script>

<style scoped>
.custom-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.label-icon {
  font-size: 1.2rem;
}
</style>
```

## Sizes

### Small

```vue
<ToggleSwitch size="small" v-model="setting" label="Small Toggle" />
```

- **Height**: 1.5rem (24px)
- **Width**: 2.5rem (40px)
- **Use for**: Compact interfaces, inline toggles

### Medium (Default)

```vue
<ToggleSwitch size="medium" v-model="setting" label="Medium Toggle" />
```

- **Height**: 2rem (32px)
- **Width**: 3.5rem (56px)
- **Use for**: Standard toggles, most use cases

### Large

```vue
<ToggleSwitch size="large" v-model="setting" label="Large Toggle" />
```

- **Height**: 2.5rem (40px)
- **Width**: 4.5rem (72px)
- **Use for**: Prominent toggles, mobile-friendly

## States

### Normal State

```vue
<ToggleSwitch v-model="setting" label="Normal Toggle" />
```

- Fully interactive
- Smooth animations
- Hover effects enabled

### Disabled State

```vue
<ToggleSwitch v-model="setting" :disabled="true" label="Disabled Toggle" />
```

- Not interactive
- Reduced opacity
- No hover effects
- Still focusable for accessibility

### Loading State

```vue
<ToggleSwitch v-model="setting" :loading="true" label="Loading Toggle" />
```

- Shows loading animation
- Disabled interaction
- Maintains toggle size
- Prevents state changes

## Styling

The component uses CSS custom properties for theming:

```css
:root {
  --color-primary: #2196f3;
  --color-primary-dark: #1976d2;
  --color-background: #fff;
  --color-border: #ddd;
  --color-text: #333;
  --color-text-light: #666;
  --border-radius: 9999px;
}
```

### CSS Classes

- `.toggle-switch`: Main toggle container
- `.toggle-switch--{size}`: Size-specific styling
- `.toggle-switch--disabled`: Disabled state styling
- `.toggle-switch--loading`: Loading state styling
- `.toggle-switch__input`: Hidden input element
- `.toggle-switch__track`: Toggle track/background
- `.toggle-switch__thumb`: Toggle thumb/knob
- `.toggle-switch__label`: Label container
- `.toggle-switch__loading`: Loading indicator

### Custom Styling

```vue
<template>
  <ToggleSwitch class="custom-toggle" v-model="setting" />
</template>

<style scoped>
.custom-toggle {
  --color-primary: #ff6b6b;
  --color-primary-dark: #ee5a52;
}

.custom-toggle .toggle-switch__track {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.custom-toggle .toggle-switch__thumb {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
</style>
```

## Accessibility

### Keyboard Navigation

- **Tab**: Navigate to toggle
- **Space/Enter**: Toggle state
- **Focus**: Visible focus indicators

### ARIA Support

- Proper `role="switch"` attribute
- `aria-checked` for current state
- `aria-disabled` for disabled state
- `aria-label` for screen readers

### Screen Reader Support

- State announcements
- Label descriptions
- Loading state announcements

## Best Practices

1. **Use Clear Labels**: Provide descriptive labels that explain the toggle's purpose
2. **Group Related Toggles**: Use consistent styling for related settings
3. **Consider Loading States**: Use loading states for async operations
4. **Test Keyboard Navigation**: Ensure all interactions work with keyboard
5. **Provide Context**: Use descriptions to explain the impact of toggling
6. **Consistent Sizing**: Use consistent sizes within the same interface

## Examples

### Settings Panel

```vue
<template>
  <div class="settings-panel">
    <h3>Application Settings</h3>

    <div class="setting-item">
      <ToggleSwitch
        v-model="settings.darkMode"
        label="Dark Mode"
        description="Enable dark theme for better eye comfort"
      />
    </div>

    <div class="setting-item">
      <ToggleSwitch
        v-model="settings.notifications"
        label="Push Notifications"
        description="Receive notifications for important updates"
      />
    </div>

    <div class="setting-item">
      <ToggleSwitch
        v-model="settings.autoSave"
        label="Auto Save"
        description="Automatically save changes every 5 minutes"
      />
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';

const settings = reactive({
  darkMode: false,
  notifications: true,
  autoSave: true,
});
</script>
```

### Feature Flags

```vue
<template>
  <div class="feature-flags">
    <h3>Feature Flags</h3>

    <div class="flag-item">
      <ToggleSwitch
        v-model="flags.newUI"
        label="New User Interface"
        description="Enable the redesigned user interface"
      />
    </div>

    <div class="flag-item">
      <ToggleSwitch
        v-model="flags.betaFeatures"
        label="Beta Features"
        description="Enable experimental features"
      />
    </div>

    <div class="flag-item">
      <ToggleSwitch
        v-model="flags.analytics"
        label="Analytics"
        description="Collect usage analytics to improve the app"
      />
    </div>
  </div>
</template>
```

### Form Controls

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <div class="form-group">
      <ToggleSwitch
        v-model="formData.terms"
        label="I agree to the terms and conditions"
        description="You must accept the terms to continue"
      />
    </div>

    <div class="form-group">
      <ToggleSwitch
        v-model="formData.marketing"
        label="Receive marketing emails"
        description="Get updates about new features and promotions"
      />
    </div>

    <Button type="submit" :disabled="!formData.terms"> Submit </Button>
  </form>
</template>
```

### Permission Controls

```vue
<template>
  <div class="permissions">
    <h3>User Permissions</h3>

    <div class="permission-item">
      <ToggleSwitch
        v-model="permissions.read"
        label="Read Access"
        description="Allow user to view content"
      />
    </div>

    <div class="permission-item">
      <ToggleSwitch
        v-model="permissions.write"
        label="Write Access"
        description="Allow user to create and edit content"
      />
    </div>

    <div class="permission-item">
      <ToggleSwitch
        v-model="permissions.admin"
        label="Admin Access"
        description="Full administrative privileges"
      />
    </div>
  </div>
</template>
```

### Loading States

```vue
<template>
  <div class="async-toggles">
    <div class="toggle-item">
      <ToggleSwitch
        v-model="asyncSettings.sync"
        :loading="isSyncing"
        label="Auto Sync"
        description="Automatically sync data with cloud"
        @change="handleSyncToggle"
      />
    </div>

    <div class="toggle-item">
      <ToggleSwitch
        v-model="asyncSettings.backup"
        :loading="isBackingUp"
        label="Auto Backup"
        description="Automatically backup data"
        @change="handleBackupToggle"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';

const asyncSettings = reactive({
  sync: false,
  backup: true,
});

const isSyncing = ref(false);
const isBackingUp = ref(false);

const handleSyncToggle = async (value) => {
  isSyncing.value = true;
  try {
    await updateSyncSetting(value);
  } finally {
    isSyncing.value = false;
  }
};

const handleBackupToggle = async (value) => {
  isBackingUp.value = true;
  try {
    await updateBackupSetting(value);
  } finally {
    isBackingUp.value = false;
  }
};
</script>
```
