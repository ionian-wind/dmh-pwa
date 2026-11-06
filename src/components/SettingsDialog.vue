<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import { useConfigStore } from '@/utils/configStore';
import { confirm } from '@/dialogs';
import { clearAllAppData, reloadAppFromMainPage } from '@/utils/appReset';
import { debugError } from '@/utils/debug';

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const { t } = useI18n();
const configStore = useConfigStore();
const isClearingStorage = ref(false);

function close() {
  emit('update:modelValue', false);
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
