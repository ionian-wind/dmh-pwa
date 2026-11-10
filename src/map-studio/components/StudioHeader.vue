<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  name: string;
  autosave: string;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasMaps: boolean;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'save'): void;
  (e: 'apply'): void;
  (e: 'export', format: 'png' | 'webp' | 'jpg'): void;
  (e: 'export-pdf'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <header class="studio-header">
    <div class="row items-center q-gutter-sm">
      <QBtn
        flat
        dense
        round
        icon="tabler-arrow-left"
        :aria-label="t('mapStudio.backToLibrary')"
        @click="emit('back')"
      />
      <span class="text-subtitle1 text-weight-medium">
        {{ name || t('mapStudio.title') }}
      </span>
      <QBadge
        v-if="autosave === 'saving'"
        color="grey-7"
        :label="t('mapStudio.saving')"
      />
      <QBadge
        v-else-if="dirty"
        color="orange-7"
        :label="t('mapStudio.unsaved')"
      />
      <QBadge
        v-else-if="autosave === 'saved'"
        color="green-7"
        :label="t('mapStudio.saved')"
      />
    </div>
    <div class="row items-center q-gutter-xs">
      <QBtn
        flat
        dense
        round
        icon="tabler-undo"
        :disable="!canUndo"
        :aria-label="t('mapStudio.undo')"
        @click="emit('undo')"
      />
      <QBtn
        flat
        dense
        round
        icon="tabler-redo"
        :disable="!canRedo"
        :aria-label="t('mapStudio.redo')"
        @click="emit('redo')"
      />
      <QBtn
        flat
        no-caps
        icon="tabler-device-floppy"
        :label="t('mapStudio.save')"
        @click="emit('save')"
      />
      <QBtn
        v-if="hasMaps"
        flat
        no-caps
        icon="tabler-map-pin"
        :label="t('mapStudio.applyToLocation')"
        @click="emit('apply')"
      />
      <QBtn
        color="primary"
        no-caps
        icon="tabler-download"
        :label="t('mapStudio.export')"
        @click="emit('export', 'png')"
      >
        <QMenu>
          <QList>
            <QItem clickable @click="emit('export', 'png')">
              <QItemSection>PNG</QItemSection>
            </QItem>
            <QItem clickable @click="emit('export', 'webp')">
              <QItemSection>WebP</QItemSection>
            </QItem>
            <QItem clickable @click="emit('export', 'jpg')">
              <QItemSection>JPG</QItemSection>
            </QItem>
            <QItem clickable @click="emit('export-pdf')">
              <QItemSection>PDF</QItemSection>
            </QItem>
          </QList>
        </QMenu>
      </QBtn>
    </div>
  </header>
</template>

<style scoped>
.studio-header {
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 12px;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border-light);
}
</style>
