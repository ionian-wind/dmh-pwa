<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IconEdit, IconEye } from '@tabler/icons-vue';

defineProps<{
  isEditMode: boolean;
  isVisualMode: boolean;
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
            <IconEye :size="18" />
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
            <IconEdit :size="18" />
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
