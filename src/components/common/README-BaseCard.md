# BaseCard Component

A flexible card component that provides a standardized container for displaying content with optional header, content area, and action buttons.

## Features

- **Flexible Layout**: Header, content, and actions sections via slots
- **Built-in Actions**: View, Edit, and Delete buttons with customizable visibility
- **Hover Effects**: Smooth animations and visual feedback
- **Responsive Design**: Adapts to different screen sizes
- **Customizable**: Extensive styling options and slot-based content
- **Accessibility**: Proper semantic structure and keyboard navigation
- **Consistent Styling**: Uses design system variables for theming

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showView` | `boolean` | `false` | Whether to show the "View Details" button |
| `showEdit` | `boolean` | `false` | Whether to show the edit button |
| `showDelete` | `boolean` | `false` | Whether to show the delete button |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `view` | - | Emitted when "View Details" button is clicked |
| `edit` | - | Emitted when edit button is clicked |
| `delete` | - | Emitted when delete button is clicked |

## Slots

| Slot | Description |
|------|-------------|
| `default` | Main content area |
| `header` | Optional header section |
| `actions` | Custom action buttons (overrides built-in buttons) |

## Usage

### Basic Card

```vue
<template>
  <BaseCard>
    <h3>Simple Card</h3>
    <p>This is a basic card with just content.</p>
  </BaseCard>
</template>

<script setup>
import BaseCard from '@/components/common/BaseCard.vue';
</script>
```

### Card with Header

```vue
<template>
  <BaseCard>
    <template #header>
      <h3>Card with Header</h3>
      <span class="card-subtitle">Additional header content</span>
    </template>
    
    <p>This card has a header section with title and subtitle.</p>
    <p>The header is separated from the content with a border.</p>
  </BaseCard>
</template>

<script setup>
import BaseCard from '@/components/common/BaseCard.vue';
</script>
```

### Card with Built-in Actions

```vue
<template>
  <BaseCard
    show-view
    show-edit
    show-delete
    @view="handleView"
    @edit="handleEdit"
    @delete="handleDelete"
  >
    <h3>Card with Actions</h3>
    <p>This card has built-in action buttons.</p>
  </BaseCard>
</template>

<script setup>
import BaseCard from '@/components/common/BaseCard.vue';

const handleView = () => {
  console.log('View clicked');
};

const handleEdit = () => {
  console.log('Edit clicked');
};

const handleDelete = () => {
  console.log('Delete clicked');
};
</script>
```

### Card with Custom Actions

```vue
<template>
  <BaseCard>
    <h3>Card with Custom Actions</h3>
    <p>This card has custom action buttons.</p>
    
    <template #actions>
      <Button variant="primary" size="small" @click="handlePrimary">
        Primary Action
      </Button>
      <Button variant="secondary" size="small" @click="handleSecondary">
        Secondary Action
      </Button>
    </template>
  </BaseCard>
</template>

<script setup>
import BaseCard from '@/components/common/BaseCard.vue';
import Button from '@/components/common/Button.vue';

const handlePrimary = () => {
  console.log('Primary action clicked');
};

const handleSecondary = () => {
  console.log('Secondary action clicked');
};
</script>
```

### Entity Card Example

```vue
<template>
  <BaseCard
    show-view
    show-edit
    show-delete
    @view="viewCharacter"
    @edit="editCharacter"
    @delete="deleteCharacter"
  >
    <template #header>
      <div class="character-header">
        <h3>{{ character.name }}</h3>
        <span class="character-level">Level {{ character.level }}</span>
      </div>
    </template>
    
    <div class="character-info">
      <p><strong>Race:</strong> {{ character.race }}</p>
      <p><strong>Class:</strong> {{ character.class }}</p>
      <p><strong>Background:</strong> {{ character.background }}</p>
    </div>
  </BaseCard>
</template>

<script setup>
import BaseCard from '@/components/common/BaseCard.vue';

const character = ref({
  name: 'Aragorn',
  level: 10,
  race: 'Human',
  class: 'Ranger',
  background: 'Outlander'
});

const viewCharacter = () => {
  console.log('Viewing character:', character.value.name);
};

const editCharacter = () => {
  console.log('Editing character:', character.value.name);
};

const deleteCharacter = () => {
  console.log('Deleting character:', character.value.name);
};
</script>
```

## Styling

The component uses CSS custom properties for theming:

```css
:root {
  --color-background: #fff;
  --color-border: #ddd;
  --border-radius: 8px;
}
```

### CSS Classes

- `.base-card`: Main card container
- `.base-card-header`: Header section with bottom border
- `.base-card-content`: Main content area with padding
- `.base-card-actions`: Action buttons container with top border

### Custom Styling

```vue
<template>
  <BaseCard class="custom-card">
    <h3>Custom Styled Card</h3>
    <p>This card has custom styling applied.</p>
  </BaseCard>
</template>

<style scoped>
.custom-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.custom-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}
</style>
```

## Responsive Behavior

- **Desktop**: Full layout with proper spacing
- **Tablet**: Maintains layout with adjusted padding
- **Mobile**: Responsive padding and button sizing

## Accessibility

- **Semantic Structure**: Proper heading hierarchy and content structure
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus Management**: Visible focus indicators for action buttons
- **Screen Reader Support**: Proper ARIA labels and descriptions

## Best Practices

1. **Use Consistent Layout**: Maintain consistent card structure across your app
2. **Limit Content**: Don't overload cards with too much information
3. **Clear Actions**: Use descriptive action button labels
4. **Proper Hierarchy**: Use appropriate heading levels in card headers
5. **Responsive Images**: Ensure images scale properly on different screen sizes
6. **Loading States**: Consider loading states for dynamic content

## Examples

### Product Card
```vue
<BaseCard show-view @view="viewProduct">
  <template #header>
    <img :src="product.image" :alt="product.name" class="product-image" />
    <h3>{{ product.name }}</h3>
    <span class="product-price">${{ product.price }}</span>
  </template>
  
  <p>{{ product.description }}</p>
  <div class="product-tags">
    <span v-for="tag in product.tags" :key="tag" class="tag">{{ tag }}</span>
  </div>
</BaseCard>
```

### User Profile Card
```vue
<BaseCard show-edit show-delete @edit="editProfile" @delete="deleteProfile">
  <template #header>
    <div class="profile-header">
      <img :src="user.avatar" :alt="user.name" class="avatar" />
      <div class="profile-info">
        <h3>{{ user.name }}</h3>
        <span class="user-role">{{ user.role }}</span>
      </div>
    </div>
  </template>
  
  <div class="profile-details">
    <p><strong>Email:</strong> {{ user.email }}</p>
    <p><strong>Department:</strong> {{ user.department }}</p>
    <p><strong>Location:</strong> {{ user.location }}</p>
  </div>
</BaseCard>
```

### Notification Card
```vue
<BaseCard>
  <template #header>
    <div class="notification-header">
      <span class="notification-icon">🔔</span>
      <h3>{{ notification.title }}</h3>
      <span class="notification-time">{{ formatTime(notification.timestamp) }}</span>
    </div>
  </template>
  
  <p>{{ notification.message }}</p>
  
  <template #actions>
    <Button variant="primary" size="small" @click="markAsRead">
      Mark as Read
    </Button>
    <Button variant="secondary" size="small" @click="dismiss">
      Dismiss
    </Button>
  </template>
</BaseCard>
```

### Dashboard Widget Card
```vue
<BaseCard>
  <template #header>
    <h3>{{ widget.title }}</h3>
    <span class="widget-subtitle">{{ widget.subtitle }}</span>
  </template>
  
  <div class="widget-content">
    <div class="widget-value">{{ widget.value }}</div>
    <div class="widget-change" :class="widget.changeType">
      {{ widget.change }}
    </div>
  </div>
  
  <template #actions>
    <Button variant="secondary" size="small" @click="refreshWidget">
      Refresh
    </Button>
    <Button variant="secondary" size="small" @click="configureWidget">
      Configure
    </Button>
  </template>
</BaseCard>
```

### Blog Post Card
```vue
<BaseCard show-view show-edit show-delete @view="viewPost" @edit="editPost" @delete="deletePost">
  <template #header>
    <div class="post-header">
      <h3>{{ post.title }}</h3>
      <div class="post-meta">
        <span class="post-author">By {{ post.author }}</span>
        <span class="post-date">{{ formatDate(post.date) }}</span>
      </div>
    </div>
  </template>
  
  <p class="post-excerpt">{{ post.excerpt }}</p>
  
  <div class="post-tags">
    <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
  </div>
</BaseCard>
``` 