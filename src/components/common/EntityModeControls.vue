<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  isEditMode: boolean;
  isVisualMode: boolean;
  onDelete?: () => void | Promise<void>;
}>();

const emit = defineEmits<{
  (e: 'update:isEditMode', value: boolean): void;
  (e: 'update:isVisualMode', value: boolean): void;
}>();

const { t } = useI18n();
</script>

<template>
  <QList class="entity-mode-controls">
    <QItem v-if="isEditMode" class="entity-visual-mode-toggle">
      <QItemSection>
        {{ t('markdownEditor.visualMode') }}
      </QItemSection>
      <QItemSection side>
        <QToggle
          :model-value="isVisualMode"
          @update:model-value="(value) => emit('update:isVisualMode', value)"
        />
      </QItemSection>
    </QItem>

    <QItem v-if="isEditMode && onDelete" class="entity-delete-action">
      <QItemSection>
        <QBtn
          class="full-width entity-delete-button"
          color="negative"
          :title="t('common.delete')"
          :aria-label="t('common.delete')"
          @click="onDelete?.()"
        >
          <QIcon name="tabler-trash" size="18px" class="q-mr-sm" />
          {{ t('common.delete') }}
        </QBtn>
      </QItemSection>
    </QItem>

    <QItem class="entity-mode-toggle">
      <QItemSection>
        <QBtnGroup spread class="full-width">
          <QBtn
            class="entity-view-mode"
            color="primary"
            :outline="isEditMode"
            :title="t('common.viewMode')"
            :aria-label="t('common.viewMode')"
            :aria-pressed="!isEditMode"
            @click="emit('update:isEditMode', false)"
          >
            <QIcon name="tabler-eye" size="18px" />
          </QBtn>
          <QBtn
            class="entity-edit-mode"
            color="primary"
            :outline="!isEditMode"
            :title="t('common.editMode')"
            :aria-label="t('common.editMode')"
            :aria-pressed="isEditMode"
            @click="emit('update:isEditMode', true)"
          >
            <QIcon name="tabler-edit" size="18px" />
          </QBtn>
        </QBtnGroup>
      </QItemSection>
    </QItem>
  </QList>
</template>

<style scoped>
.entity-mode-controls {
  flex: 0 0 auto;
}
</style>
