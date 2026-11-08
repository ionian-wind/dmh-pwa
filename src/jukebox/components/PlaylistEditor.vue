<script setup lang="ts">
import { ref, watch, computed, onMounted, type Ref } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import { useEntityLinkRelations } from '@/components/common/entityDragLinking/relations';
import { useFeatureStores } from '@/composables/useFeatureStores';
import { useJukeboxPlaylistsStore } from '../stores';
import type { JukeboxPlaylist } from '../types';
import type { MapEntityRef } from '@/maps/types';
import type { UUID } from '@/types';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  modelValue: boolean;
  useModalStack?: boolean;
  playlist: JukeboxPlaylist | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved', 'delete']);

const playlistsStore = useJukeboxPlaylistsStore();
const { t } = useI18n();
const editorTabs = useEntityEditorTabs();
const relations = useEntityLinkRelations();
const featureStores = useFeatureStores();
const linkKinds = ['location', 'pawn', 'encounter', 'party'] as const;

type PlaylistLinkKind = (typeof linkKinds)[number];

const playlistLinks = computed<MapEntityRef[]>(() => {
  const id = props.playlist?.id;
  if (!id) return [];
  return linkKinds.flatMap((kind) =>
    relations
      .getLinkedIds('playlist', id, kind)
      .map((linkId) => ({ kind, id: linkId })),
  );
});

async function setPlaylistLinks(kind: PlaylistLinkKind, links: MapEntityRef[]) {
  const id = props.playlist?.id;
  if (!id) return;
  await relations.setLinkedIds(
    'playlist',
    id,
    kind,
    links.filter((link) => link.kind === kind).map((link) => link.id),
  );
}

onMounted(async () => {
  await featureStores.load([...linkKinds]);
});

type EditablePlaylist = {
  name: string;
  description?: string;
  trackIds: UUID[];
};

const editedPlaylist: Ref<EditablePlaylist> = ref({
  name: '',
  description: '',
  trackIds: [],
});

watch(
  () => props.playlist,
  (newPlaylist) => {
    if (newPlaylist) {
      editedPlaylist.value = { ...newPlaylist };
    } else {
      editedPlaylist.value = {
        name: '',
        description: '',
        trackIds: [],
      };
    }
  },
  { immediate: true },
);

// Reset form when modal opens for new playlist
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen && !props.playlist) {
      editedPlaylist.value = {
        name: '',
        description: '',
        trackIds: [],
      };
    }
  },
);

async function save() {
  if (props.playlist && props.playlist.id) {
    const updatedPlaylist = await playlistsStore.update(props.playlist.id, {
      name: editedPlaylist.value.name,
      description: editedPlaylist.value.description,
      trackIds: editedPlaylist.value.trackIds,
    });
    emit('saved', updatedPlaylist);
  } else {
    const sortOrder =
      playlistsStore.items.value.reduce(
        (max, playlist) => Math.max(max, playlist.sortOrder ?? 0),
        0,
      ) + 1;
    const newPlaylist = await playlistsStore.create({
      ...editedPlaylist.value,
      sortOrder,
    });
    emit('saved', newPlaylist);
  }
  emit('update:modelValue', false);
}

function handleDelete() {
  if (props.playlist) emit('delete', props.playlist.id);
}
</script>

<template>
  <BaseModal
    :use-modal-stack="useModalStack"
    :isOpen="modelValue"
    modalId="playlist-editor"
    @update:isOpen="$emit('update:modelValue', $event)"
    :title="t('playlist.title')"
    :showSubmit="true"
    :showCancel="true"
    :showDelete="!!playlist"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    :tabs="editorTabs"
    @submit="save"
    @delete="handleDelete"
    @cancel="$emit('update:modelValue', false)"
  >
    <template #main>
      <div class="form-section">
        <div class="form-grid">
          <div class="form-group">
            <QInput
              id="playlist-name"
              v-model="editedPlaylist.name"
              :label="t('playlist.fields.name')"
              type="text"
              required
              outlined
            />
          </div>
        </div>
      </div>
      <div class="form-section">
        <div class="form-grid">
          <div class="form-group">
            <QInput
              id="playlist-description"
              :label="t('playlist.fields.description')"
              v-model="editedPlaylist.description"
              type="textarea"
              :rows="5"
              autogrow
              outlined
            />
          </div>
        </div>
      </div>
    </template>

    <template #links>
      <div class="column q-gutter-md">
        <EntitiesLinking
          v-for="kind in linkKinds"
          :key="kind"
          v-show="featureStores.has(kind)"
          :kind="kind"
          :model-value="playlistLinks"
          @update:model-value="(links) => setPlaylistLinks(kind, links)"
        />
      </div>
    </template>
  </BaseModal>
</template>
