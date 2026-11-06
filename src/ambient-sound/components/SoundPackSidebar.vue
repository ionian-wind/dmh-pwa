<template>
  <div class="sound-pack-sidebar">
    <div class="sound-pack-sidebar-content">
      <SidebarItem
        title="All packages"
        class="sound-pack-item"
        :class="{ 'is-selected': store.selectedPackId === null }"
        @click="store.selectPack(null)"
      >
        <template #left>
          <IconFolder :size="18" />
        </template>
      </SidebarItem>

      <SidebarItem
        v-for="pack in store.storedPacks"
        :key="pack.id"
        :title="pack.name"
        class="sound-pack-item"
        :class="{ 'is-selected': store.selectedPackId === pack.id }"
        @click="store.selectPack(pack.id)"
      >
        <template #left>
          <component :is="categoryIcon(pack.category)" :size="18" />
        </template>
        <template #actions>
          <QBtn
            flat
            dense
            round
            size="sm"
            color="negative"
            class="sound-pack-delete"
            :title="t('common.delete')"
            :aria-label="t('common.delete')"
            @click.stop="removePack(pack)"
          >
            <IconTrash :size="16" />
          </QBtn>
        </template>
      </SidebarItem>
    </div>

    <div class="sound-pack-sidebar-controls">
      <QSeparator />
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
  IconPlus,
  IconRocket,
  IconTree,
  IconTrash,
  IconUpload,
} from '@tabler/icons-vue';
import SidebarItem from '@/components/common/SidebarItem.vue';
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
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding-top: 0.5rem;
}

.sound-pack-sidebar-controls {
  flex: 0 0 auto;
  margin-top: auto;
  background: var(--color-background);
}

.sound-pack-item {
  cursor: pointer;
}

.sound-pack-item.is-selected {
  background: var(--color-primary-light);
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.hidden-file-input {
  display: none;
}
</style>
