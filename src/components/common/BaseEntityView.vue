<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import Button from './Button.vue';
import NotFoundView from '@/views/NotFoundView.vue';

interface Props {
  entity: any | null;
  entityName: string;
  listRoute: string;
  onDelete: () => Promise<void>;
  onEdit?: () => void;
  isEditing?: boolean;
  title: string;
  subtitle?: string;
  loading?: boolean;
  notFound?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  loading: false,
  notFound: false,
  isEditing: false
});

const emit = defineEmits<{
  (e: 'edit'): void;
  (e: 'delete'): void;
}>();

const route = useRoute();
const router = useRouter();

const handleEdit = () => {
  if (props.onEdit) {
    props.onEdit();
  }
};

const handleDelete = async () => {
  if (confirm(`Are you sure you want to delete this ${props.entityName.toLowerCase()}?`)) {
    await props.onDelete();
    router.push(props.listRoute);
  }
};

const handleGoBack = () => {
  router.push(props.listRoute);
};
</script>

<template>
  <div class="base-entity-container">
    <NotFoundView v-if="notFound" />
    <div v-else-if="entity" class="base-entity-view">
      <!-- Header -->
      <div class="entity-header">
        <div class="header-content">
          <h1>{{ title }}</h1>
          <div v-if="subtitle" class="entity-subtitle">
            {{ subtitle }}
          </div>
          <slot name="sub" />
        </div>
        <div class="header-actions">
          <Button v-if="onEdit" @click="handleEdit" :disabled="isEditing" title="Edit">✏️</Button>
          <Button variant="danger" @click="handleDelete" title="Delete">🗑️</Button>
        </div>
      </div>

      <!-- Content -->
      <div class="entity-content">
        <slot />
      </div>

      <!-- Editor Modal -->
      <slot name="editor" />
    </div>
  </div>
</template>

<style scoped>
.base-entity-container {
  width: 100%;
}

.base-entity-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.entity-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--color-border);
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 2.5rem;
}

.entity-subtitle {
  display: flex;
  gap: 1rem;
  color: var(--color-text-light);
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.entity-content {
  background: var(--color-background);
  border-radius: var(--border-radius);
  padding: 2rem;
}

@media (max-width: 768px) {
  .base-entity-view {
    padding: 1rem;
  }
  
  .entity-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-actions {
    width: 100%;
    justify-content: center;
  }
}
</style> 
