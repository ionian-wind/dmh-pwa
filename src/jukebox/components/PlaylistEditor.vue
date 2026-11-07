<script setup lang="ts">
import { ref, watch, type Ref } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useJukeboxPlaylistsStore } from '../stores';
import type { JukeboxPlaylist } from '../types';
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
  </BaseModal>
</template>
