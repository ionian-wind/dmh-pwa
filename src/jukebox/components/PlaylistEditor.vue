<script setup lang="ts">
import { ref, watch, type Ref, computed } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useJukeboxPlaylistsStore } from '../stores';
import type { JukeboxPlaylist } from '../types';
import type { UUID } from '@/types';
import { useI18n } from 'vue-i18n';
import EntitiesLinking from '@/maps/components/EntitiesLinking.vue';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import type { MapEntityRef } from '@/maps/types';

const props = defineProps<{
  modelValue: boolean;
  playlist: JukeboxPlaylist | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved', 'delete']);

const playlistsStore = useJukeboxPlaylistsStore();
const { t } = useI18n();

type EditablePlaylist = {
  name: string;
  description?: string;
  trackIds: UUID[];
  moduleIds?: string[];
};

const editedPlaylist: Ref<EditablePlaylist> = ref({
  name: '',
  description: '',
  trackIds: [],
  moduleIds: [],
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
        moduleIds: [],
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
        moduleIds: [],
      };
    }
  },
);

const editorTabs = useEntityEditorTabs();

const linkedModules = computed<MapEntityRef[]>(() =>
  (editedPlaylist.value.moduleIds ?? []).map((id) => ({ kind: 'module', id })),
);

function setLinkedModules(links: MapEntityRef[]) {
  editedPlaylist.value.moduleIds = links.map((link) => link.id);
}

async function save() {
  if (props.playlist && props.playlist.id) {
    const updatedPlaylist = await playlistsStore.update(props.playlist.id, {
      name: editedPlaylist.value.name,
      description: editedPlaylist.value.description,
      trackIds: editedPlaylist.value.trackIds,
      moduleIds: editedPlaylist.value.moduleIds,
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
      <EntitiesLinking
        kind="module"
        :model-value="linkedModules"
        @update:model-value="setLinkedModules"
      />
    </template>
  </BaseModal>
</template>
