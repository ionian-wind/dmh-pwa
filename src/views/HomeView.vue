<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseListView from '@/components/common/BaseListView.vue';
import StatCard from '@/components/StatCard.vue';
import { backupAllStores, restoreAllStores } from '@/utils/storage';
import { saveBlob } from '@/utils/files';
import { reloadPage } from '@/utils/reloadPage';
import { useConfigStore } from '@/utils/configStore';
import { alert } from '@/dialogs';
import { featureHomeCards } from 'virtual:feature-home-cards';
import { featureHomeActions } from 'virtual:feature-home-actions';

const configStore = useConfigStore();
const { t } = useI18n();

const statsCards = computed(() =>
  [...featureHomeCards]
    .sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000))
    .map((card) => ({
      id: card.id,
      key: card.id,
      title: card.titleKey,
      count: card.count(),
      icon: card.icon,
      route: card.route,
    })),
);

onMounted(async () => {
  await Promise.all(featureHomeCards.map((card) => card.load()));
});

function downloadBlob(blob: Blob, filename: string) {
  return saveBlob(blob, {
    suggestedName: filename,
    mimeType: 'application/zip',
    description: 'Backup archive',
  });
}

async function handleBackup() {
  try {
    const blob = await backupAllStores({
      includeExternalFiles: configStore.backupIncludeExternalFiles,
    });
    await downloadBlob(
      blob,
      `dmh-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.zip`,
    );
    await alert(t('backup.backupCompleted'));
  } catch (e) {
    await alert(
      t('backup.backupFailed') + (e instanceof Error ? e.message : e),
    );
  }
}

async function handleRestore(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  try {
    await restoreAllStores(file);
    await alert(t('backup.restoreCompleted'));
    // Reloading the page is the simplest way to refresh every store,
    // including timers, bookmarks, jukebox data, and the mention index.
    reloadPage();
  } catch (e) {
    await alert(
      t('backup.restoreFailed') + (e instanceof Error ? e.message : e),
    );
  }
  input.value = '';
}
</script>

<template>
  <div class="q-pa-md q-gutter-md" style="max-width: 1200px; margin: 0 auto">
    <div class="q-pa-xl q-mb-xl text-center">
      <div class="q-mb-md flex flex-center column items-center">
        <img
          src="/dmh-pwa/icon-192.png"
          :alt="t('project.name') + ' Icon'"
          style="width: 150px; height: 150px"
        />
        <div class="q-mt-md">
          <h1 class="text-h2 text-bold">{{ t('project.name') }}</h1>
          <p class="text-subtitle1 text-grey-7 q-mt-xs">
            {{ t('project.subtitle') }}
          </p>
        </div>
      </div>

      <!-- Backup/Restore/Import Actions -->
      <div class="q-mt-lg flex flex-center q-gutter-md">
        <QBtn
          color="primary"
          :label="t('backup.backup')"
          @click="handleBackup"
        />
        <QBtn color="grey-7" :label="t('backup.restore')">
          <input
            type="file"
            accept=".zip"
            @change="handleRestore"
            style="
              position: absolute;
              opacity: 0;
              width: 100%;
              height: 100%;
              cursor: pointer;
            "
          />
        </QBtn>
        <component
          v-for="(action, index) in featureHomeActions"
          :is="action"
          :key="index"
        />
      </div>
    </div>
    <BaseListView
      :items="statsCards"
      :card-component="StatCard"
      :card-props="(item: any) => ({ item })"
      :empty-message="t('common.empty')"
      :create-title="t('common.create')"
      :show-search="false"
      view-style="grid"
      :hide-header="true"
    />
  </div>
</template>
