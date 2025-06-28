<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from './Button.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';

interface Props {
  entity: any | null;
  entityName: string;
  listRoute: string;
  onDelete?: () => Promise<void>;
  onEdit?: () => void;
  isEditing?: boolean;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  notFound?: boolean;
  hideHeader?: boolean;
}

const props = withDefaults(defineProps<Props & { sidePanelVisible?: boolean }>(), {
  subtitle: '',
  loading: false,
  notFound: false,
  isEditing: false,
  sidePanelVisible: true,
  hideHeader: false
});

const router = useRouter();
const { t } = useI18n();
const isSidePanelVisible = ref(props.sidePanelVisible);

watch(() => props.sidePanelVisible, (val) => {
  isSidePanelVisible.value = val;
});

const emit = defineEmits(['update:sidePanelVisible']);

const handleEdit = () => {
  if (props.onEdit) {
    props.onEdit();
  }
};

const handleDelete = async () => {
  if (props.onDelete && confirm(`Are you sure you want to delete this ${props.entityName.toLowerCase()}?`)) {
    await props.onDelete();
    router.push(props.listRoute);
  }
};

const toggleSidePanel = () => {
  isSidePanelVisible.value = !isSidePanelVisible.value;
  emit('update:sidePanelVisible', isSidePanelVisible.value);
};
</script>

<template>
  <div class="base-entity-container">
    <div v-if="loading" class="loading-state">{{ t('common.loading') }}</div>
    <NotFoundView v-else-if="notFound" />
    <template v-else-if="entity">
      <ViewHeader v-if="!hideHeader" :title="title">
        <template #subtitle>
          <div v-if="subtitle" class="entity-subtitle">
            {{ subtitle }}
          </div>
          <slot name="sub" />
        </template>
        <template #actions>
          <slot name="actions" />
          <Button v-if="onEdit" @click="handleEdit" :disabled="isEditing" :title="t('common.edit')">
            <i class="si si-pencil"></i>
          </Button>
          <Button v-if="onDelete" variant="danger" @click="handleDelete" :title="t('common.delete')">
            <i class="si si-trash"></i>
          </Button>
        </template>
      </ViewHeader>
      <div class="base-entity-layout">
        <div class="entity-main-column">
          <div class="base-entity-view">
            <div class="entity-content">
              <slot />
            </div>
            <slot name="editor" />
          </div>
          <div v-if="$slots['fixed-bottom']" class="entity-fixed-bottom">
            <slot name="fixed-bottom" />
          </div>
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
