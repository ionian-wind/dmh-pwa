<template>
  <div class="q-pa-md sound-pack-sidebar">
    <div class="sound-pack-sidebar-content">
      <div class="text-subtitle1 text-weight-medium q-mb-md">
        {{ t('ambientSoundPage.soundPacks') }}
      </div>

      <SoundPackSelector />

      <div
        v-if="store.storedPacks.length === 0"
        class="text-caption text-grey-7 q-mt-sm"
      >
        {{ t('ambientSoundPage.importHint') }}
      </div>
    </div>

    <div class="sound-pack-sidebar-controls">
      <QSeparator />
      <QList>
        <QItem clickable v-ripple @click="goToEditor">
          <QItemSection>
            {{ t('ambientSoundPage.createPack') }}
          </QItemSection>
          <QItemSection side>
            <IconPlus :size="18" />
          </QItemSection>
        </QItem>
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
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { IconPlus, IconUpload } from '@tabler/icons-vue';
import SoundPackSelector from '@/ambient-sound/components/SoundPackSelector.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const { t } = useI18n();
const store = useAmbientSoundStore();
const router = useRouter();
const fileInput = ref<HTMLInputElement | null>(null);

function goToEditor() {
  router.push('/ambient-sound/editor');
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
}

.sound-pack-sidebar-controls {
  flex: 0 0 auto;
  margin-top: auto;
  background: var(--color-background);
}

.hidden-file-input {
  display: none;
}
</style>
