<script setup lang="ts">
import { ref, watch, type Ref, computed, onMounted } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import ModuleMultipleSelector from '@/components/ModuleMultipleSelector.vue';
import { useJukeboxPlaylistsStore } from '../stores';
import { useModuleStore } from '@/stores/modules';
import type { JukeboxPlaylist } from '../types';
import type { UUID } from '@/types';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  modelValue: boolean;
  playlist: JukeboxPlaylist | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const playlistsStore = useJukeboxPlaylistsStore();
const moduleStore = useModuleStore();
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

const moduleIdsProxy = computed<UUID[]>({
  get() {
    return editedPlaylist.value.moduleIds ?? [];
  },
  set(val: UUID[]) {
    editedPlaylist.value.moduleIds = val;
  },
});

onMounted(() => moduleStore.load());

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
    const newPlaylist = await playlistsStore.create(editedPlaylist.value);
    emit('saved', newPlaylist);
  }
  emit('update:modelValue', false);
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
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    @submit="save"
    @cancel="$emit('update:modelValue', false)"
  >
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
        <div class="form-group">
          <ModuleMultipleSelector
            id="playlist-modules"
            v-model="moduleIdsProxy"
            :placeholder="t('playlist.fields.modules')"
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
  </BaseModal>
</template>
