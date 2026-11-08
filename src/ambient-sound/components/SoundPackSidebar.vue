<template>
  <div class="sound-pack-sidebar">
    <QList class="q-pa-none q-mb-none">
      <QItem
        clickable
        v-ripple
        class="sound-pack-item"
        :class="{ 'is-selected': store.selectedPackId === null }"
        @click="store.selectPack(null)"
      >
        <QItemSection side>
          <IconFolder :size="18" />
        </QItemSection>
        <QItemSection>
          {{ t('ambientSoundPage.allPackages') }}
        </QItemSection>
      </QItem>
    </QList>

    <QSeparator />

    <QScrollArea class="sound-pack-sidebar-content col-grow">
      <QList class="q-pa-none q-mb-none">
        <QItem
          v-for="pack in store.storedPacks"
          :key="pack.id"
          clickable
          v-ripple
          class="sound-pack-item"
          :class="{ 'is-selected': store.selectedPackId === pack.id }"
          @click="store.selectPack(pack.id)"
        >
          <QItemSection side>
            <component :is="categoryIcon(pack.category)" :size="18" />
          </QItemSection>
          <QItemSection>
            {{ pack.name }}
          </QItemSection>
          <QItemSection side class="sound-pack-actions">
            <QBtn
              flat
              dense
              size="sm"
              color="negative"
              class="sound-pack-delete"
              :title="t('common.delete')"
              :aria-label="t('common.delete')"
              @click.stop="removePack(pack)"
            >
              <IconTrash :size="18" />
            </QBtn>
          </QItemSection>
        </QItem>
      </QList>
    </QScrollArea>

    <QSeparator />

    <div class="sound-pack-sidebar-controls">
      <QList>
        <QItem clickable v-ripple @click="triggerFileInput">
          <QItemSection>
            {{ t('ambientSoundPage.importPack') }}
          </QItemSection>
          <QItemSection side>
            <IconUpload :size="18" />
          </QItemSection>
        </QItem>
      </QList>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".spk"
      class="hidden-file-input"
      @change="handleFileImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, type Component } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconAlertTriangle,
  IconBuilding,
  IconEdit,
  IconFolder,
  IconRocket,
  IconTree,
  IconTrash,
  IconUpload,
} from '@tabler/icons-vue';
import { confirm } from '@/dialogs';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { NormalizedSoundPack } from '@/ambient-sound/types';

const { t } = useI18n();
const store = useAmbientSoundStore();
const fileInput = ref<HTMLInputElement | null>(null);

const categoryIcons: Record<string, Component> = {
  fantasy: IconTree,
  scifi: IconRocket,
  horror: IconAlertTriangle,
  modern: IconBuilding,
  custom: IconEdit,
};

function categoryIcon(category: string): Component {
  return categoryIcons[category] || IconFolder;
}

async function removePack(pack: NormalizedSoundPack) {
  if (
    !(await confirm(
      t('ambientSoundPage.deletePackConfirm', { name: pack.name }),
    ))
  ) {
    return;
  }
  await store.deletePack(pack.id);
}

function triggerFileInput() {
  fileInput.value?.click();
}

async function handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    await store.importPack(file);
    target.value = '';
  }
}
</script>

<style scoped>
.sound-pack-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.sound-pack-sidebar-content {
  min-height: 0;
}

.sound-pack-sidebar-controls {
  flex: 0 0 auto;
}

.sound-pack-item {
  cursor: pointer;
}

.sound-pack-item.is-selected {
  background: var(--color-primary-light);
  color: var(--color-text);
}

.sound-pack-actions {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.sound-pack-item:hover .sound-pack-actions,
.sound-pack-item:focus-within .sound-pack-actions {
  opacity: 1;
}

.hidden-file-input {
  display: none;
}
</style>
