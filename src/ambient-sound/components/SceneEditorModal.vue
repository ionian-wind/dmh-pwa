<template>
  <BaseModal
    :is-open="isOpen"
    modal-id="ambient-scene-editor"
    :title="
      isNew ? t('ambientSoundPage.newScene') : t('ambientSoundPage.editScene')
    "
    :show-submit="!isReadOnly"
    :show-cancel="true"
    :submit-label="t('common.save')"
    :cancel-label="t('common.cancel')"
    :tabs="tabs"
    @submit="save"
    @cancel="emit('close')"
    @update:is-open="(value: boolean) => !value && emit('close')"
  >
    <template #main>
      <QBanner
        v-if="isReadOnly"
        class="q-mb-md bg-grey-2 text-grey-9"
        inline-actions
      >
        <template #avatar>
          <IconPackageImport :size="20" />
        </template>
        {{ t('ambientSoundPage.importedReadOnlyHint') }}
      </QBanner>
      <div class="column q-gutter-md">
        <QInput
          v-model="draft.name"
          outlined
          dense
          :label="t('ambientSoundPage.name')"
        />
        <QInput
          v-model="draft.description"
          outlined
          dense
          type="textarea"
          rows="3"
          :label="t('ambientSoundPage.description')"
        />
        <div class="row items-center q-gutter-md">
          <IconPicker
            v-model="draft.icon"
            :icons="MAP_MARKER_ICONS"
            collection="ra"
            :search-placeholder="t('ambientSoundPage.searchIcons')"
            :no-icon-label="t('ambientSoundPage.noIcon')"
          />
          <div class="col">
            <div class="text-caption text-grey-7 q-mb-xs">
              {{ t('ambientSoundPage.intensity') }}: {{ draft.intensity }}%
            </div>
            <QSlider
              v-model="draft.intensity"
              :min="0"
              :max="100"
              color="primary"
            />
          </div>
        </div>
        <div class="text-caption text-grey-7">
          {{ t('ambientSoundPage.package') }}: {{ pack?.name }}
        </div>
      </div>
    </template>

    <template #ambiences>
      <div class="row items-center q-gutter-sm q-mb-md">
        <QSelect
          v-model="ambienceToAdd"
          :options="availableAmbiences"
          outlined
          dense
          emit-value
          map-options
          :label="t('ambientSoundPage.addAmbience')"
          class="col"
        />
        <QBtn
          color="primary"
          :disable="!ambienceToAdd"
          :label="t('common.add')"
          @click="addAmbience"
        />
      </div>

      <div v-if="draft.ambiences.length" class="column q-gutter-sm">
        <QCard
          v-for="row in draft.ambiences"
          :key="row.ambienceId"
          flat
          bordered
        >
          <QCardSection class="row items-center q-gutter-sm">
            <AmbientIcon :icon="ambienceFor(row.ambienceId)?.icon" :size="22" />
            <div class="col">
              <div class="text-subtitle2">
                {{ ambienceFor(row.ambienceId)?.name || row.ambienceId }}
              </div>
              <div class="text-caption text-grey-7">
                {{ ambienceFor(row.ambienceId)?.category || '' }}
              </div>
            </div>
            <QSelect
              :model-value="row.variationId"
              :options="variationOptions(row.ambienceId)"
              dense
              outlined
              emit-value
              map-options
              class="variation-select"
              @update:model-value="
                (value: string | null) => value && (row.variationId = value)
              "
            />
            <div class="volume-control">
              <QSlider
                :model-value="row.volume"
                :min="0"
                :max="100"
                dense
                color="primary"
                @update:model-value="
                  (value: number | null) =>
                    value !== null && (row.volume = value)
                "
              />
            </div>
            <QBtn
              flat
              dense
              round
              color="negative"
              :title="t('common.remove')"
              :aria-label="t('common.remove')"
              @click="removeAmbience(row.ambienceId)"
            >
              <IconTrash :size="16" />
            </QBtn>
          </QCardSection>
        </QCard>
      </div>
      <EmptyState
        v-else
        :icon="IconWaveSine"
        :title="t('ambientSoundPage.noAmbiencesInScene')"
      />
    </template>

    <template #oneShots>
      <div class="row items-center q-gutter-sm q-mb-md">
        <QSelect
          v-model="oneShotToAdd"
          :options="availableOneShots"
          outlined
          dense
          emit-value
          map-options
          :label="t('ambientSoundPage.addOneShot')"
          class="col"
        />
        <QBtn
          color="primary"
          :disable="!oneShotToAdd"
          :label="t('common.add')"
          @click="addOneShot"
        />
      </div>

      <div v-if="draft.oneShotIds.length" class="column q-gutter-sm">
        <QCard v-for="id in draft.oneShotIds" :key="id" flat bordered>
          <QCardSection class="row items-center q-gutter-sm">
            <AmbientIcon :icon="oneShotFor(id)?.icon" :size="22" />
            <div class="col">
              <div class="text-subtitle2">
                {{ oneShotFor(id)?.name || id }}
              </div>
              <div class="text-caption text-grey-7">
                {{ oneShotFor(id)?.category || '' }}
              </div>
            </div>
            <QBtn
              flat
              round
              :title="t('ambientSoundPage.preview')"
              :aria-label="t('ambientSoundPage.preview')"
              @click="pack && store.playOneShot(pack.id, id)"
            >
              <IconPlayerPlay :size="18" />
            </QBtn>
            <QBtn
              flat
              dense
              round
              color="negative"
              :title="t('common.remove')"
              :aria-label="t('common.remove')"
              @click="removeOneShot(id)"
            >
              <IconTrash :size="16" />
            </QBtn>
          </QCardSection>
        </QCard>
      </div>
      <EmptyState
        v-else
        :icon="IconBell"
        :title="t('ambientSoundPage.noOneShotsInScene')"
      />
    </template>

    <template #music>
      <div class="column q-gutter-sm">
        <QCard v-for="file in draft.music.files" :key="file" flat bordered>
          <QCardSection class="row items-center q-gutter-sm">
            <IconMusic :size="20" />
            <span class="col ellipsis">{{ musicName(file) }}</span>
            <QBtn
              flat
              dense
              round
              color="negative"
              :title="t('common.remove')"
              :aria-label="t('common.remove')"
              @click="removeMusic(file)"
            >
              <IconTrash :size="16" />
            </QBtn>
          </QCardSection>
        </QCard>
        <div class="row items-center q-gutter-sm">
          <QBtn
            flat
            color="primary"
            :label="t('ambientSoundPage.addMusic')"
            @click="addMusicFiles"
          />
          <span class="col">{{ t('ambientSoundPage.loopMusic') }}</span>
          <QToggle v-model="draft.music.loop" />
        </div>
        <div class="text-caption text-grey-7">
          {{ t('ambientSoundPage.sceneMusicHint') }}
        </div>
      </div>
      <EmptyState
        v-if="draft.music.files.length === 0"
        :icon="IconMusic"
        :title="t('ambientSoundPage.noSceneMusic')"
        :hint="t('ambientSoundPage.sceneMusicHint')"
      />
    </template>

    <template #links>
      <div class="row justify-end q-mb-sm">
        <QBtn
          v-if="props.sceneId"
          flat
          color="primary"
          :label="t('ambientSoundPage.addSceneLink')"
          @click="linkPickerOpen = true"
        />
      </div>
      <div v-if="links.length" class="column q-gutter-sm">
        <QCard v-for="link in links" :key="link.id" flat bordered>
          <QCardSection class="row items-center q-gutter-sm">
            <QBadge color="primary" :label="link.entityType" />
            <span class="col ellipsis">{{ link.entityId }}</span>
            <QBtn
              flat
              dense
              round
              color="negative"
              :title="t('common.remove')"
              :aria-label="t('common.remove')"
              @click="store.removeSceneLink(link.id)"
            >
              <IconTrash :size="16" />
            </QBtn>
          </QCardSection>
        </QCard>
      </div>
      <EmptyState
        v-else
        :icon="IconLink"
        :title="t('ambientSoundPage.noSceneLinks')"
        :hint="t('ambientSoundPage.sceneLinksHint')"
      />
    </template>
    <SceneLinkPicker
      v-if="props.sceneId"
      :is-open="linkPickerOpen"
      :package-id="props.packId"
      :scene-id="props.sceneId"
      @close="linkPickerOpen = false"
    />
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconBell,
  IconLink,
  IconMusic,
  IconPackageImport,
  IconPlayerPlay,
  IconTrash,
  IconWaveSine,
} from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import IconPicker from '@/components/common/IconPicker.vue';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import SceneLinkPicker from '@/ambient-sound/components/SceneLinkPicker.vue';
import { MAP_MARKER_ICONS } from '@/maps/icons';
import { fileHandler } from '@/utils/files';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import {
  getLayerVariations,
  getSceneMusicName,
} from '@/ambient-sound/utils/packData';
import type { LayerDef, OneShotDef, SceneDef } from '@/ambient-sound/types';

const props = defineProps<{
  isOpen: boolean;
  packId: string;
  sceneId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', sceneId: string): void;
}>();

const { t } = useI18n();
const store = useAmbientSoundStore();
const ambienceToAdd = ref('');
const oneShotToAdd = ref('');
const pendingMusic = ref<
  Array<{ file: string; blob?: Blob; handle?: FileSystemFileHandle }>
>([]);
const linkPickerOpen = ref(false);

const pack = computed(
  () => store.storedPacks.find((entry) => entry.id === props.packId) ?? null,
);
const isNew = computed(() => !props.sceneId);
const isReadOnly = computed(() => pack.value?.origin === 'imported');

function makeScene(): SceneDef {
  const existing = props.sceneId
    ? pack.value?.scenes.find((scene) => scene.id === props.sceneId)
    : null;
  if (existing) return JSON.parse(JSON.stringify(existing)) as SceneDef;

  return {
    id: `scene_${Date.now()}`,
    name: '',
    description: '',
    icon: 'ra-horn-call',
    intensity: pack.value?.defaultIntensity ?? 50,
    ambiences: [],
    oneShotIds: [],
    music: { files: [], loop: true },
  };
}

const draft = ref<SceneDef>(makeScene());

watch(
  () => [props.isOpen, props.packId, props.sceneId],
  () => {
    if (props.isOpen) {
      draft.value = makeScene();
      pendingMusic.value = [];
    }
  },
  { immediate: true },
);

const tabs = computed(() => [
  { name: 'main', label: t('ambientSoundPage.sceneMain') },
  { name: 'ambiences', label: t('ambientSoundPage.ambiences') },
  { name: 'oneShots', label: t('ambientSoundPage.oneShots') },
  { name: 'music', label: t('ambientSoundPage.music') },
  { name: 'links', label: t('ambientSoundPage.links') },
]);

const availableAmbiences = computed(() => {
  const selected = new Set(draft.value.ambiences.map((row) => row.ambienceId));
  return (pack.value?.ambiences ?? [])
    .filter((ambience) => !selected.has(ambience.id))
    .map((ambience) => ({ label: ambience.name, value: ambience.id }));
});

const availableOneShots = computed(() => {
  const selected = new Set(draft.value.oneShotIds);
  return (pack.value?.oneShots ?? [])
    .filter((oneShot) => !selected.has(oneShot.id))
    .map((oneShot) => ({ label: oneShot.name, value: oneShot.id }));
});

const links = computed(() =>
  props.sceneId ? store.linksForScene(props.packId, props.sceneId) : [],
);

function ambienceFor(id: string): LayerDef | undefined {
  return pack.value?.ambiences.find((entry) => entry.id === id);
}

function oneShotFor(id: string): OneShotDef | undefined {
  return pack.value?.oneShots.find((entry) => entry.id === id);
}

function variationOptions(ambienceId: string) {
  const ambience = ambienceFor(ambienceId);
  return ambience
    ? getLayerVariations(ambience).map((variation) => ({
        label: variation.name,
        value: variation.id,
      }))
    : [];
}

function addAmbience() {
  const ambience = ambienceFor(ambienceToAdd.value);
  if (!ambience) return;
  const variation = getLayerVariations(ambience)[0];
  draft.value.ambiences.push({
    ambienceId: ambience.id,
    variationId: variation?.id ?? '',
    volume: ambience.defaultVolume ?? 50,
  });
  ambienceToAdd.value = '';
}

function removeAmbience(ambienceId: string) {
  draft.value.ambiences = draft.value.ambiences.filter(
    (row) => row.ambienceId !== ambienceId,
  );
}

function addOneShot() {
  if (!oneShotToAdd.value) return;
  draft.value.oneShotIds.push(oneShotToAdd.value);
  oneShotToAdd.value = '';
}

function removeOneShot(id: string) {
  draft.value.oneShotIds = draft.value.oneShotIds.filter(
    (entry) => entry !== id,
  );
}

function musicName(file: string) {
  return getSceneMusicName(file);
}

function removeMusic(file: string) {
  draft.value.music.files = draft.value.music.files.filter(
    (entry) => entry !== file,
  );
  pendingMusic.value = pendingMusic.value.filter(
    (entry) => `scenes/${draft.value.id}/music/${entry.file}` !== file,
  );
}

async function addMusicFiles() {
  if (!fileHandler.isSupported()) return;
  const files = await fileHandler.pickAudioFiles();
  for (const { file, source } of files) {
    const path = `scenes/${draft.value.id}/music/${file.name}`;
    if (!draft.value.music.files.includes(path)) {
      draft.value.music.files.push(path);
    }
    pendingMusic.value.push({
      file: file.name,
      blob: source.kind === 'blob' ? source.blob : undefined,
      handle: source.kind === 'handle' ? source.handle : undefined,
    });
  }
}

async function save() {
  if (isReadOnly.value || !draft.value.name.trim() || !pack.value) return;
  const scene = { ...draft.value, name: draft.value.name.trim() };
  const audioFiles = new Map<string, Blob>();
  for (const entry of pendingMusic.value) {
    const path = `scenes/${scene.id}/music/${entry.file}`;
    if (entry.blob) {
      audioFiles.set(path, entry.blob);
    } else if (entry.handle) {
      audioFiles.set(path, await entry.handle.getFile());
    }
  }
  await store.saveScene(pack.value.id, scene, audioFiles);
  emit('saved', scene.id);
  emit('close');
}
</script>

<style scoped>
.variation-select {
  min-width: 130px;
}

.volume-control {
  width: 130px;
}
</style>
