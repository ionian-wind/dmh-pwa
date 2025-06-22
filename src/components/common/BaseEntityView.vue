<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { ref } from 'vue';
import Button from './Button.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';

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
const isSidePanelVisible = ref(true);

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

const toggleSidePanel = () => {
  isSidePanelVisible.value = !isSidePanelVisible.value;
};
</script>

<template>
  <div class="base-entity-container">
    <div v-if="loading" class="loading-state">Loading...</div>
    <NotFoundView v-else-if="notFound" />
    <template v-else-if="entity">
      <ViewHeader :title="title">
        <template #subtitle>
          <div v-if="subtitle" class="entity-subtitle">
            {{ subtitle }}
          </div>
          <slot name="sub" />
        </template>
        <template #actions>
          <Button v-if="onEdit" @click="handleEdit" :disabled="isEditing" title="Edit">
            <i class="si si-pencil"></i>
          </Button>
          <Button variant="danger" @click="handleDelete" title="Delete">
            <i class="si si-trash"></i>
          </Button>
        </template>
      </ViewHeader>
      <div class="base-entity-layout">
        <div class="base-entity-view">
          <div class="entity-content">
            <slot />
          </div>

          <!-- Editor Modal -->
          <slot name="editor" />
        </div>

        <!-- Side Panel -->
        <div v-if="$slots.sidepanel" class="sidebar-wrapper" :class="{ collapsed: !isSidePanelVisible }">
          <div class="side-panel-toggle-handle" @click="toggleSidePanel">
            <i :class="isSidePanelVisible ? 'si si-chevron-right' : 'si si-chevron-left'"></i>
          </div>
          <div class="side-panel">
            <slot name="sidepanel" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.base-entity-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--header-height));
  overflow: hidden;
}

.base-entity-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}

.base-entity-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.entity-subtitle {
  display: flex;
  gap: 1rem;
  color: var(--color-text-light);
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.entity-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 2rem;
}

.sidebar-wrapper {
  display: flex;
  width: calc(300px + 16px);
  flex-shrink: 0;
  transition: width 0.3s ease;
  border-right: 1px solid #ccc;
}

.sidebar-wrapper.collapsed {
  width: 16px;
}

.side-panel {
  width: 300px;
  background-color: var(--color-background-soft);
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.side-panel-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.side-panel-toggle-handle {
  width: 16px;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: linear-gradient(-90deg,rgb(249, 249, 249) 0%, rgb(240, 240, 240) 100%);
  border-left: 1px solid #ccc;
  border-right: 1px solid #ccc;
}

@media (max-width: 1024px) {
  .sidebar-wrapper {
    display: none;
  }
}

@media (max-width: 768px) {
  .entity-content {
    padding: 1rem;
  }
}
</style> 
