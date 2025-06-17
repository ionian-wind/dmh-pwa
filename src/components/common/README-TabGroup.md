# TabGroup Component

A customizable, feature-rich tab component for organizing content into logical sections.

## Features

- **Multiple Variants**: Default, pills, underline, and cards styles
- **Flexible Sizing**: Small, medium, and large sizes
- **Vertical Layout**: Support for vertical tab navigation
- **Closable Tabs**: Add close buttons to tabs
- **Addable Tabs**: Dynamic tab creation with add button
- **Disabled Tabs**: Support for disabled tab states
- **Icons & Badges**: Rich tab content with icons and badges
- **Full Width**: Option for full-width tab navigation
- **Responsive**: Works on all screen sizes
- **Accessible**: Proper ARIA attributes and keyboard navigation

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import TabGroup, { type Tab } from '@/components/TabGroup.vue';

const tabs = ref<Tab[]>([
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'details', label: 'Details', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
]);

const activeTab = ref('overview');
</script>

<template>
  <TabGroup v-model="activeTab" :tabs="tabs">
    <div v-if="activeTab === 'overview'">
      <h3>Overview Content</h3>
      <p>This is the overview tab content.</p>
    </div>
    <div v-else-if="activeTab === 'details'">
      <h3>Details Content</h3>
      <p>This is the details tab content.</p>
    </div>
    <div v-else-if="activeTab === 'settings'">
      <h3>Settings Content</h3>
      <p>This is the settings tab content.</p>
    </div>
  </TabGroup>
</template>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | `Tab[]` | `[]` | Array of tab objects |
| `modelValue` | `string` | `undefined` | Currently active tab ID |
| `variant` | `'default' \| 'pills' \| 'underline' \| 'cards'` | `'default'` | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Tab size |
| `fullWidth` | `boolean` | `false` | Make tabs take full width |
| `vertical` | `boolean` | `false` | Display tabs vertically |
| `closable` | `boolean` | `false` | Show close buttons on tabs |
| `addable` | `boolean` | `false` | Show add button for new tabs |
| `disableTransition` | `boolean` | `false` | Disable tab switching animations |

## Tab Interface

```typescript
interface Tab {
  id: string;           // Unique identifier
  label: string;        // Display text
  icon?: string;        // Optional icon (emoji or text)
  disabled?: boolean;   // Disable the tab
  badge?: string | number; // Optional badge content
}
```

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string` | Emitted when active tab changes |
| `tab-click` | `Tab` | Emitted when a tab is clicked |
| `tab-close` | `string` | Emitted when a tab is closed (tabId) |
| `tab-add` | - | Emitted when add button is clicked |

## Variants

### Default
Standard tabs with bottom border indicator.

```vue
<TabGroup v-model="activeTab" :tabs="tabs" variant="default">
```

### Pills
Rounded pill-style tabs.

```vue
<TabGroup v-model="activeTab" :tabs="tabs" variant="pills">
```

### Underline
Minimal tabs with underline indicator.

```vue
<TabGroup v-model="activeTab" :tabs="tabs" variant="underline">
```

### Cards
Card-style tabs with shadows.

```vue
<TabGroup v-model="activeTab" :tabs="tabs" variant="cards">
```

## Sizes

### Small
```vue
<TabGroup v-model="activeTab" :tabs="tabs" size="sm">
```

### Medium (Default)
```vue
<TabGroup v-model="activeTab" :tabs="tabs" size="md">
```

### Large
```vue
<TabGroup v-model="activeTab" :tabs="tabs" size="lg">
```

## Advanced Features

### Closable Tabs
```vue
<script setup lang="ts">
const handleTabClose = (tabId: string) => {
  tabs.value = tabs.value.filter(tab => tab.id !== tabId);
  if (activeTab.value === tabId && tabs.value.length > 0) {
    activeTab.value = tabs.value[0].id;
  }
};
</script>

<TabGroup 
  v-model="activeTab" 
  :tabs="tabs" 
  closable 
  @tab-close="handleTabClose"
>
```

### Addable Tabs
```vue
<script setup lang="ts">
let tabCounter = 3;

const handleTabAdd = () => {
  const newTab: Tab = {
    id: `tab${tabCounter}`,
    label: `New Tab ${tabCounter}`,
    icon: '➕'
  };
  tabs.value.push(newTab);
  activeTab.value = newTab.id;
  tabCounter++;
};
</script>

<TabGroup 
  v-model="activeTab" 
  :tabs="tabs" 
  addable 
  @tab-add="handleTabAdd"
>
```

### Vertical Layout
```vue
<TabGroup 
  v-model="activeTab" 
  :tabs="tabs" 
  vertical
>
```

### Full Width
```vue
<TabGroup 
  v-model="activeTab" 
  :tabs="tabs" 
  full-width
>
```

### Disable Transitions
```vue
<TabGroup 
  v-model="activeTab" 
  :tabs="tabs" 
  :disable-transition="true"
>
```

### Disabled Tabs
```vue
const tabs = ref<Tab[]>([
  { id: 'active', label: 'Active', icon: '✅' },
  { id: 'pending', label: 'Pending', icon: '⏳' },
  { id: 'disabled', label: 'Disabled', icon: '❌', disabled: true }
]);
```

### Tabs with Badges
```vue
const tabs = ref<Tab[]>([
  { id: 'inbox', label: 'Inbox', icon: '📥', badge: '12' },
  { id: 'sent', label: 'Sent', icon: '📤', badge: '5' },
  { id: 'drafts', label: 'Drafts', icon: '📝', badge: '3' }
]);
```

## Slot Props

The component provides slot props for advanced usage:

```vue
<TabGroup v-model="activeTab" :tabs="tabs">
  <template #default="{ activeTab, activeTabData }">
    <div>
      <p>Active Tab ID: {{ activeTab }}</p>
      <p>Active Tab Data: {{ activeTabData }}</p>
      <!-- Your content here -->
    </div>
  </template>
</TabGroup>
```

## Styling

The component uses CSS custom properties for theming:

```css
:root {
  --color-primary: #3b82f6;
  --color-primary-dark: #2563eb;
  --color-primary-alpha: rgba(59, 130, 246, 0.1);
  --color-text: #1f2937;
  --color-text-light: #6b7280;
  --color-background: #ffffff;
  --color-background-soft: #f9fafb;
  --color-border: #e5e7eb;
  --border-radius: 0.375rem;
}
```

## Transitions & Animations

The TabGroup component includes smooth transitions when switching between tabs to prevent flickering and provide a better user experience.

### Default Transitions
By default, tab content transitions with a subtle fade and slide effect:
- **Duration**: 0.2 seconds
- **Easing**: Ease function
- **Effect**: Fade opacity + horizontal slide

### Disable Transitions
If you prefer instant tab switching without animations, use the `disableTransition` prop:

```vue
<TabGroup 
  v-model="activeTab" 
  :tabs="tabs" 
  :disable-transition="true"
>
```

### Custom Transitions
You can override the default transitions by adding your own CSS:

```css
/* Custom transition */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
```

## Examples

### Character Sheet
```vue
<TabGroup v-model="activeTab" :tabs="characterTabs" variant="pills">
  <div v-if="activeTab === 'basic'">
    <!-- Basic character info -->
  </div>
  <div v-else-if="activeTab === 'stats'">
    <!-- Ability scores -->
  </div>
  <div v-else-if="activeTab === 'equipment'">
    <!-- Equipment list -->
  </div>
</TabGroup>
```

### Settings Panel
```vue
<TabGroup v-model="activeTab" :tabs="settingsTabs" variant="underline">
  <div v-if="activeTab === 'general'">
    <!-- General settings -->
  </div>
  <div v-else-if="activeTab === 'appearance'">
    <!-- Appearance settings -->
  </div>
  <div v-else-if="activeTab === 'advanced'">
    <!-- Advanced settings -->
  </div>
</TabGroup>
```

### File Browser
```vue
<TabGroup 
  v-model="activeTab" 
  :tabs="fileTabs" 
  variant="cards" 
  closable 
  addable
  @tab-close="handleTabClose"
  @tab-add="handleTabAdd"
>
  <!-- File content -->
</TabGroup>
```

## Demo

Visit `/tabgroup-demo` to see all variants and features in action.

## Browser Support

- Modern browsers with ES6+ support
- Vue 3.x
- TypeScript support included