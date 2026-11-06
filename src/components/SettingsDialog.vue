<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import { useConfigStore } from '@/utils/configStore';
import router from '@/router';
import { confirm } from '@/dialogs';
import { clearAllAppData, reloadAppFromMainPage } from '@/utils/appReset';
import { debugError } from '@/utils/debug';
import {
  formatBytes,
  getFileStorageDiagnostics,
  migrateAllBlobFilesToOpfs,
  pickFiles,
  relinkStoredFile,
  requestPersistentStorage,
  type FileStorageDiagnostics,
} from '@/utils/files';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const { t } = useI18n();
const configStore = useConfigStore();
const isClearingStorage = ref(false);
const isRequestingPersistence = ref(false);
const isLoadingStorage = ref(false);
const isReconnecting = ref(false);
const isMigrating = ref(false);
const reconnectStatus = ref('');
const persistenceStatus = ref<'granted' | 'denied' | null>(null);
const storage = ref<FileStorageDiagnostics | null>(null);

const storageUsage = computed(() => {
  const info = storage.value;
  if (!info) return '';
  if (!info.supported || info.quota === null) {
    return t('settings.storageUsageUnknown');
  }
  return t('settings.storageUsage', {
    used: formatBytes(info.usage ?? 0),
    quota: formatBytes(info.quota),
  });
});

const storageFiles = computed(() =>
  storage.value
    ? t('settings.storageFiles', { count: storage.value.fileCount })
    : '',
);

const storageBreakdown = computed(() =>
  storage.value
    ? t('settings.storageBreakdown', {
        blob: storage.value.byKind.blob,
        opfs: storage.value.byKind.opfs,
        handle: storage.value.byKind.handle,
      })
    : '',
);

async function loadStorage() {
  isLoadingStorage.value = true;
  try {
    storage.value = await getFileStorageDiagnostics();
  } catch (error) {
    debugError('Failed to read storage diagnostics:', error);
    storage.value = null;
  } finally {
    isLoadingStorage.value = false;
  }
}

async function requestPersistence() {
  isRequestingPersistence.value = true;
  try {
    const granted = await requestPersistentStorage();
    await loadStorage();
    persistenceStatus.value =
      granted || storage.value?.persisted ? 'granted' : 'denied';
  } finally {
    isRequestingPersistence.value = false;
  }
}

async function reconnectFiles() {
  const unavailable = storage.value?.unavailableFiles ?? [];
  if (!unavailable.length) return;

  isReconnecting.value = true;
  try {
    const picked = await pickFiles({ multiple: true, description: 'Files' });
    let reconnected = 0;

    for (const record of unavailable) {
      const match =
        picked.find(
          (entry) =>
            entry.file.name === record.name &&
            (!record.size || entry.file.size === record.size),
        ) ?? picked.find((entry) => entry.file.name === record.name);
      if (!match) continue;

      await relinkStoredFile(record.id, match.file, match.source);
      reconnected += 1;
    }

    reconnectStatus.value = t('settings.reconnectedFiles', {
      count: reconnected,
    });
    await loadStorage();
  } finally {
    isReconnecting.value = false;
  }
}

async function migrateStorage() {
  isMigrating.value = true;
  try {
    const migrated = await migrateAllBlobFilesToOpfs();
    reconnectStatus.value = t('settings.migratedFiles', { count: migrated });
    await loadStorage();
  } finally {
    isMigrating.value = false;
  }
}

onMounted(loadStorage);
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      persistenceStatus.value = null;
      void loadStorage();
    }
  },
);

function close() {
  emit('update:modelValue', false);
}

function helpHref(path: string): string {
  return router.resolve(`/help/${path}`).href;
}

function openHelp(path: string) {
  close();
  void router.push(`/help/${path}`);
}

async function clearStorage() {
  const confirmed = await confirm(t('settings.clearStorageConfirm'), {
    force: true,
    title: t('settings.clearStorage'),
    okText: t('settings.clearStorageButton'),
    cancelText: t('common.cancel'),
    okColor: 'negative',
  });
  if (!confirmed) return;

  isClearingStorage.value = true;
  try {
    await clearAllAppData();
    reloadAppFromMainPage();
  } catch (error) {
    debugError('Failed to clear app storage:', error);
    isClearingStorage.value = false;
  }
}
</script>

<template>
  <BaseModal
    :is-open="modelValue"
    modal-id="settings-modal"
    :title="t('settings.title')"
    :show-cancel="true"
    :cancel-label="t('common.close')"
    :show-submit="false"
    @cancel="close"
    @update:is-open="emit('update:modelValue', $event)"
  >
    <section class="q-mb-lg" data-test="settings-interface">
      <h5 class="q-mt-none q-mb-sm">{{ t('settings.interface') }}</h5>
      <QList separator>
        <QItem>
          <QItemSection>
            <div>{{ t('settings.language') }}</div>
            <div class="text-caption text-grey-7">
              {{ t('settings.languageHint') }}
            </div>
          </QItemSection>
          <QItemSection side>
            <LanguageSwitcher />
          </QItemSection>
        </QItem>
        <QItem>
          <QItemSection>
            <div>{{ t('settings.confirmDeletion') }}</div>
            <div class="text-caption text-grey-7">
              {{ t('settings.confirmDeletionHint') }}
            </div>
          </QItemSection>
          <QItemSection side>
            <QToggle v-model="configStore.confirmDelete" />
          </QItemSection>
        </QItem>
        <QItem>
          <QItemSection>
            <div>{{ t('settings.expandMenu') }}</div>
            <div class="text-caption text-grey-7">
              {{ t('settings.expandMenuHint') }}
            </div>
          </QItemSection>
          <QItemSection side>
            <QToggle v-model="configStore.expandMenu" />
          </QItemSection>
        </QItem>
      </QList>
    </section>

    <section data-test="settings-player">
      <h5 class="q-mt-none q-mb-sm">{{ t('settings.player') }}</h5>
      <QList separator>
        <QItem>
          <QItemSection>
            <div>{{ t('jukebox.smoothTrackChange') }}</div>
            <div class="text-caption text-grey-7">
              {{ t('settings.smoothTrackChangeHint') }}
            </div>
          </QItemSection>
          <QItemSection side>
            <QToggle v-model="configStore.jukeboxSmoothTrackChange" />
          </QItemSection>
        </QItem>
        <QItem>
          <QItemSection>
            <div>{{ t('jukebox.animatePlayerBackground') }}</div>
            <div class="text-caption text-grey-7">
              {{ t('settings.animatePlayerBackgroundHint') }}
            </div>
          </QItemSection>
          <QItemSection side>
            <QToggle v-model="configStore.jukeboxAnimatePlayerBackground" />
          </QItemSection>
        </QItem>
        <QItem>
          <QItemSection>
            <div>{{ t('jukebox.displayCoverWhilePlaying') }}</div>
            <div class="text-caption text-grey-7">
              {{ t('settings.displayCoverWhilePlayingHint') }}
            </div>
          </QItemSection>
          <QItemSection side>
            <QToggle v-model="configStore.jukeboxDisplayCoverWhilePlaying" />
          </QItemSection>
        </QItem>
        <QItem>
          <QItemSection>
            <div>{{ t('jukebox.useMiniPlayer') }}</div>
            <div class="text-caption text-grey-7">
              {{ t('settings.useMiniPlayerHint') }}
            </div>
          </QItemSection>
          <QItemSection side>
            <QToggle v-model="configStore.jukeboxUseMiniPlayer" />
          </QItemSection>
        </QItem>
      </QList>
    </section>

    <section class="q-mt-lg" data-test="settings-content">
      <h5 class="q-mt-none q-mb-sm">{{ t('settings.content') }}</h5>
      <QList separator>
        <QItem data-test="settings-storage">
          <QItemSection>
            <div>{{ t('settings.storage') }}</div>
            <div class="text-caption text-grey-7">
              {{ t('settings.storageHint') }}
            </div>
            <div v-if="storage" class="text-caption text-grey-7">
              {{ storageBreakdown }}
            </div>
            <div
              v-if="storage?.unavailableCount"
              class="text-caption text-negative"
            >
              {{
                t('settings.storageUnavailable', {
                  count: storage.unavailableCount,
                })
              }}
            </div>
          </QItemSection>
          <QItemSection side class="text-right">
            <QSpinner v-if="isLoadingStorage" size="18px" color="primary" />
            <div v-else class="text-caption">{{ storageUsage }}</div>
            <div
              v-if="!isLoadingStorage && storage"
              class="text-caption text-grey-7"
            >
              {{ storageFiles }}
            </div>
          </QItemSection>
        </QItem>
        <QItem data-test="settings-persistence">
          <QItemSection>
            <div>{{ t('settings.storagePersistent') }}</div>
            <div class="text-caption text-grey-7">
              {{ t('settings.storagePersistentHint') }}
            </div>
            <template v-if="persistenceStatus">
              <div
                v-if="persistenceStatus === 'granted'"
                class="text-caption text-positive"
                data-test="settings-persistence-message"
              >
                {{ t('settings.storagePersistentGrantedMessage') }}
              </div>
              <i18n-t
                v-else
                keypath="settings.storagePersistentDeniedMessage"
                tag="div"
                class="text-caption text-negative"
                data-test="settings-persistence-message"
              >
                <template #install>
                  <a
                    class="help-link"
                    :href="helpHref('getting-started/install')"
                    @click.prevent="openHelp('getting-started/install')"
                  >
                    {{ t('settings.storagePersistentInstallLink') }}
                  </a>
                </template>
                <template #settings>
                  <a
                    class="help-link"
                    :href="helpHref('troubleshooting/persistent-storage')"
                    @click.prevent="
                      openHelp('troubleshooting/persistent-storage')
                    "
                  >
                    {{ t('settings.storagePersistentSettingsLink') }}
                  </a>
                </template>
              </i18n-t>
            </template>
          </QItemSection>
          <QItemSection side>
            <div v-if="storage" class="text-caption q-mb-xs">
              {{
                storage.persisted
                  ? t('settings.storagePersistentGranted')
                  : t('settings.storagePersistentDenied')
              }}
            </div>
            <QBtn
              v-if="storage && !storage.persisted"
              class="settings-request-persistence"
              color="primary"
              :label="t('settings.storageRequest')"
              :loading="isRequestingPersistence"
              @click="requestPersistence"
            />
          </QItemSection>
        </QItem>
        <QItem v-if="storage?.unavailableCount" data-test="settings-reconnect">
          <QItemSection>
            <div>{{ t('settings.reconnectFiles') }}</div>
            <div class="text-caption text-grey-7">
              {{ t('settings.reconnectFilesHint') }}
            </div>
          </QItemSection>
          <QItemSection side>
            <QBtn
              class="settings-reconnect-files"
              color="primary"
              :label="t('settings.reconnectFiles')"
              :loading="isReconnecting"
              @click="reconnectFiles"
            />
          </QItemSection>
        </QItem>
        <QItem
          v-if="storage && storage.byKind.blob > 0"
          data-test="settings-migrate"
        >
          <QItemSection>
            <div>{{ t('settings.migrateFiles') }}</div>
            <div class="text-caption text-grey-7">
              {{ t('settings.migrateFilesHint') }}
            </div>
          </QItemSection>
          <QItemSection side>
            <QBtn
              class="settings-migrate-files"
              color="primary"
              :label="t('settings.migrateFiles')"
              :loading="isMigrating"
              @click="migrateStorage"
            />
          </QItemSection>
        </QItem>
        <QItem data-test="settings-backup-external">
          <QItemSection>
            <div>{{ t('settings.backupExternalFiles') }}</div>
            <div class="text-caption text-grey-7">
              {{ t('settings.backupExternalFilesHint') }}
            </div>
          </QItemSection>
          <QItemSection side>
            <QToggle v-model="configStore.backupIncludeExternalFiles" />
          </QItemSection>
        </QItem>
        <QItem v-if="reconnectStatus" data-test="settings-reconnect-status">
          <QItemSection>
            <div class="text-caption text-positive">{{ reconnectStatus }}</div>
          </QItemSection>
        </QItem>
        <QItem>
          <QItemSection>
            <div>{{ t('settings.clearStorage') }}</div>
            <div class="text-caption text-grey-7">
              {{ t('settings.clearStorageHint') }}
            </div>
          </QItemSection>
          <QItemSection side>
            <QBtn
              class="settings-clear-storage"
              color="negative"
              :label="t('settings.clearStorageButton')"
              :loading="isClearingStorage"
              @click="clearStorage"
            />
          </QItemSection>
        </QItem>
      </QList>
    </section>
  </BaseModal>
</template>

<style scoped>
.help-link {
  color: var(--color-primary);
  text-decoration: underline;
}
</style>
