<template>
  <div class="q-pa-md ambient-scene-page">
    <div
      v-if="store.loading || !packsReady"
      class="q-pa-xl flex flex-center column text-grey-7"
    >
      <QSpinnerDots size="40px" color="primary" />
      <div class="q-mt-md">{{ t('ambientSoundPage.loading') }}</div>
    </div>

    <ScenePlayerView
      v-else-if="sceneEntry"
      :pack-id="sceneEntry.pack.id"
      :scene-id="sceneEntry.scene.id"
      @back="goBack"
    />

    <EmptyState
      v-else
      :icon="IconMusic"
      :title="t('ambientSoundPage.noScenes')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { IconMusic } from '@tabler/icons-vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { useLayout } from '@/composables/useLayout';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import ScenePlayerView from '@/ambient-sound/components/ScenePlayerView.vue';

const { t } = useI18n();
const store = useAmbientSoundStore();
const layout = useLayout();
const route = useRoute();
const router = useRouter();

const packsReady = ref(false);

const sceneEntry = computed(() => {
  const sceneId =
    typeof route.params.sceneId === 'string' ? route.params.sceneId : '';
  if (!sceneId) return null;
  return store.allScenes.find(({ scene }) => scene.id === sceneId) ?? null;
});

const headerTitle = computed(
  () => sceneEntry.value?.scene.name ?? t('ambientSoundPage.title'),
);

function syncHeader() {
  layout.setTopMenuContent({
    component: ViewHeader,
    props: { title: headerTitle.value },
  });
}

watch(headerTitle, syncHeader, { immediate: true });

watch(
  [sceneEntry, packsReady],
  () => {
    if (
      packsReady.value &&
      typeof route.params.sceneId === 'string' &&
      !sceneEntry.value
    ) {
      void router.replace({ name: 'ambient-sound' });
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await store.loadStoredPacks();
  packsReady.value = true;
  syncHeader();
});

onUnmounted(() => {
  layout.setTopMenuContent(null);
});

function goBack() {
  void router.push({ name: 'ambient-sound' });
}
</script>

<style scoped>
.ambient-scene-page {
  max-width: 1100px;
  margin: 0 auto;
}
</style>
